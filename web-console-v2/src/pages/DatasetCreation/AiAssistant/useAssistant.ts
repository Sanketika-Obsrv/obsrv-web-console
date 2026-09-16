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
import { useQueryClient } from '@tanstack/react-query';
import { getAllFields } from 'services/dataset';
import { downloadJsonFile } from 'utils/downloadUtils';
import {
  DatasetDiffResult,
  fetchDatasetDiff,
  listConnectors,
  listDatasets,
  readConnector,
  readDataset,
} from 'services/datasetApi';
import { DatasetStatus } from 'types/datasets';
import { Action, WizardStep } from './engine/actions';
import {
  UiSpec,
  fillableProps,
  summariseProp,
  validateProp,
} from './engine/connectors';
import { datasetFacts } from './engine/datasetFacts';
import {
  AGENDA_READ_FIELDS,
  ExecutorContext,
  PendingDataset,
  executeAction,
  readSnapshot,
  submitConnector,
} from './engine/executor';
import {
  FieldVocabulary,
  buildFieldVocabulary,
} from './engine/fieldVocabulary';
import {
  ACCEPTS,
  AgendaState,
  Prompt,
  askMessage,
  nextPrompt,
} from './engine/agenda';
import { looksLikeData, summariseSample } from './engine/pastedData';
import { recap } from './engine/recap';
import { kindsForUtterance } from './engine/prerequisites';
import { awaitingInput, pendingConfirmation, runTurn } from './engine/turn';
import { readSampleFile } from './messages/sampleParse';
import {
  LoadProgress,
  ModelEngine,
  isModelCached,
  loadEngine,
} from './model/engineClient';
import { REQUIRED_MODEL } from './model/catalog';
import { resolveTurn, resolveWithModel } from './model/modelResolver';
import { stepForKinds } from './model/stepSchema';
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

export interface AssistantApi {
  datasetId: string | null;
  messages: ReturnType<typeof useSession>['messages'];
  loading: boolean;
  persisting: boolean;
  resumable: ReturnType<typeof useSession>['resumable'];
  currentSessionId?: string;
  busy: boolean;
  focusSection: ReturnType<typeof usePreviewFocus>['focusSection'];
  changedRefs: ReturnType<typeof usePreviewFocus>['changedRefs'];
  /** Changes written so far, so the preview knows its reads are stale. */
  previewRevision: number;
  send: (text: string) => Promise<void>;
  dispatch: (action: Action) => Promise<void>;
  attachSample: (rows: Record<string, unknown>[], file: File) => Promise<void>;
  /** Offers a dropped or pasted sample, to be confirmed before it is used. */
  offerSample: (file: File, pasted?: boolean) => Promise<void>;
  /** Hands connector credentials straight to the API; never an action. */
  submitSecrets: (secrets: Record<string, unknown>) => Promise<void>;
  /** The chosen connector's schema, read live rather than carried by a card. */
  connectorUiSpec?: UiSpec;
  /** What this browser could do, detected without downloading anything. */
  modelCapability?: Capability;
  modelProgress?: LoadProgress;
  /** False until the model is running; the conversation waits on it. */
  modelReady: boolean;
  /** True when the weights are already in this browser. */
  modelCached: boolean;
  modelError?: string;
  /** Loads it again, because a download can simply fail. */
  retryModel: () => Promise<void>;
  /**
   * Required connector properties still unanswered, described for asking.
   * Postgres marks nine of ten required, so this list matters.
   */
  connectorNeedsValues: string[];
  clearSession: (sessionId: string) => Promise<void>;
  /** Writes this conversation's action trail to a file. */
  exportTrail: () => void;
}

/**
 * Which step's grammar should read this utterance.
 *
 * `undefined` when the words name no topic, so the conversation's own step
 * stands — the common case, and the one the step scoping exists for.
 */
const stepForUtterance = (utterance: string): WizardStep | undefined => {
  const kinds = kindsForUtterance(utterance);

  return kinds ? stepForKinds(kinds) : undefined;
};

