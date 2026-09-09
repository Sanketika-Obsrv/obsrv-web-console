/**
 * What the assistant asks next.
 *
 * Everything before this module was reactive: the user composed an
 * instruction, the resolver turned it into an `Action`, the executor ran it.
 * Nothing decided what should happen next, so the user had to already know
 * what could be said — and the two failures that cost most were both this
 * shape: the file-drop card invited the first action and then refused it for
 * want of a name, and a small model choosing from thirty action kinds against
 * open text chose the wrong kind.
 *
 * So this module holds the interview. Two rules make it trustworthy:
 *
 * - **Which questions are still open is derived, never stored.** Wherever the
 *   answer lives in the dataset — the name, the type, the schema, an
 *   unresolved conflict — the server document decides. A reload therefore
 *   resumes on the right question without a transcript, and the standing
 *   invariant holds: dataset state is always re-read, never cached.
 * - **Where the server cannot represent "no", the transcript can.** A
 *   `dedup_config` with `drop_duplicates: false` is indistinguishable from one
 *   nobody has answered, so declining is recorded as a `skip_step` action and
 *   read back from the conversation. That reuses the persistence and the audit
 *   trail already in place instead of adding session fields that could drift.
 *
 * Pure. The impure parts — reading the document, fetching the PII
 * suggestions, listing the connectors — are the caller's, and arrive as
 * `AgendaState`.
 *
 * One accepted limit: `skip_step` writes nothing, so undo passes over it and
 * a declined question is not re-opened by undoing. The user can still ask for
 * the change directly, which is why this is a wrinkle and not a trap.
 */
import _ from 'lodash';
import {
  Action,
  ActionKind,
  AGENDA_STEPS,
  AgendaStepId,
  DATASET_TYPES,
} from './actions';
import { dedupCandidates, describeCandidate } from './dedupSuggest';
import {
  lowSuggestions,
  maskCandidates,
  timestampCandidates,
} from './schemaSuggestions';
import {
  DatasetSnapshot,
  ExecutionFailureCode,
  PendingDataset,
} from './executor';
import {
  dateTimePaths,
  dedupEligiblePaths,
  storageKeyEligiblePaths,
  vocabularyFromSchema,
} from './fieldVocabulary';
import { EVENT_ARRIVAL_LABEL } from './executor';
import { ChoiceOption, MessageCard } from '../messages/types';
import { conflictOptions, unresolvedConflicts } from './schemaEditor';
import { Message } from '../session/types';
import { pathFromRef } from './previewFocus';

export type { AgendaStepId };

export interface AgendaState {
  /** The server document, absent until the draft exists. */
  dataset?: DatasetSnapshot;
  /** Name and type chosen before `datasets/create` has run. */
  pending?: PendingDataset;
  /** The conversation so far, which is where a declined question is recorded. */
  history?: Message[];
  /** The user's sample, for ranking dedup keys. Expires, so often absent. */
  sampleRows?: Record<string, unknown>[];
  /** The connector chosen, when one was. */
  connector?: { id: string; name?: string; configured: boolean };
  /** Connectors the cluster offers, once listed. Absent means unknown. */
  connectorsAvailable?: { id: string; name?: string }[];
  /**
   * Field paths to ask about masking.
   *
   * Optional, and normally absent: the default source is the API's own LOW
   * `TRANSFORMATION` hints on `data_schema`, which is where its PII detection
   * already lives. This overrides them, for when the separate `analyze/pii`
   * system API is wired and finds more (phone numbers, card numbers).
   */
  piiSuggested?: string[];
  /**
   * Live datasets of `type: 'master'`, once listed.
   *
   * `undefined` and `[]` differ and are treated differently: not listed yet,
   * versus listed and there is nothing to join to. Asking on `undefined`
   * would offer an empty list.
   */
  masterDatasets?: { dataset_id: string; name?: string }[];
  /** The failure from the turn that just ran, so a question can be re-asked. */
  lastFailureCode?: ExecutionFailureCode;
  /** The name that was refused, so an alternative can be offered. */
  lastName?: string;
}

export interface Prompt {
  step: AgendaStepId;
  /** The question, as the assistant says it. */
  text: string;
  card?: MessageCard;
  /** Suggested replies, offered as chips. */
  chips?: string[];
}

