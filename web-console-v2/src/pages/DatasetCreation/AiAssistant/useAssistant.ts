/**
 * Binds the pieces into a working assistant.
 *
 * Session, vocabulary, turn loop and preview focus meet here and nowhere else,
 * which keeps each of them testable on its own. The order of a turn matters
 * and is deliberate:
 *
 * 1. append what the user said, so it is on screen before any request
 * 2. run the action through the executor
 * 3. append the answer, then re-read the vocabulary if the schema moved
 * 4. tell the preview which section changed
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAllFields } from 'services/dataset';
import { DatasetStatus } from 'types/datasets';
import { Action } from './engine/actions';
import { ExecutorContext, executeAction } from './engine/executor';
import {
  FieldVocabulary,
  buildFieldVocabulary,
} from './engine/fieldVocabulary';
import { runTurn } from './engine/turn';
import { useSession } from './session/useSession';
import { usePreviewFocus } from './usePreviewFocus';

/** Offered as chips before the user knows what they can say. */
const OPENING_SUGGESTIONS = ['call it My Orders', "it's event data"];

const SCHEMA_SUGGESTIONS = [
  'make order_id required',
  'dedup on order_id',
  'enable the real-time store',
  'save it',
];

export interface AssistantApi {
  datasetId: string | null;
  messages: ReturnType<typeof useSession>['messages'];
  loading: boolean;
  persisting: boolean;
  resumable: ReturnType<typeof useSession>['resumable'];
  currentSessionId?: string;
  busy: boolean;
  suggestions: string[];
  focusSection: ReturnType<typeof usePreviewFocus>['focusSection'];
  changedRefs: ReturnType<typeof usePreviewFocus>['changedRefs'];
  send: (text: string) => Promise<void>;
  dispatch: (action: Action) => Promise<void>;
  attachSample: (rows: Record<string, unknown>[], file: File) => Promise<void>;
  clearSession: (sessionId: string) => Promise<void>;
}

export const useAssistant = (routeDatasetId: string | null): AssistantApi => {
  const session = useSession({ datasetId: routeDatasetId });
  const { focusSection, changedRefs, recordAction } = usePreviewFocus();

  const [busy, setBusy] = useState(false);
  const [vocabulary, setVocabulary] = useState<FieldVocabulary>(() =>
    buildFieldVocabulary([]),
  );

  const datasetId = session.session?.datasetId ?? routeDatasetId;

  /** The sample the user supplied, held for the create call. */
  const sample = useRef<{ file: File; rows: unknown[] } | undefined>(undefined);

  /**
   * The vocabulary is read from the server, never inferred locally, so the
   * fields the resolver will accept are exactly the fields the API knows.
   */
  const refreshVocabulary = useCallback(async () => {
    if (!datasetId) return;

    try {
      const response = await getAllFields(datasetId, DatasetStatus.Draft);
      setVocabulary(buildFieldVocabulary(response?.data?.[0] ?? []));
    } catch {
      // A vocabulary we could not read leaves the resolver declining fields,
      // which is the safe direction.
    }
  }, [datasetId]);

  useEffect(() => {
    refreshVocabulary();
  }, [refreshVocabulary]);

  const context = useMemo<ExecutorContext>(
    () => ({
      datasetId,
      // Carried by the session, because the server cannot hold a name or type
      // until `datasets/create` has run.
      pending: session.session?.pending,
      sample: sample.current,
    }),
    [datasetId, session.session],
  );

  const run = useCallback(
    async (input: string | Action) => {
      if (busy) return;
      setBusy(true);

      try {
        const result = await runTurn(input, {
          vocabulary,
          execute: (action) => executeAction(action, context),
        });

        for (const message of result.messages) {
          // Sequential rather than parallel: the transcript order is the
          // record of what happened.

          await session.append(message);
        }

        if (result.action && result.outcome) {
          recordAction(result.action, result.outcome);

          // A choice made before the draft exists has to be kept, or the
          // create call would later run without a name.
          if (result.outcome.ok && result.outcome.status === 'pending') {
            await session.setPending(result.outcome.pending);
          }

          const created =
            result.outcome.ok && result.outcome.status === 'applied'
              ? result.outcome.datasetId
              : undefined;

          if (created) await session.attachDataset(created);

          // The schema may have moved, so the vocabulary is re-read rather
          // than patched locally.
          await refreshVocabulary();
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, context, recordAction, refreshVocabulary, session, vocabulary],
  );

  const attachSample = useCallback(
    async (rows: Record<string, unknown>[], file: File) => {
      sample.current = { file, rows };
      await session.setSampleRows(rows);
      await run({ kind: 'attach_sample', fileName: file.name });
    },
    [run, session],
  );

  return {
    datasetId,
    messages: session.messages,
    loading: session.loading,
    persisting: session.persisting,
    resumable: session.resumable,
    currentSessionId: session.session?.sessionId,
    busy,
    suggestions:
      vocabulary.paths.length > 0 ? SCHEMA_SUGGESTIONS : OPENING_SUGGESTIONS,
    focusSection,
    changedRefs,
    send: run,
    dispatch: run,
    attachSample,
    clearSession: session.clearSession,
  };
};