export const useAssistant = (routeDatasetId: string | null): AssistantApi => {
  const session = useSession({ datasetId: routeDatasetId });
  const queryClient = useQueryClient();
  const {
    focusSection,
    changedRefs,
    revision: previewRevision,
    recordTurn,
  } = usePreviewFocus();

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
  /**
   * `'batch'` or `'stream'`, read alongside the `ui_spec` from the same
   * `readConnector` call.
   *
   * This is the connector's own `category` field — the same field
   * `ConnectorConfiguration.tsx` reads (as `readConnector.data.category`) to
   * decide whether to render its "Configure Fetch Settings" section — not a
   * hand-maintained list of which connector ids are batch. Lowercased here
   * so the agenda can compare it against the literal `'batch'`.
   */
  const [connectorCategory, setConnectorCategory] = useState<
    string | undefined
  >();
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

  /**
   * The question currently on the table.
   *
   * A ref rather than state: nothing renders it — the question is a message
   * in the transcript like any other — and a turn can follow the one before
   * it without a render in between, where a stale question would mean the
   * answer is read against the *previous* one. Found in the end-to-end test,
   * where "Event" answered the type question and was written as the
   * dataset's name.
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

    // Both are cheap and download nothing: they only report what this
    // browser could do and whether the weights are already here.
    Promise.all([detectCapability(), isModelCached(REQUIRED_MODEL.id)])
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
   * Lists the master datasets, for the denormalisation question.
   *
   * Live only, and `type: 'master'` only — the same filter the wizard's
   * processing page applies, because those are the only datasets a
   * denormalisation can look values up in. A failure leaves the list as it
   * was: `undefined` before the first success, which the agenda reads as "not
   * known" and so does not ask, rather than as "there are none"; and a list
   * already held is better than forgetting it because one refetch failed.
   */
  const refreshMasters = useCallback(async () => {
    try {
      const result = await listDatasets<{
        data?: { dataset_id: string; name?: string; type?: string }[];
      }>({ status: ['Live'] });

      setMasterDatasets(
        (result?.data ?? []).filter((entry) => entry.type === 'master'),
      );
    } catch {
      // Deliberately nothing. See above.
    }
  }, []);

  useEffect(() => {
    void refreshMasters();
  }, [refreshMasters]);

  /**
   * Re-lists them, because the list goes stale under the user's feet.
   *
   * The assistant does not publish: a master it creates is a draft, and
   * making it Live happens in the wizard's preview and then the dataset list.
   * Listed only on mount, a master published during the conversation stayed
   * invisible until the page was reloaded — so the denormalisation question
   * would offer everything except the dataset the user had just made for it.
   *
   * Two moments cover that: coming back to the tab, and reaching the
   * processing stage, which is where the question is asked.
   */
  useEffect(() => {
    const onFocus = () => {
      void refreshMasters();
    };

    window.addEventListener('focus', onFocus);

    return () => window.removeEventListener('focus', onFocus);
  }, [refreshMasters]);

  const conversationStep = session.session?.step;

  useEffect(() => {
    if (conversationStep !== 'processing') return;
    void refreshMasters();
  }, [conversationStep, refreshMasters]);

  /**
   * What a Live copy of this dataset would change if republished — the same
   * diff `PreviewSummary.tsx`'s "Summary of changes" tab reads.
   *
   * `undefined` unless a Live copy actually exists: a `mode=edit` read
   * always reports the draft's own status, never the published one (the same
   * caveat `recap.ts` already documents for `liveElsewhere`), so a separate
   * check is the only way to know. A dataset that has never been published,
   * or a failed check either way, leaves this `undefined` — `datasetFacts`
   * reads that as nothing to report, never as an empty comparison.
   */
  const [liveDiff, setLiveDiff] = useState<DatasetDiffResult | undefined>();

  const refreshLiveDiff = useCallback(async () => {
    if (!datasetId) {
      setLiveDiff(undefined);
      return;
    }

    try {
      await readDataset({
        datasetId,
        status: DatasetStatus.Live,
        fields: 'dataset_id,status',
      });
    } catch {
      setLiveDiff(undefined);
      return;
    }

    try {
      setLiveDiff(await fetchDatasetDiff(datasetId));
    } catch {
      setLiveDiff(undefined);
    }
  }, [datasetId]);

  useEffect(() => {
    void refreshLiveDiff();
  }, [refreshLiveDiff]);

  useEffect(() => {
    if (conversationStep !== 'preview') return;
    void refreshLiveDiff();
  }, [conversationStep, refreshLiveDiff]);

  /** Reads the chosen connector's schema whenever the choice changes. */
  const chosenConnectorId = session.session?.connector?.id;

  useEffect(() => {
    let cancelled = false;

    if (!chosenConnectorId) {
      setUiSpec(undefined);
      setConnectorCategory(undefined);
      return undefined;
    }

    readConnector<{
      ui_spec?: UiSpec;
      category?: string;
      connector_meta?: { ui_spec?: UiSpec; category?: string };
    }>(chosenConnectorId)
      .then((result) => {
        if (cancelled) return;
        setUiSpec(result?.ui_spec ?? result?.connector_meta?.ui_spec);

        const category = result?.category ?? result?.connector_meta?.category;
        setConnectorCategory(
          typeof category === 'string' ? category.toLowerCase() : undefined,
        );
      })
      .catch(() => {
        setUiSpec(undefined);
        setConnectorCategory(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [chosenConnectorId]);

  /**
   * What this turn has learned so far, ahead of the render that will carry it.
   *
   * `contextNow` otherwise reads `session.session`, which is React state and
   * does not update mid-turn — so a turn that ran two actions in one
   * `runTurn` call would run the second against the `datasetId` the render
   * still held before the first one wrote anything. Nothing on this branch
   * produces more than one action yet, except undo, which reads between its
   * own steps from the transcript rather than from here — but the overlay
   * has to exist before a multi-action plan does, or this is the kind of gap
   * that is easy to forget once the rest works. Cleared at the top of every
   * turn and written to as each action's outcome comes back.
   */
  const turnState = useRef<{ datasetId?: string; pending?: PendingDataset }>(
    {},
  );

  /**
   * Built when a turn runs, not memoised.
   *
   * The sample lives in a ref, and mutating a ref does not recompute a memo —
   * so a memoised context captured `sample.current` as it was on the previous
   * render and the executor never saw the file, failing with MISSING_SAMPLE.
   *
   * `overlay` takes precedence over the render closure when present, which is
   * what lets a second action in the same turn see the first one's write —
   * see `turnState` above. Callers with no overlay of their own get exactly
   * today's behaviour.
   */
  const contextNow = useCallback(
    (
      overlay: { datasetId?: string; pending?: PendingDataset } = {},
    ): ExecutorContext => ({
      datasetId: overlay.datasetId ?? datasetId,
      // Carried by the session, because the server cannot hold a name or type
      // until `datasets/create` has run.
      pending: overlay.pending ?? session.session?.pending,
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
        /*
          The document is the record of what was decided whenever this
          conversation did not build the dataset. `create` writes defaults
          nobody chose, which is why the transcript normally settles the
          optional questions — but on a dataset that already existed those
          values are somebody's decisions, and that stays true for the whole
          conversation. Scoped to the first turn at first, which meant the
          second turn on a live dataset asked it for its name.
        */
        ...(current?.mode === 'update' ? { documentAuthoritative: true } : {}),
        ...(current?.pending ? { pending: current.pending } : {}),
        // The stage the conversation is on, so the agenda asks about where
        // the user actually is rather than where the plan starts. It follows
        // every action, which is what keeps a detour from snapping back.
        ...(current?.step ? { focus: current.step as WizardStep } : {}),
        history: current?.messages ?? [],
        sampleRows: (current?.sampleRows ?? []) as Record<string, unknown>[],
        ...(current?.connector
          ? {
              connector: {
                ...current.connector,
                configured: current.connectorConfigured,
                uiSpec,
                ...(connectorCategory ? { category: connectorCategory } : {}),
              },
            }
          : {}),
        ...(connectorsUnavailable ? {} : { connectorsAvailable: connectors }),
        ...(masterDatasets ? { masterDatasets } : {}),
        ...(liveDiff ? { liveDiff } : {}),
      };
    },
    [
      connectorCategory,
      connectors,
      connectorsUnavailable,
      datasetId,
      liveDiff,
      masterDatasets,
      session.session,
      uiSpec,
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
      // Building one: the question is the whole opening, and it is asked
      // without a read in front of it so nothing delays the first turn.
      if (current.mode !== 'update') {
        void askNext();
        return;
      }

      /*
        Opening one that already exists: it is read back first. Without the
        recap the assistant opens with a question about a document the user
        can see and it cannot describe — and since the document settles most
        of the agenda, that question is usually "what would you like to
        change?", which needs the recap in front of it to mean anything.
      */
      void (async () => {
        const state = await agendaState(current);

        /*
          Whether it is live cannot be read off the document: a `mode=edit`
          read returns the draft copy, whose own status is "Draft". So the
          live copy is asked for separately, and a failure means there is
          none — which is the ordinary case for a draft.
        */
        const liveElsewhere = current.datasetId
          ? await readDataset({
              datasetId: current.datasetId,
              status: DatasetStatus.Live,
              fields: 'dataset_id,status',
            })
              .then(() => true)
              .catch(() => false)
          : false;

        const said = recap(state.dataset, { liveElsewhere });

        if (said) await session.append({ role: 'assistant', text: said });

        const next = await askNext();

        if (!next) {
          await session.append({
            role: 'assistant',
            text: 'What would you like to change?',
          });
        }
      })();
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
      // Cleared at the top of every turn: last turn's overlay must not leak
      // into this one, and this turn has not learned anything yet.
      turnState.current = {};

      try {
        const step = (session.session?.step ?? 'ingestion') as WizardStep;
        const loaded = engine.current;

        // Read before the echo below is appended, so what a turn reasons
        // over — the last thing proposed, the last thing that failed — is
        // the transcript as it stood when the user typed, not one that
        // already contains their own words.
        const history = session.messages;

        // Appended immediately, ahead of the request, so what the user
        // typed is on screen for as long as the turn takes to answer,
        // rather than reappearing only once it resolves. A card click
        // carries no typed words, so only a string input gets an echo —
        // matching what `runTurn` used to build internally before this.
        if (typeof input === 'string') {
          await session.append({ role: 'user', text: input });
        }

        /**
         * What the document currently says, read once per turn and handed to
         * the model so a resolved action can be checked against it — see
         * `datasetFacts`'s own doc for why this exists.
         *
         * Built the same way `askNext` builds `AgendaState` for the next
         * question — a live re-read, never a cached one — so the fact "the
         * name is X" is exactly as current as the question that would ask
         * about it. Only read when the model is actually in play: nothing
         * downstream of the rules consults `facts`, so a browser running at
         * tier 0 gains nothing from the extra round trip.
         */
        const facts =
          loaded && modelReady ? datasetFacts(await agendaState()) : undefined;

        const result = await runTurn(input, {
          vocabulary,
          // False before `datasets/create` has run, so a request that needs
          // a document to change is answered with what is missing rather
          // than attempted against nothing.
          datasetExists: Boolean(datasetId),
          // A name and a type held client-side mean the draft is one sample
          // away, so that is what a blocked request should ask for.
          draftPending: Boolean(
            !datasetId &&
            session.session?.pending?.name &&
            session.session?.pending?.datasetType,
          ),
          // What was asked, so a typed answer is read as an answer.
          ...(asked.current ? { prompt: asked.current } : {}),
          connectors,
          connectorsUnavailable,
          connectorProperties: fillableProps(uiSpec).map((prop) => prop.key),
          // So a join written in one sentence can name the dataset it joins
          // to; the agenda's three-turn question only covers the first one.
          ...(masterDatasets ? { masterDatasets } : {}),
          // The model replaces one step of the pipeline — resolution — and
          // returns the same shape the rules do, falling back to them on any
          // doubt. Everything downstream is unchanged.
          ...(loaded && modelReady
            ? {
                resolve: (utterance: string) => {
                  /*
                    The step the words are about, when they name a topic of
                    its own. The model's grammar is a step's action list, and
                    the question narrows it further to what that question
                    accepts — so a request from another stage has no word for
                    itself in either. Found in the browser: at the storage
                    question, "denormalise assistant-customers on
                    customer_id as customer_details" resolved to nothing,
                    because `set_denorm` is on the processing menu and the
                    storage question accepts neither. Where the words name
                    their own topic, that topic supplies the grammar and the
                    question steps aside.
                  */
                  const requested = stepForUtterance(utterance);
                  /*
                    Only a topic from *elsewhere* displaces the question.
                    "mark mid as required" names the schema, which is the
                    stage the schema question belongs to, and dropping the
                    question there cost the model its worked examples — they
                    are per question — and it read the instruction as a
                    change of arrival format.
                  */
                  const elsewhere =
                    requested &&
                    asked.current &&
                    requested !==
                      stepForKinds([...ACCEPTS[asked.current.step]]);
                  const keepQuestion = asked.current && !elsewhere;

                  return resolveWithModel(
                    {
                      utterance,
                      step: (keepQuestion ? undefined : requested) ?? step,
                      // The question narrows the model's job from "what does
                      // this person want" to "what does this answer mean".
                      ...(keepQuestion && asked.current
                        ? {
                            question: asked.current.step,
                            questionText: asked.current.text,
                          }
                        : {}),
                      hasDraft: Boolean(datasetId),
                      vocabulary,
                      history,
                      connectors,
                      connectorProperties: fillableProps(uiSpec).map(
                        (prop) => prop.key,
                      ),
                      ...(masterDatasets ? { masterDatasets } : {}),
                      ...(facts ? { facts } : {}),
                    },
                    { engine: loaded },
                  );
                },
                /**
                 * Call A. Reads what *kind* of turn this is before anything
                 * downstream tries to act on it, so `runTurn`'s router
                 * branch can settle an `ask`, an `other`, a reply to a card,
                 * or an out-of-scope request without ever reaching call B —
                 * the two-call split `resolveTurn` exists for.
                 *
                 * Given the same question, vocabulary and history `resolve`
                 * already threads through, but none of `resolve`'s own
                 * step-override reasoning: that exists to pick the right
                 * grammar for an *extracting* call, and here the router
                 * itself is what decides which step, if any, this turn is
                 * about — from its own reading of the words, not from a
                 * local guess at their topic.
                 */
                route: (utterance: string) => {
                  const pendingCard = pendingConfirmation(history);

                  return resolveTurn(
                    {
                      utterance,
                      step,
                      ...(asked.current
                        ? {
                            question: asked.current.step,
                            questionText: asked.current.text,
                          }
                        : {}),
                      ...(asked.current?.card?.kind === 'choice'
                        ? {
                            optionLabels: asked.current.card.options.map(
                              (option) => option.label,
                            ),
                          }
                        : {}),
                      ...(pendingCard
                        ? { pendingCardTitle: pendingCard.title }
                        : {}),
                      hasDraft: Boolean(datasetId),
                      vocabulary,
                      history,
                      connectors,
                      connectorProperties: fillableProps(uiSpec).map(
                        (prop) => prop.key,
                      ),
                      ...(masterDatasets ? { masterDatasets } : {}),
                      ...(facts ? { facts } : {}),
                    },
                    { engine: loaded },
                  );
                },
              }
            : {}),
          execute: async (action) => {
            const outcome = await executeAction(
              action,
              contextNow(turnState.current),
            );

            // Fed back into the overlay immediately, so a second action run
            // within this same turn sees what the first one just wrote —
            // see `turnState`'s own comment above `contextNow`.
            if (
              outcome.ok &&
              outcome.status === 'applied' &&
              outcome.datasetId
            ) {
              turnState.current.datasetId = outcome.datasetId;
            }
            if (outcome.ok && outcome.status === 'pending') {
              turnState.current.pending = {
                ...turnState.current.pending,
                ...outcome.pending,
              };
            }

            return outcome;
          },
          // The transcript is the undo stack: each change carries the actions
          // that would put it back.
          history,
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

        /**
         * Per action, in the order it ran.
         *
         * A turn can carry more than one action — `runUndo` already does —
         * so these effects run once per entry rather than once per turn.
         * `recordTurn`, the query invalidation, `setStep` and
         * `refreshVocabulary` are deliberately *not* in here: each of those
         * is either a single fact about the whole turn (which action ran
         * last) or a server read, and a server read run N times for an
         * N-action turn is N round trips for the same answer.
         */
        for (const { action, outcome } of result.applied) {
          const currentStep = session.session?.step ?? 'ingestion';

          reportAction({
            action,
            datasetId,
            step: currentStep,
            ...(outcome.ok ? {} : { failureCode: outcome.code }),
          });

          // A choice made before the draft exists has to be kept, or the
          // create call would later run without a name.
          if (outcome.ok && outcome.status === 'pending') {
            await session.setPending(outcome.pending);
          }

          // Connector choices and values are buffered in the session; the
          // executor validated them and wrote nothing, because a connector is
          // written once, together with its credentials.
          if (outcome.ok) {
            if (action.kind === 'select_connector') {
              const known = connectors.find(
                (candidate) => candidate.id === action.connectorId,
              );
              await session.selectConnector({
                id: action.connectorId,
                ...(known?.name ? { name: known.name } : {}),
              });
            }

            if (action.kind === 'set_connector_field') {
              // The *coerced* value, not the raw one the action carried.
              // Postgres declares `source_database_port` as a number, and
              // storing the typed string sent `"5432"` to the connector —
              // seen live in `connector_config`.
              const prop = fillableProps(uiSpec).find(
                (candidate) => candidate.key === action.property,
              );
              const checked = prop
                ? validateProp(prop, action.value)
                : undefined;

              await session.setConnectorValue(
                action.property,
                checked?.ok ? checked.value : action.value,
              );
            }

            // A batch connector's schedule, buffered the same way a
            // connector field is — nothing reaches the server until
            // `submitConnector` runs, folded into `operations_config`.
            if (action.kind === 'set_operations_config') {
              await session.setConnectorSchedule(action.schedule);
            }

            // Nothing else produces this card, so without it the credential
            // form is unreachable and no connector can ever be saved — the
            // same gap the file-drop card had.
            // The one browser-only side effect `export_schema` has: the
            // executor stayed a pure read, so the actual download — a
            // `Blob` and an anchor click, same as `exportTrail` below —
            // happens here. Mirrors the wizard's own "Download JSON Schema"
            // button (`SchemaDetails.tsx`), including its filename.
            if (
              action.kind === 'export_schema' &&
              outcome.status === 'applied'
            ) {
              const schema = outcome.dataset.data_schema;
              if (schema) downloadJsonFile(schema, 'json-schema');
            }

            if (action.kind === 'request_connector_secrets') {
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
            outcome.ok && outcome.status === 'applied'
              ? outcome.datasetId
              : undefined;

          if (created) await session.attachDataset(created);
        }

        /** Once per turn, after every action in it has been recorded above. */
        if (result.applied.length) {
          recordTurn(result.applied);

          /*
            The preview reads the dataset through React Query; the executor
            writes through plain axios, because it runs outside React. So
            nothing connected the two, and the pane went on showing the read
            it made when it mounted — "mark mid as required" changed the
            server and not the screen. A prefix match, since the pane and
            the configuration tables ask for different projections of the
            same dataset and each has its own cache entry.
          */
          const wrote = result.applied.some(
            ({ outcome }) => outcome.ok && outcome.status === 'applied',
          );

          if (wrote) {
            await queryClient.invalidateQueries({
              queryKey: ['fetchDatasetsById', datasetId],
            });
          }

          const saved = result.applied.some(
            ({ action, outcome }) => action.kind === 'save' && outcome.ok,
          );

          if (saved) {
            reportSessionEnd(
              session.session?.sessionId ?? '',
              datasetId,
              session.messages.filter((message) => message.action).length,
            );
          }

          // The step decides which actions the model is offered next, so it
          // follows the *last* thing that actually happened this turn rather
          // than the first — the step is a cursor, not a log.
          const lastAction = result.applied[result.applied.length - 1].action;
          const nextStep = stepAfterAction(lastAction);
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
      } catch (cause) {
        /**
         * The backstop.
         *
         * `runTurn` turns an executor failure into a message and the session
         * store degrades to memory rather than rejecting, so reaching here
         * means something unforeseen — a bug of ours, a browser API
         * refusing. Whatever it is, it must not leave as an uncaught
         * rejection: the development server renders that as a full-screen
         * runtime error, and production drops it silently along with the
         * turn. Reported here in the conversation, where the user is looking.
         */
        await session
          .append({
            role: 'assistant',
            text: `Something went wrong handling that: ${
              cause instanceof Error ? cause.message : 'unknown error'
            }. Nothing was changed by it — try again, or say it differently.`,
            failureCode: 'TURN_FAILED',
          })
          .catch(() => undefined);
      } finally {
        setBusy(false);
      }
    },
    [
      agendaState,
      askNext,
      busy,
      connectors,
      connectorsUnavailable,
      contextNow,
      masterDatasets,
      // Read directly for `hasDraft`, so it has to be declared even though
      // `contextNow` already changes with it.
      datasetId,
      modelReady,
      queryClient,
      recordTurn,
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
  /**
   * Loads the model the assistant runs on.
   *
   * There is no choice of model and no opting out: every instruction is
   * typed, and reading them is what the model does. It is started without
   * being asked for, and the banner reports the cost while it happens.
   */
  const loadRequiredModel = useCallback(async () => {
    if (engine.current) return;

    setModelError(undefined);
    setModelProgress({ progress: 0, text: 'Preparing…' });

    try {
      engine.current = await loadEngine({
        model: REQUIRED_MODEL,
        onProgress: (progress) => setModelProgress(progress),
      });
      setModelReady(true);
      setModelCached(true);

      // Recorded so telemetry reports the tier that actually ran. It was
      // never called, so every session was reported as rule-only even with
      // the model driving it.
      await session.setModelTier(REQUIRED_MODEL.tier);
    } catch (cause) {
      setModelError(
        cause instanceof Error
          ? cause.message
          : 'The model could not be loaded.',
      );
    } finally {
      setModelProgress(undefined);
    }
  }, [session]);

  /**
   * Starts the load as soon as the browser has been asked what it can do.
   *
   * Guarded by a ref rather than by state: the effect re-runs whenever the
   * session changes, and two loads of a gigabyte would be two downloads.
   */
  const loadStarted = useRef(false);

  useEffect(() => {
    if (!capability || loadStarted.current) return;

    if (capability.tier < REQUIRED_MODEL.tier) {
      setModelError(
        capability.reason ??
          `This browser cannot run ${REQUIRED_MODEL.label}, which the assistant needs to read your instructions.`,
      );
      return;
    }

    loadStarted.current = true;
    void loadRequiredModel();
  }, [capability, loadRequiredModel]);

  /**
   * Lets the weights go when the assistant is left.
   *
   * The engine holds its weights in GPU and host memory for as long as it
   * exists, and nothing used to release them: navigating away from the
   * assistant left a gigabyte-and-a-half resident in the tab. Found while
   * testing, when the machine ran out of memory with the page long since
   * navigated away.
   */
  useEffect(
    () => () => {
      const loaded = engine.current;
      engine.current = undefined;
      void loaded?.unload().catch(() => undefined);
    },
    [],
  );

  const retryModel = useCallback(async () => {
    loadStarted.current = true;
    await loadRequiredModel();
  }, [loadRequiredModel]);

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

  /**
   * Offers a sample the user supplied, rather than using it.
   *
   * Both ways in — dropping a file on the pane, pasting rows into the box —
   * land here. The rows are parsed locally and *described* back; nothing is
   * sent until the user says yes, because a sample is their own data and a
   * truncated or misparsed paste is worth catching before it becomes the
   * schema. The confirmation is an ordinary `confirm` card, so the typed
   * "yes" that answers it is the one that answers any other proposal.
   */
  const offerSample = useCallback(
    async (file: File, pasted = false) => {
      if (!session.session || busy) return;

      setBusy(true);

      try {
        const parsed = await readSampleFile(file);

        /*
          What is recorded is the description, not the data. A pasted sample
          can be a megabyte of the user's own records, and the transcript is
          persisted and exportable — so the turn says what arrived, and the
          rows live only in the session's capped, expiring sample slot.
        */
        await session.append({
          role: 'user',
          text: pasted
            ? parsed.ok
              ? `Pasted ${summariseSample(parsed.rows)}.`
              : 'Pasted something I could not read.'
            : `Dropped ${file.name}.`,
        });

        if (!parsed.ok) {
          await session.append({
            role: 'assistant',
            text: `${parsed.error} A sample has to be JSON or JSONL — an array of records, or one record per line.`,
            failureCode: 'MISSING_SAMPLE',
          });
          return;
        }

        // Held here so the create call has the file, and in the session so
        // the local checks — duplicate counts, expressions — have the rows.
        sample.current = { file, rows: parsed.rows };
        await session.setSampleRows(parsed.rows);

        await session.append({
          role: 'assistant',
          text: `That looks like ${summariseSample(parsed.rows)}. Use it as the sample?`,
          card: {
            kind: 'confirm',
            title: `Use ${file.name} as the sample`,
            confirmAction: { kind: 'attach_sample', fileName: file.name },
          },
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, session],
  );

  /**
   * What the user typed.
   *
   * Data is recognised before anything else looks at it: a pasted JSON array
   * is a sample, not an instruction, and handing it to the resolver would
   * get it refused as gibberish. Everything else is an ordinary turn.
   */
  const send = useCallback(
    async (text: string) => {
      if (!looksLikeData(text)) {
        await run(text);
        return;
      }

      await offerSample(
        new File([text], 'pasted-sample.json', { type: 'application/json' }),
        true,
      );
    },
    [offerSample, run],
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
    focusSection,
    changedRefs,
    previewRevision,
    send,
    dispatch: run,
    attachSample,
    offerSample,
    submitSecrets,
    connectorUiSpec: uiSpec,
    modelCapability: capability,
    modelProgress,
    modelReady,
    modelCached,
    modelError,
    retryModel,
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