/**
 * The action kinds a free-text answer to each question may resolve to.
 *
 * This is what shrinks the model's job from "choose one of thirty actions"
 * to "read an answer to the question just asked". `skip_step` is on every
 * question that can be declined, because "leave it" has to be sayable.
 */
/** Actions that count as engaging with the schema review. */
const SCHEMA_EDIT_KINDS: ActionKind[] = [
  'set_data_type',
  'set_arrival_format',
  'toggle_required',
  'set_description',
  'add_field',
  'delete_field',
  'skip_step',
];

export const ACCEPTS: Record<AgendaStepId, ActionKind[]> = {
  name: ['set_dataset_name'],
  type: ['set_dataset_type', 'skip_step'],
  connector: [
    'set_connector_field',
    'request_connector_secrets',
    'select_connector',
    'skip_connector',
    'skip_step',
  ],
  sample: ['attach_sample', 'select_connector', 'skip_step'],
  conflicts: ['resolve_conflict', 'set_data_type', 'skip_step'],
  schema: SCHEMA_EDIT_KINDS,
  pii: ['set_pii', 'skip_step'],
  validation: ['set_additional_fields', 'skip_step'],
  transform: ['add_transformation', 'add_derived_field', 'skip_step'],
  denorm: ['set_denorm', 'skip_step'],
  dedup: ['set_dedup', 'skip_step'],
  storage: ['set_storage', 'skip_step'],
  // No `skip_step`: the chosen store does not work without its key, so this
  // is the one question that cannot be declined.
  keys: ['set_keys'],
  review: ['save'],
};

/** Actions in the transcript that actually went through. */
const appliedActions = (history: Message[] | undefined): Action[] =>
  (history ?? [])
    .filter((message) => message.action && !message.failureCode)
    .map((message) => message.action as Action);

/**
 * Whether a question was answered in the conversation.
 *
 * An attempt the API refused is not an answer: the setting is still unset, so
 * counting the attempt would drop the question silently.
 */
const answeredInTranscript = (
  state: AgendaState,
  step: AgendaStepId,
  kinds: ActionKind[],
): boolean =>
  appliedActions(state.history).some(
    (action) =>
      kinds.includes(action.kind) ||
      (action.kind === 'skip_step' && action.step === step && !action.path),
  );

const block = (state: AgendaState, key: string): Record<string, unknown> =>
  (state.dataset?.[key] ?? {}) as Record<string, unknown>;

/** Field paths whose PII question has been answered, either way. */
const piiDecided = (state: AgendaState): string[] => {
  const fromActions = appliedActions(state.history).flatMap((action) => {
    if (action.kind === 'set_pii') return [action.path];
    if (action.kind === 'skip_step' && action.step === 'pii' && action.path) {
      return [action.path];
    }
    return [];
  });

  // A transformation already on the document counts too, so a resumed
  // conversation does not re-ask about a field it masked last week.
  const transformations = (state.dataset?.transformations_config ?? []) as {
    field_key?: string;
  }[];

  return _.uniq([
    ...fromActions,
    ...transformations
      .map((entry) => entry.field_key)
      .filter((key): key is string => Boolean(key)),
  ]);
};

/**
 * Fields to ask about masking.
 *
 * The API's own LOW `TRANSFORMATION` hints by default — its PII detection is
 * already on the document, so this question needs no extra request. An
 * explicit list overrides them.
 */
const piiSource = (state: AgendaState): string[] =>
  state.piiSuggested ?? maskCandidates(state.dataset?.data_schema);

const piiOutstanding = (state: AgendaState): string[] =>
  piiSource(state).filter((path) => !piiDecided(state).includes(path));

/**
 * Which keys the chosen stores make mandatory.
 *
 * Derived from the toggles rather than written down twice: the wizard makes
 * `timestamp_key` required when the real-time store is on, and
 * `primary_key` / `partition_key` required for the lakehouse or the cache
 * (`Storage/Storage.tsx:292,312,332`). A guided flow that went from storage
 * straight to save produced a real-time dataset with no timestamp key —
 * something the wizard refuses to build.
 */
export type KeySlot = 'timestamp' | 'primary' | 'partition';

const KEY_FIELD: Record<KeySlot, string> = {
  timestamp: 'timestamp_key',
  primary: 'data_key',
  partition: 'partition_key',
};

