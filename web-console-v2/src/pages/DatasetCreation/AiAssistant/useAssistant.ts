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
import { downloadJsonFile } from 'utils/downloadUtils';
import {
  listConnectors,
  listDatasets,
  readConnector,
} from 'services/datasetApi';
import { DatasetStatus } from 'types/datasets';
import { Action, WizardStep } from './engine/actions';
import {
  UiSpec,
  fillableProps,
  summariseProp,
  validateProp,
} from './engine/connectors';
import {
  AGENDA_READ_FIELDS,
  ExecutorContext,
  executeAction,
  readSnapshot,
  submitConnector,
} from './engine/executor';
import {
  FieldVocabulary,
  buildFieldVocabulary,
} from './engine/fieldVocabulary';
import { AgendaState, Prompt, askMessage, nextPrompt } from './engine/agenda';
import { awaitingInput, runTurn } from './engine/turn';
import {
  LoadProgress,
  ModelEngine,
  isModelCached,
  loadEngine,
  removeModel,
} from './model/engineClient';
import { DEFAULT_MODEL, MODELS, ModelSpec } from './model/catalog';
import { resolveWithModel } from './model/modelResolver';
import { Capability, detectCapability } from './model/tiers';
import { auditFileName, buildAuditTrail } from './session/auditTrail';
import { useSession } from './session/useSession';
import {
  reportAction,
  reportSessionEnd,
  reportSessionStart,
} from './telemetry';
import { stepAfterAction } from './engine/previewFocus';
import { usePreviewFocus } from './usePreviewFocus';

/** Offered as chips before the user knows what they can say. */
const OPENING_SUGGESTIONS = ['call it My Orders', "it's event data"];

