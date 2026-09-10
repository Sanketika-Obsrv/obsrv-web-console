/**
 * What a request needs before it can be done, and what to say when it is
 * missing.
 *
 * The executor already refuses an action against a dataset that does not
 * exist, but it refuses in one sentence and only once the request has been
 * turned into an action. Two things go wrong without this module:
 *
 * - "dedup on order_id" before a sample resolves to *nothing*, because
 *   `order_id` is not a field of a dataset with no fields. The honest answer
 *   is not "I did not understand that" — it was understood, it cannot be
 *   done yet — and saying so is the difference between a flow the user can
 *   move around in and one that only works front to back.
 * - A refusal with no way forward leaves the user guessing. Every reply here
 *   names what is missing and what supplies it.
 */
import { Action } from './actions';

/** What the request is waiting on. */
export type Requirement = 'dataset' | 'schema';

export interface AssistantState {
  /** True once there is a dataset document to change. */
  hasDataset: boolean;
  /** True once a schema has been worked out, so fields can be named. */
  hasSchema: boolean;
}

export interface Unmet {
  requirement: Requirement;
  /** What the assistant says: what is missing, and what supplies it. */
  text: string;
}

interface Topic {
  /** How the reply names the request; reads as a sentence subject. */
  label: string;
  /** The same thing mid-sentence, for "did you mean something about …?". */
  subject: string;
  requirement: Requirement;
  kinds: Action['kind'][];
  /**
   * How the topic is asked for in words, for a request that resolved to no
   * action at all. Matching is deliberately narrow: a topic nothing matches
   * falls through to the ordinary "I did not understand" reply, which is a
   * better failure than explaining a prerequisite for something the user
   * never asked about.
   */
  pattern: RegExp;
}

/**
 * Ordered: the first match wins, so the more specific topics come first.
 * "dedup on order_id" is deduplication, not a field edit, even though it
 * names a field.
 */
const TOPICS: Topic[] = [
  {
    label: 'Deduplication',
    subject: 'deduplication',
    requirement: 'schema',
    kinds: ['set_dedup'],
    pattern: /\bdedup\w*|duplicat|same \w+ twice/i,
  },
  {
    label: 'Masking a field',
    subject: 'masking a field',
    requirement: 'schema',
    kinds: ['set_pii'],
    pattern: /\bpii\b|\bmask\b|encrypt|redact/i,
  },
  {
    label: 'A transformation',
    subject: 'a transformation',
    requirement: 'schema',
    kinds: ['add_transformation', 'add_derived_field', 'remove_transformation'],
    pattern: /transform|jsonata|derived field|expression/i,
  },
  {
    label: 'A join to a master dataset',
    subject: 'joining to a master dataset',
    requirement: 'schema',
    kinds: ['set_denorm', 'select_denorm', 'remove_denorm'],
    pattern: /denorm|\bjoin\b|enrich|master dataset/i,
  },
  {
    label: 'A storage key',
    subject: 'the storage keys',
    requirement: 'schema',
    kinds: ['set_keys'],
    pattern: /partition|primary key|timestamp (key|field|column)/i,
  },
  {
    label: 'Editing the fields',
    subject: 'the schema',
    requirement: 'schema',
    kinds: [
      'set_data_type',
      'set_arrival_format',
      'toggle_required',
      'set_description',
      'add_field',
      'delete_field',
      'resolve_conflict',
    ],
    pattern:
      /\brequired\b|\boptional\b|data ?type|\brename\b|(add|remove|delete|drop) (a |the )?\w*\s?field/i,
  },
  {
    label: 'Saving',
    subject: 'saving',
    requirement: 'schema',
    kinds: ['save'],
    pattern: /\bsave\b|\bpublish\b|\bfinish\b/i,
  },
  {
    label: 'Storage',
    subject: 'storage',
    requirement: 'dataset',
    kinds: ['set_storage'],
    pattern: /real[- ]?time store|lakehouse|\bstorage\b|\bdruid\b|\bhudi\b/i,
  },
  {
    label: 'Validation',
    subject: 'validation',
    requirement: 'dataset',
    kinds: ['set_additional_fields'],
    pattern: /validation|extra fields|additional fields/i,
  },
  {
    label: 'A sample',
    subject: 'the sample',
    requirement: 'dataset',
    kinds: ['attach_sample'],
    pattern: /\bsample\b|\bupload\b|\bcsv\b|\bjsonl?\b/i,
  },
  {
    label: 'A connector',
    subject: 'a connector',
    requirement: 'dataset',
    kinds: [
      'select_connector',
      'set_connector_field',
      'request_connector_secrets',
      'skip_connector',
    ],
    pattern: /connector|\bkafka\b|postgres|\bjdbc\b|\bs3\b/i,
  },
];

/** True when the state already satisfies the requirement. */
const met = (requirement: Requirement, state: AssistantState): boolean =>
  requirement === 'dataset'
    ? state.hasDataset
    : state.hasDataset && state.hasSchema;

const explain = (topic: Topic): string =>
  topic.requirement === 'dataset'
    ? `${topic.label} needs a dataset first — tell me its name, and whether it holds event, transaction or master data. Then we can come back to this.`
    : `${topic.label} needs a schema first, so I know which fields you have. Give me a sample of the data — JSON or JSONL — and we can come back to this.`;

const unmetFor = (
  topic: Topic | undefined,
  state: AssistantState,
): Unmet | undefined =>
  topic && !met(topic.requirement, state)
    ? { requirement: topic.requirement, text: explain(topic) }
    : undefined;

/**
 * What this action is waiting on, if anything.
 *
 * Naming and typing the dataset are how it comes to exist, and undo, help
 * and moving between stages are about the conversation rather than the
 * document, so none of them appear in the table and none of them are ever
 * blocked.
 */
export const unmetForAction = (
  action: Action,
  state: AssistantState,
): Unmet | undefined =>
  unmetFor(
    TOPICS.find((topic) => topic.kinds.includes(action.kind)),
    state,
  );

/**
 * What the words are about, when they are about something this flow does.
 *
 * Used to guess at a subject for an instruction that resolved to nothing:
 * naming what the assistant thinks was meant turns a refusal into a
 * question the user can answer with one word.
 */
export const topicOf = (utterance: string): string | undefined =>
  TOPICS.find((topic) => topic.pattern.test(utterance))?.subject;

/**
 * What this request is waiting on, read from the words alone.
 *
 * Used when nothing could be resolved: the field the user named cannot exist
 * yet, which is precisely the case worth explaining rather than shrugging at.
 */
export const unmetForUtterance = (
  utterance: string,
  state: AssistantState,
): Unmet | undefined =>
  unmetFor(
    TOPICS.find((topic) => topic.pattern.test(utterance)),
    state,
  );