export const requiredKeys = (state: AgendaState): KeySlot[] => {
  const indexing = (block(state, 'dataset_config').indexing_config ??
    {}) as Record<string, boolean>;
  const slots: KeySlot[] = [];

  if (indexing.olap_store_enabled) slots.push('timestamp');
  if (indexing.lakehouse_enabled || indexing.cache_enabled) {
    slots.push('primary');
  }
  if (indexing.lakehouse_enabled) slots.push('partition');

  return slots;
};

/** Mandatory key slots the document does not yet hold a value for. */
const missingKeys = (state: AgendaState): KeySlot[] => {
  const keys = (block(state, 'dataset_config').keys_config ?? {}) as Record<
    string,
    string
  >;

  return requiredKeys(state).filter((slot) => !keys[KEY_FIELD[slot]]);
};

const conflicts = (state: AgendaState): string[] =>
  state.dataset?.data_schema
    ? unresolvedConflicts(state.dataset.data_schema)
    : [];

/** Whether each question still needs an answer. */
const PENDING: Record<AgendaStepId, (state: AgendaState) => boolean> = {
  name: (state) => !state.dataset?.name && !state.pending?.name,

  type: (state) => !state.dataset?.type && !state.pending?.datasetType,

  // Only in play once a connector has been chosen: the sample question is
  // what offers the choice, so before that there is nothing to configure.
  connector: (state) => Boolean(state.connector && !state.connector.configured),

  sample: (state) => !state.dataset?.data_schema,

  conflicts: (state) => conflicts(state).length > 0,

  // Stays open until it is explicitly closed, so a review can be more than
  // one edit — the assistant asks "anything else?" after each one, and a
  // single click ends it.
  schema: (state) =>
    Boolean(state.dataset?.data_schema) &&
    !answeredInTranscript(state, 'schema', []),

  pii: (state) => piiOutstanding(state).length > 0,

  validation: (state) =>
    !answeredInTranscript(state, 'validation', ['set_additional_fields']),

  transform: (state) =>
    !answeredInTranscript(state, 'transform', [
      'add_transformation',
      'add_derived_field',
    ]),

  // Not raised until the master datasets are known, and never when there are
  // none: an offer to join against an empty list wastes a turn.
  denorm: (state) =>
    Boolean(state.masterDatasets?.length) &&
    !answeredInTranscript(state, 'denorm', ['set_denorm']),

  dedup: (state) =>
    block(state, 'dedup_config').drop_duplicates !== true &&
    !answeredInTranscript(state, 'dedup', ['set_dedup']),

  // Storage cannot be read from the document: `create` sets defaults that a
  // fresh draft carries whether or not anyone chose them, so "answered no"
  // and "never asked" look identical there. The transcript is the only
  // honest source.
  storage: (state) => !answeredInTranscript(state, 'storage', ['set_storage']),

  keys: (state) => missingKeys(state).length > 0,

  review: (state) => (state.dataset?.status ?? 'Draft') === 'Draft',
};

export const currentStep = (state: AgendaState): AgendaStepId | undefined =>
  AGENDA_STEPS.find((step) => PENDING[step](state));

/** `My Orders` → `My Orders 2`, `My Orders 2` → `My Orders 3`. */
export const alternativeName = (name: string): string => {
  const match = /^(.*?)(\d+)$/.exec(name.trim());

  return match ? `${match[1]}${Number(match[2]) + 1}` : `${name.trim()} 2`;
};

const TYPE_HINTS: Record<(typeof DATASET_TYPES)[number], string> = {
  event: 'A stream of things that happened — clicks, logs, orders.',
  transaction: 'Records that can be updated after they arrive.',
  master: 'Reference data other datasets look values up in.',
};

const choice = (prompt: string, options: ChoiceOption[]): MessageCard => ({
  kind: 'choice',
  prompt,
  options,
});

const nameQuestion = (state: AgendaState): Prompt => {
  // The executor's failure narration is its own message. Repeating "already
  // exists" here would read as though the second name was refused too.
  if (state.lastFailureCode === 'DATASET_ID_TAKEN' && state.lastName) {
    return {
      step: 'name',
      text: 'What else shall we call it?',
      chips: [alternativeName(state.lastName)],
    };
  }

  return {
    step: 'name',
    text: state.lastFailureCode
      ? 'What shall we call it?'
      : 'What would you like to call this dataset?',
  };
};