const SCHEMA_SUGGESTIONS = [
  'make order_id required',
  'dedup on order_id',
  'enable the real-time store',
  // Offered as a chip because an undo nobody knows about is not a safety net.
  'undo that',
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
  /** The model in use, and every model this browser could run instead. */
  model: ModelSpec;
  modelChoices: ModelSpec[];
  modelError?: string;
  /** Downloads and starts a model. Only ever from an explicit control. */
  enableModel: (model?: ModelSpec) => Promise<void>;
  /** Unloads it and frees the cached weights. */
  disableModel: () => Promise<void>;
  /**
   * Required connector properties still unanswered, described for asking.
   * Postgres marks nine of ten required, so this list matters.
   */
  connectorNeedsValues: string[];
  clearSession: (sessionId: string) => Promise<void>;
  /** Writes this conversation's action trail to a file. */
  exportTrail: () => void;
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

  /**
   * Live master datasets, for the denormalisation question.
   *
   * `undefined` until listed, and that distinction is load-bearing: the
   * agenda will not raise the question against a list it has not seen, since
   * that would offer an empty choice.
   */
  const [masterDatasets, setMasterDatasets] = useState<
    { dataset_id: string; name?: string }[] | undefined
  >();

  /** The question currently on the table, for the composer's chips. */
  const [prompt, setPrompt] = useState<Prompt | undefined>();
  /**
   * The same question, in a ref.
   *
   * A turn reads it from here rather than from state, because a turn can
   * follow the one before it without a render in between — and a stale
   * question means the answer is read against the *previous* one. Found in
   * the end-to-end test, where "Event" answered the type question and was
   * written as the dataset's name.
   */
  const asked = useRef<Prompt | undefined>(undefined);

  const [capability, setCapability] = useState<Capability>();
  const [modelCached, setModelCached] = useState(false);
  const [modelProgress, setModelProgress] = useState<LoadProgress>();
  const [modelError, setModelError] = useState<string>();
  // The engine lives in a ref: it is a large object with a GPU context, and
  // re-rendering must not recreate or drop it.
  const engine = useRef<ModelEngine | undefined>(undefined);
  const [modelReady, setModelReady] = useState(false);
  /** Which model is in use, which decides the size quoted and what to free. */
  const [model, setModel] = useState<ModelSpec>(DEFAULT_MODEL);

  /**
   * Conversations already reported, so a re-render does not report again.
   * A ref rather than state: reporting is a side effect with no bearing on
   * what is rendered.
   */
  const reportedSessions = useRef(new Set<string>());

  useEffect(() => {
    const current = session.session;
    if (!current || reportedSessions.current.has(current.sessionId)) return;

    reportedSessions.current.add(current.sessionId);
    reportSessionStart(current.sessionId, current.modelTier);
  }, [session.session]);

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

  /**
   * Lists the master datasets once, for the denormalisation question.
   *
   * Live only, and `type: 'master'` only — the same filter the wizard's
   * processing page applies, because those are the only datasets a
   * denormalisation can look values up in. A failure leaves the list
   * `undefined`, which the agenda reads as "not known" and so does not ask,
   * rather than as "there are none".
   */
  useEffect(() => {
    let cancelled = false;

    listDatasets<{
      data?: { dataset_id: string; name?: string; type?: string }[];
    }>({ status: ['Live'] })
      .then((result) => {
        if (cancelled) return;
        setMasterDatasets(
          (result?.data ?? []).filter((entry) => entry.type === 'master'),
        );
      })
      .catch(() => undefined);

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

  /**
   * Works out the question to ask next.
   *
   * Reads the dataset on its own rather than reusing the outcome's snapshot:
   * every action reads with the projection *it* needs, and the agenda needs
   * the whole document. One extra GET per turn buys the guarantee that the
   * question follows what the server actually holds — the same reason nothing
   * else here caches dataset state.
   *
   * A read that fails asks nothing. Guessing the next question from a stale
   * view is how a conversation ends up asking about a field that is no longer
   * there.
   */
  const agendaState = useCallback(
    async (current = session.session): Promise<AgendaState> => {
      const id = current?.datasetId ?? datasetId;
      const dataset = id
        ? await readSnapshot(id, AGENDA_READ_FIELDS).catch(() => undefined)
        : undefined;

      return {
        ...(dataset ? { dataset } : {}),
        ...(current?.pending ? { pending: current.pending } : {}),
        history: current?.messages ?? [],
        sampleRows: (current?.sampleRows ?? []) as Record<string, unknown>[],
        ...(current?.connector
          ? {
              connector: {
                ...current.connector,
                configured: current.connectorConfigured,
              },
            }
          : {}),
        ...(connectorsUnavailable ? {} : { connectorsAvailable: connectors }),
        ...(masterDatasets ? { masterDatasets } : {}),
      };
    },
    [
      connectors,
      connectorsUnavailable,
      datasetId,
      masterDatasets,
      session.session,
    ],
  );

  /**
   * Asks the next question, if there is one.
   *
   * Reads the session back from the store rather than trusting this render's
   * copy: it is called at the end of a turn that has just written to the
   * session, and React state does not update inside the callback that changed
   * it. Without the re-read, a dataset that was just named was asked its name
   * again — seen in the end-to-end test.
   */
  const askNext = useCallback(async (): Promise<Prompt | undefined> => {
    const fresh = await session.reload();
    const next = nextPrompt(await agendaState(fresh));

    asked.current = next;
    setPrompt(next);
    if (next) await session.append(askMessage(next));

    return next;
  }, [agendaState, session]);

  /**
   * Opens with a question rather than a hint.
   *
   * The assistant drives, so an empty conversation is the one place where
   * nothing has happened to trigger the next question — this is that trigger.
   * Guarded on the transcript being empty, so a resumed conversation is not
   * re-opened with a question it already answered.
   */
  const opened = useRef(new Set<string>());

  useEffect(() => {
    const current = session.session;
    if (!current || session.loading || busy) return;
    if (opened.current.has(current.sessionId)) return;

    opened.current.add(current.sessionId);

    if (current.messages.length === 0) {
      void askNext();
      return;
    }

    /**
     * A resumed conversation already has its question in the transcript, so
     * asking again would repeat it — but the question still has to be *known*
     * here, or the first thing typed after a reload is read as a
     * free-standing request instead of the answer it is.
     */
    void (async () => {
      const resumed = nextPrompt(await agendaState(current));

      asked.current = resumed;
      setPrompt(resumed);
    })();
  }, [agendaState, askNext, busy, session]);

  const run = useCallback(
    async (input: string | Action) => {
      if (busy) return;

      /**
       * Nothing runs until there is a session to record it in.
       *
       * Found by the end-to-end test: an instruction sent while the session
       * was still loading *executed* — it reached the API — but its turns
       * were dropped, because `useSession.apply` no-ops when the session is
       * not ready yet. A write with no record of it is worse than a write
       * that waits, since the transcript is the audit trail.
       */
      if (session.loading || !session.session) return;

      setBusy(true);

      try {
        const step = (session.session?.step ?? 'ingestion') as WizardStep;
        const loaded = engine.current;

        const result = await runTurn(input, {
          vocabulary,
          // What was asked, so a typed answer is read as an answer.
          ...(asked.current ? { prompt: asked.current } : {}),
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
                      // The question narrows the model's job from "what does
                      // this person want" to "what does this answer mean".
                      ...(asked.current
                        ? {
                            question: asked.current.step,
                            questionText: asked.current.text,
                          }
                        : {}),
                      hasDraft: Boolean(datasetId),
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
          // The transcript is the undo stack: each change carries the actions
          // that would put it back.
          history: session.messages,
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

        // Spent, so the same change cannot be undone twice — and so an undo
        // of the undo reaches the restoring turn instead.
        if (result.undoneMessageId) {
          await session.markUndone(result.undoneMessageId);
        }

        if (result.action && result.outcome) {
          recordAction(result.action, result.outcome);

          const currentStep = session.session?.step ?? 'ingestion';

          reportAction({
            action: result.action,
            datasetId,
            step: currentStep,
            ...(result.outcome.ok ? {} : { failureCode: result.outcome.code }),
          });

          if (result.action.kind === 'save' && result.outcome.ok) {
            reportSessionEnd(
              session.session?.sessionId ?? '',
              datasetId,
              session.messages.filter((message) => message.action).length,
            );
          }

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

          // The step decides which actions the model is offered next, so it
          // has to follow what actually happened rather than stay where the
          // conversation started.
          const nextStep = stepAfterAction(result.action);
          if (nextStep && nextStep !== session.session?.step) {
            await session.setStep(nextStep);
          }

          // The schema may have moved, so the vocabulary is re-read rather
          // than patched locally.
          await refreshVocabulary();
        }

        // Last, so the question is decided from the session as it is *after*
        // this turn recorded itself, and from a fresh read of the dataset.
        if (!awaitingInput(result.messages)) await askNext();
      } finally {
        setBusy(false);
      }
    },
    [
      askNext,
      busy,
      connectors,
      connectorsUnavailable,
      contextNow,
      // Read directly for `hasDraft`, so it has to be declared even though
      // `contextNow` already changes with it.
      datasetId,
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
  const enableModel = useCallback(async (wanted: ModelSpec = DEFAULT_MODEL) => {
    setModelError(undefined);
    setModelProgress({ progress: 0, text: 'Preparing…' });

    try {
      engine.current = await loadEngine({
        model: wanted,
        onProgress: (progress) => setModelProgress(progress),
      });
      setModel(wanted);
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

    // Frees the space rather than leaving the weights behind after the user
    // has said they do not want them.
    await removeModel(model.id).catch(() => undefined);
    setModelCached(false);
  }, [model.id]);

  /**
   * Writes the action trail to a file.
   *
   * Built from the persisted session rather than from anything held in
   * memory, so what is exported is exactly what was recorded.
   */
  const exportTrail = useCallback(() => {
    const current = session.session;
    if (!current) return;

    downloadJsonFile(buildAuditTrail(current), auditFileName(current));
  }, [session.session]);

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
    // Restoring counts as busy, so the composer is disabled rather than
    // accepting an instruction it would silently drop.
    busy: busy || session.loading,
    /**
     * Chips for the question being asked.
     *
     * The static lists were a guess at what the user might want to say next.
     * The agenda knows, so they are only a fallback for a turn that is not on
     * the agenda — an undo, or a free instruction after everything is
     * answered.
     */
    suggestions: prompt?.chips?.length
      ? prompt.chips
      : vocabulary.paths.length > 0
        ? SCHEMA_SUGGESTIONS
        : OPENING_SUGGESTIONS,
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
    model,
    modelChoices: MODELS.filter(
      (choice) => choice.tier <= (capability?.tier ?? 0),
    ),
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
    exportTrail,
  };
};
