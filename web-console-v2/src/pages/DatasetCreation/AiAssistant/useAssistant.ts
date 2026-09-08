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
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAllFields } from 'services/dataset';
import { listConnectors, readConnector } from 'services/datasetApi';
import { DatasetStatus } from 'types/datasets';
import { Action, WizardStep } from './engine/actions';
import {
  UiSpec,
  fillableProps,
  summariseProp,
  validateProp,
} from './engine/connectors';
import {
  ExecutorContext,
  executeAction,
  submitConnector,
} from './engine/executor';
import {
  FieldVocabulary,
  buildFieldVocabulary,
} from './engine/fieldVocabulary';
import { runTurn } from './engine/turn';
import {
  LoadProgress,
  ModelEngine,
  isModelCached,
  loadEngine,
  removeModel,
} from './model/engineClient';
import { resolveWithModel } from './model/modelResolver';
import { Capability, detectCapability } from './model/tiers';
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
  /** Hands connector credentials straight to the API; never an action. */
  submitSecrets: (secrets: Record<string, unknown>) => Promise<void>;
  /** The chosen connector's schema, read live rather than carried by a card. */
  connectorUiSpec?: UiSpec;
  /** What this browser could do, detected without downloading anything. */
  modelCapability?: Capability;
  modelProgress?: LoadProgress;
  modelReady: boolean;
  modelCached: boolean;
  modelError?: string;
  /** Downloads and starts the model. Only ever from an explicit control. */
  enableModel: () => Promise<void>;
  /** Unloads it and frees the cached weights. */
  disableModel: () => Promise<void>;
  /**
   * Required connector properties still unanswered, described for asking.
   * Postgres marks nine of ten required, so this list matters.
   */
  connectorNeedsValues: string[];
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
   * Connectors available, and the chosen one's `ui_spec`.
   *
   * The spec is fetched rather than remembered: it is the connector's public
   * schema and can change with the connector's version, so reading it is
   * cheaper than risking a stale copy.
   */
  const [connectors, setConnectors] = useState<{ id: string; name?: string }[]>(
    [],
  );
  const [uiSpec, setUiSpec] = useState<UiSpec | undefined>();
  const [connectorsUnavailable, setConnectorsUnavailable] = useState(false);

  const [capability, setCapability] = useState<Capability>();
  const [modelCached, setModelCached] = useState(false);
  const [modelProgress, setModelProgress] = useState<LoadProgress>();
  const [modelError, setModelError] = useState<string>();
  // The engine lives in a ref: it is a large object with a GPU context, and
  // re-rendering must not recreate or drop it.
  const engine = useRef<ModelEngine | undefined>(undefined);
  const [modelReady, setModelReady] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    // Both of these are cheap and download nothing: they only report what
    // this browser could do and whether the weights are already here.
    Promise.all([detectCapability(), isModelCached()])
      .then(([detected, cached]) => {
        if (cancelled) return;
        setCapability(detected);
        setModelCached(cached);
      })
      .catch(() => {
        if (cancelled) return;
        setCapability({ tier: 0, hasWebGPU: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    listConnectors<{ data?: { id: string; name?: string }[] }>({})
      .then((result) => {
        if (cancelled) return;
        setConnectors(result?.data ?? []);
        setConnectorsUnavailable(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Recorded so the resolver can say *why* it cannot set up a
        // connector, rather than reporting that it did not understand.
        setConnectorsUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Reads the chosen connector's schema whenever the choice changes. */
  const chosenConnectorId = session.session?.connector?.id;

  useEffect(() => {
    let cancelled = false;

    if (!chosenConnectorId) {
      setUiSpec(undefined);
      return undefined;
    }

    readConnector<{ ui_spec?: UiSpec; connector_meta?: { ui_spec?: UiSpec } }>(
      chosenConnectorId,
    )
      .then((result) => {
        if (cancelled) return;
        setUiSpec(result?.ui_spec ?? result?.connector_meta?.ui_spec);
      })
      .catch(() => setUiSpec(undefined));

    return () => {
      cancelled = true;
    };
  }, [chosenConnectorId]);

  /**
   * Built when a turn runs, not memoised.
   *
   * The sample lives in a ref, and mutating a ref does not recompute a memo —
   * so a memoised context captured `sample.current` as it was on the previous
   * render and the executor never saw the file, failing with MISSING_SAMPLE.
   */
  const contextNow = useCallback(
    (): ExecutorContext => ({
      datasetId,
      // Carried by the session, because the server cannot hold a name or type
      // until `datasets/create` has run.
      pending: session.session?.pending,
      sample: sample.current,
      connector: session.session?.connector
        ? { ...session.session.connector, uiSpec }
        : undefined,
    }),
    [datasetId, session.session, uiSpec],
  );

  const run = useCallback(
    async (input: string | Action) => {
      if (busy) return;
      setBusy(true);

      try {
        const step = (session.session?.step ?? 'ingestion') as WizardStep;
        const loaded = engine.current;

        const result = await runTurn(input, {
          vocabulary,
          connectors,
          connectorsUnavailable,
          connectorProperties: fillableProps(uiSpec).map((prop) => prop.key),
          // The model replaces one step of the pipeline — resolution — and
          // returns the same shape the rules do, falling back to them on any
          // doubt. Everything downstream is unchanged.
          ...(loaded && modelReady
            ? {
                resolve: (utterance: string) =>
                  resolveWithModel(
                    {
                      utterance,
                      step,
                      vocabulary,
                      history: session.messages,
                      connectors,
                      connectorProperties: fillableProps(uiSpec).map(
                        (prop) => prop.key,
                      ),
                    },
                    { engine: loaded },
                  ),
              }
            : {}),
          execute: (action) => executeAction(action, contextNow()),
          // The rows the user supplied, for local checks only. They are never
          // sent from here — the sample reaches the server as a file upload.
          sampleRows: (session.session?.sampleRows ?? []) as Record<
            string,
            unknown
          >[],
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

          // Connector choices and values are buffered in the session; the
          // executor validated them and wrote nothing, because a connector is
          // written once, together with its credentials.
          if (result.outcome.ok) {
            const chosen = result.action;

            if (chosen.kind === 'select_connector') {
              const known = connectors.find(
                (candidate) => candidate.id === chosen.connectorId,
              );
              await session.selectConnector({
                id: chosen.connectorId,
                ...(known?.name ? { name: known.name } : {}),
              });
            }

            if (chosen.kind === 'set_connector_field') {
              // The *coerced* value, not the raw one the action carried.
              // Postgres declares `source_database_port` as a number, and
              // storing the typed string sent `"5432"` to the connector —
              // seen live in `connector_config`.
              const prop = fillableProps(uiSpec).find(
                (candidate) => candidate.key === chosen.property,
              );
              const checked = prop
                ? validateProp(prop, chosen.value)
                : undefined;

              await session.setConnectorValue(
                chosen.property,
                checked?.ok ? checked.value : chosen.value,
              );
            }

            // Nothing else produces this card, so without it the credential
            // form is unreachable and no connector can ever be saved — the
            // same gap the file-drop card had.
            if (chosen.kind === 'request_connector_secrets') {
              const draft = session.session?.connector;

              if (draft && uiSpec) {
                await session.append({
                  role: 'assistant',
                  text: 'These go straight to the server.',
                  section: 'connector',
                  card: {
                    kind: 'secret_form',
                    connectorId: draft.id,
                    ...(draft.name ? { connectorName: draft.name } : {}),
                  },
                });
              } else {
                await session.append({
                  role: 'assistant',
                  text: 'Choose a connector first, then I can ask for its credentials.',
                  failureCode: 'NO_CONNECTOR',
                  section: 'connector',
                });
              }
            }
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
    [
      busy,
      connectors,
      connectorsUnavailable,
      contextNow,
      modelReady,
      recordAction,
      refreshVocabulary,
      session,
      uiSpec,
      vocabulary,
    ],
  );

  /**
   * Sends the connector and its credentials.
   *
   * Not routed through `run`, because a turn dispatches an `Action` and an
   * action is recorded in the transcript. The credentials are handed to
   * `submitConnector`, which merges them into the payload and returns nothing
   * containing them; only the fact of configuration is recorded here.
   */
  const submitSecrets = useCallback(
    async (secrets: Record<string, unknown>) => {
      const draft = session.session?.connector;
      if (!datasetId || !draft) return;

      setBusy(true);

      try {
        const outcome = await submitConnector(
          datasetId,
          { ...draft, uiSpec },
          secrets,
        );

        if (outcome.ok) {
          await session.markConnectorConfigured();
          await session.append({
            role: 'assistant',
            text: `Saved the ${
              draft.name ?? draft.id
            } connector. The credentials went straight to the server and are not stored here.`,
            section: 'connector',
          });
        } else {
          await session.append({
            role: 'assistant',
            text: outcome.error,
            failureCode: outcome.code,
            section: 'connector',
          });
        }
      } finally {
        setBusy(false);
      }
    },
    [datasetId, session, uiSpec],
  );

  /**
   * Downloads and starts the model.
   *
   * Only ever called from an explicit control, because it costs the user
   * bandwidth and disk. A failure is reported and the assistant carries on
   * with the rules.
   */
  const enableModel = useCallback(async () => {
    setModelError(undefined);
    setModelProgress({ progress: 0, text: 'Preparing…' });

    try {
      engine.current = await loadEngine({
        onProgress: (progress) => setModelProgress(progress),
      });
      setModelReady(true);
      setModelCached(true);
    } catch (cause) {
      setModelError(
        cause instanceof Error
          ? cause.message
          : 'The model could not be loaded.',
      );
    } finally {
      setModelProgress(undefined);
    }
  }, []);

  const disableModel = useCallback(async () => {
    await engine.current?.unload().catch(() => undefined);
    engine.current = undefined;
    setModelReady(false);

    // Frees the space rather than leaving ~450 MB behind after the user has
    // said they do not want it.
    await removeModel().catch(() => undefined);
    setModelCached(false);
  }, []);

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
    submitSecrets,
    connectorUiSpec: uiSpec,
    modelCapability: capability,
    modelProgress,
    modelReady,
    modelCached,
    modelError,
    enableModel,
    disableModel,
    connectorNeedsValues: fillableProps(uiSpec)
      .filter(
        (prop) =>
          prop.required &&
          session.session?.connector?.values[prop.key] === undefined,
      )
      .map(summariseProp),
    clearSession: session.clearSession,
  };
};