const conflictQuestion = (state: AgendaState): Prompt | undefined => {
  const ref = conflicts(state)[0];
  const options = state.dataset?.data_schema
    ? conflictOptions(state.dataset.data_schema, ref)
    : null;

  if (!options) return undefined;

  const path = pathFromRef(ref);

  return {
    step: 'conflicts',
    text: `${path} arrived as more than one type in your sample. Which should it be?`,
    card: {
      kind: 'conflict',
      path,
      candidates: options.candidates.map((dataType) => ({
        dataType: dataType as never,
        ...(options.counts?.[dataType] !== undefined
          ? { count: options.counts[dataType] }
          : {}),
        ...(dataType === options.recommended ? { isRecommended: true } : {}),
        ...(dataType === options.safest ? { isSafest: true } : {}),
      })),
      ...(options.valuesAtRisk !== null
        ? { valuesAtRisk: options.valuesAtRisk }
        : {}),
    },
  };
};

/**
 * The masking question, in the API's words.
 *
 * The reason is quoted rather than asserted — "appears to be 'email' format
 * type" is the API's own finding, and paraphrasing it as "this is personal
 * data" would be the assistant claiming something it did not determine.
 */
const piiQuestion = (state: AgendaState): Prompt => {
  const [path] = piiOutstanding(state);
  const found = lowSuggestions(state.dataset?.data_schema).find(
    (suggestion) =>
      suggestion.path === path &&
      suggestion.resolutionType === 'TRANSFORMATION',
  );
  const because = found?.message
    ? ` ${found.message}`
    : ` ${path} looks like personal data.`;

  return {
    step: 'pii',
    text: `${because.trim()} Shall I mask it, encrypt it, or leave it as it is?`,
    card: choice(`What should happen to ${path}?`, [
      {
        label: 'Mask it',
        hint: 'Replaced with a placeholder. Not recoverable.',
        action: { kind: 'set_pii', path, action: 'mask', skipOnFailure: true },
      },
      {
        label: 'Encrypt it',
        hint: 'Recoverable with the key.',
        action: {
          kind: 'set_pii',
          path,
          action: 'encrypt',
          skipOnFailure: true,
        },
      },
      {
        label: 'Leave it',
        action: { kind: 'skip_step', step: 'pii', path },
      },
    ]),
  };
};

const KEEP_DUPLICATES: ChoiceOption = {
  label: 'Keep duplicates',
  action: { kind: 'skip_step', step: 'dedup' },
};

const dedupQuestion = (state: AgendaState): Prompt => {
  const vocabulary = vocabularyFromSchema(state.dataset?.data_schema);
  const eligible = dedupEligiblePaths(vocabulary);
  const candidates = dedupCandidates(state.sampleRows ?? [], eligible);

  if (!candidates.length) {
    // Sample rows expire, so a resumed conversation can reach this question
    // with no evidence at all. Say so rather than offer an unranked list.
    return {
      step: 'dedup',
      text: eligible.length
        ? 'Should duplicate records be dropped? I no longer have the sample, so I cannot tell you which key is unique.'
        : 'Should duplicate records be dropped? No field in this schema can be used as a key.',
      card: choice('Deduplicate on?', [
        ...eligible.map((path) => ({
          label: path,
          action: { kind: 'set_dedup' as const, enabled: true, key: path },
        })),
        KEEP_DUPLICATES,
      ]),
    };
  }

  const [best] = candidates;

  return {
    step: 'dedup',
    text: `Shall I drop duplicate records? ${best.path} is my best guess for the key — ${describeCandidate(best)}.`,
    card: choice('Deduplicate on?', [
      ...candidates.map((candidate) => ({
        label: candidate.path,
        hint: describeCandidate(candidate),
        action: {
          kind: 'set_dedup' as const,
          enabled: true,
          key: candidate.path,
        },
      })),
      KEEP_DUPLICATES,
    ]),
  };
};

const storageQuestion = (): Prompt => ({
  step: 'storage',
  text: 'Where should this data be stored?',
  card: choice('Storage', [
    {
      label: 'Real-time store',
      hint: 'Fast queries over recent data.',
      action: { kind: 'set_storage', realtime: true },
    },
    {
      label: 'Lakehouse',
      hint: 'Cheaper, for history and large scans.',
      action: { kind: 'set_storage', lakehouse: true },
    },
    {
      label: 'Both',
      action: { kind: 'set_storage', realtime: true, lakehouse: true },
    },
  ]),
});

/**
 * The summary shown before saving.
 *
 * Built only from what the document holds, so it cannot promise a setting the
 * server does not have — which is the same rule the narration follows.
 */
const reviewSummary = (state: AgendaState): string[] => {
  const dedup = block(state, 'dedup_config');
  const indexing = (block(state, 'dataset_config').indexing_config ??
    {}) as Record<string, boolean>;
  const properties = (state.dataset?.data_schema?.properties ?? {}) as Record<
    string,
    unknown
  >;
  const stores = [
    indexing.olap_store_enabled && 'real-time',
    indexing.lakehouse_enabled && 'lakehouse',
    indexing.cache_enabled && 'cache',
  ].filter(Boolean);
  const masked = (
    (state.dataset?.transformations_config ?? []) as {
      category?: string;
    }[]
  ).filter((entry) => entry.category === 'pii').length;

  return [
    `Name: ${state.dataset?.name ?? '(unnamed)'}`,
    `Type: ${state.dataset?.type ?? '(unset)'}`,
    `Fields: ${Object.keys(properties).length}`,
    dedup.drop_duplicates === true
      ? `Duplicates: dropped on ${String(dedup.dedup_key)}`
      : 'Duplicates: kept',
    stores.length ? `Storage: ${stores.join(', ')}` : 'Storage: none selected',
    ...(masked ? [`Protected fields: ${masked}`] : []),
  ];
};

const fieldCount = (state: AgendaState): number =>
  Object.keys(
    (state.dataset?.data_schema?.properties ?? {}) as Record<string, unknown>,
  ).length;

/**
 * The schema review.
 *
 * No field table in the card: the preview pane renders the schema already,
 * and two copies of the same table — one of them a turn out of date — is
 * worse than one. So this asks about what is on screen.
 */
const schemaQuestion = (state: AgendaState): Prompt => {
  const edited = appliedActions(state.history).some((action) =>
    SCHEMA_EDIT_KINDS.includes(action.kind),
  );
  const hints = timestampCandidates(state.dataset?.data_schema);

  const opening = edited
    ? 'Anything else to change?'
    : `That is the schema on the right — ${fieldCount(state)} fields. Anything you want to change before we go on?`;

  return {
    step: 'schema',
    text:
      hints.length && !edited
        ? `${opening} The API flagged ${hints.join(' and ')} as a date-time, so I can index on it later.`
        : opening,
    card: choice('Schema', [
      { label: 'Looks right', action: { kind: 'skip_step', step: 'schema' } },
    ]),
  };
};

const validationQuestion = (): Prompt => ({
  step: 'validation',
  text: 'What should happen to fields that are not in the schema?',
  card: choice('Unknown fields', [
    {
      label: 'Reject them',
      hint: 'Only the fields above are accepted.',
      action: { kind: 'set_additional_fields', allow: false },
    },
    {
      label: 'Let them through',
      hint: 'New fields arrive unvalidated.',
      action: { kind: 'set_additional_fields', allow: true },
    },
  ]),
});

const transformQuestion = (): Prompt => ({
  step: 'transform',
  text: 'Do you want to transform any field on the way in? Tell me the field and the expression — I will run it against your sample before sending it.',
  card: choice('Transformations', [
    {
      label: 'No transformations',
      action: { kind: 'skip_step', step: 'transform' },
    },
  ]),
});

/**
 * The denormalisation offer.
 *
 * Decline-only for now: `set_denorm` needs a field, a master dataset and an
 * output field, which is a three-value sub-flow like the connector's. Naming
 * the available masters at least makes the feature discoverable, where before
 * it could only be reached by typing a dataset id from memory. T35 completes
 * it.
 */
const denormQuestion = (state: AgendaState): Prompt => {
  const names = (state.masterDatasets ?? []).map(
    (master) => master.name ?? master.dataset_id,
  );

  return {
    step: 'denorm',
    text: `Do you want to pull fields in from a master dataset? ${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} available.`,
    card: choice('Denormalisation', [
      { label: 'Not now', action: { kind: 'skip_step', step: 'denorm' } },
    ]),
  };
};

const KEY_WORDING: Record<KeySlot, { asks: string; because: string }> = {
  timestamp: {
    asks: 'timestamp',
    because: 'the real-time store partitions by time',
  },
  primary: { asks: 'primary', because: 'it identifies a record' },
  partition: { asks: 'partition', because: 'the lakehouse partitions by it' },
};

/**
 * The key the chosen stores require, one at a time.
 *
 * Which key is asked for is derived from the storage toggles, so it cannot
 * drift from the rule the wizard enforces. Not declinable: the store does not
 * work without it.
 */
const keysQuestion = (state: AgendaState): Prompt => {
  const [slot] = missingKeys(state);
  const vocabulary = vocabularyFromSchema(state.dataset?.data_schema);
  const wording = KEY_WORDING[slot];

  if (slot === 'timestamp') {
    const flagged = timestampCandidates(state.dataset?.data_schema);
    const candidates = dateTimePaths(vocabulary);
    const ordered = [
      ...flagged.filter((path) => candidates.includes(path)),
      ...candidates.filter((path) => !flagged.includes(path)),
    ];

    return {
      step: 'keys',
      text: `Which field is the timestamp? ${_.upperFirst(wording.because)}.`,
      card: choice('Timestamp key', [
        ...ordered.map((path) => ({
          label: path,
          ...(flagged.includes(path)
            ? { hint: 'The API flagged this one as indexable.' }
            : {}),
          action: { kind: 'set_keys' as const, timestamp: path },
        })),
        {
          label: EVENT_ARRIVAL_LABEL,
          hint: 'Uses the time the event reached Obsrv, not a field in your data.',
          action: { kind: 'set_keys', timestamp: EVENT_ARRIVAL_LABEL },
        },
      ]),
    };
  }

  const eligible = storageKeyEligiblePaths(vocabulary);

  return {
    step: 'keys',
    text: `Which field is the ${wording.asks} key? ${_.upperFirst(wording.because)}.`,
    card: choice(`${_.upperFirst(wording.asks)} key`, [
      ...eligible.map((path) => ({
        label: path,
        action:
          slot === 'primary'
            ? ({ kind: 'set_keys', primary: path } as const)
            : ({ kind: 'set_keys', partition: path } as const),
      })),
    ]),
  };
};

const QUESTION: Record<
  AgendaStepId,
  (state: AgendaState) => Prompt | undefined
> = {
  name: nameQuestion,

  type: () => ({
    step: 'type',
    text: 'What kind of data is it?',
    card: choice('Dataset type', [
      ...DATASET_TYPES.map((datasetType) => ({
        label: _.upperFirst(datasetType),
        hint: TYPE_HINTS[datasetType],
        action: { kind: 'set_dataset_type' as const, datasetType },
      })),
    ]),
  }),

  connector: (state) => ({
    step: 'connector',
    text: `Let's set up ${state.connector?.name ?? state.connector?.id}. What are its connection settings?`,
  }),

  sample: (state) => ({
    step: 'sample',
    text: 'Give me a sample of the data — JSON, JSONL or CSV — and I will work out the schema.',
    card: { kind: 'file_drop' },
    // Only offered when the list was actually read: a connector that cannot
    // be listed is a dead end, and offering it wastes a turn.
    chips: (state.connectorsAvailable ?? []).map(
      (connector) => `use ${connector.name ?? connector.id}`,
    ),
  }),

  conflicts: conflictQuestion,
  schema: schemaQuestion,
  pii: piiQuestion,
  validation: validationQuestion,
  transform: transformQuestion,
  denorm: denormQuestion,
  dedup: dedupQuestion,
  storage: storageQuestion,
  keys: keysQuestion,

  review: (state) => ({
    step: 'review',
    text: 'That is everything I need. Shall I save it?',
    card: {
      kind: 'confirm',
      title: 'Save this dataset',
      summary: reviewSummary(state),
      confirmLabel: 'Save',
      confirmAction: { kind: 'save' },
    },
  }),
};

/** The question to ask now, or nothing when the dataset is saved. */
export const nextPrompt = (state: AgendaState): Prompt | undefined => {
  const step = currentStep(state);

  return step ? QUESTION[step](state) : undefined;
};
