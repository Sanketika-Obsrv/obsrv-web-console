/**
 * The reply fixture set the guided flow is measured against.
 *
 * Grouped by the question being answered, because that is the whole claim
 * being tested: the same words mean different things depending on what was
 * asked, and reading them against the question should beat reading them
 * against the whole action surface.
 *
 * Written as replies a person would plausibly type — short, lower case,
 * partial — rather than as the instructions the rule resolver was fitted to.
 * `expected` is `null` where the reply must *not* be read as an answer:
 * those are the false-positive guards, and they matter more than the hit
 * rate, because an answer misread is written to the user's dataset.
 */
import { Action, AgendaStepId } from './actions';

export interface AnswerFixture {
  /** The question on the table when this is typed. */
  step: AgendaStepId;
  utterance: string;
  /** Null when nothing should be written in reply to this. */
  expected: Action | null;
  note?: string;
}

export const ANSWERS: AnswerFixture[] = [
  // — The name —
  {
    step: 'name',
    utterance: 'My Orders',
    expected: { kind: 'set_dataset_name', name: 'My Orders' },
    note: 'The bare answer, which no instruction pattern can match.',
  },
  {
    step: 'name',
    utterance: 'call it My Orders',
    expected: { kind: 'set_dataset_name', name: 'My Orders' },
  },
  {
    step: 'name',
    utterance: 'go with orders_2026',
    expected: { kind: 'set_dataset_name', name: 'orders_2026' },
  },
  {
    step: 'name',
    utterance: 'undo',
    expected: null,
    note: 'The one question that takes prose is the one a command must pass.',
  },
  {
    step: 'name',
    utterance: 'what should I call it?',
    expected: null,
    note: 'A question back is not a name.',
  },

  // — The type —
  {
    step: 'type',
    utterance: 'event',
    expected: { kind: 'set_dataset_type', datasetType: 'event' },
  },
  {
    step: 'type',
    utterance: 'master data',
    expected: { kind: 'set_dataset_type', datasetType: 'master' },
  },
  {
    step: 'type',
    utterance: 'these are transactions',
    expected: { kind: 'set_dataset_type', datasetType: 'transaction' },
  },

  // — A type conflict —
  {
    step: 'conflicts',
    utterance: 'double',
    expected: {
      kind: 'resolve_conflict',
      path: 'amount',
      mode: 'apply',
      dataType: 'double',
    },
  },
  {
    step: 'conflicts',
    utterance: 'make it a string',
    expected: {
      kind: 'resolve_conflict',
      path: 'amount',
      mode: 'apply',
      dataType: 'string',
    },
  },
  {
    step: 'conflicts',
    utterance: 'keep what you have',
    expected: { kind: 'resolve_conflict', path: 'amount', mode: 'dismiss' },
  },
  {
    step: 'conflicts',
    utterance: 'integer',
    expected: null,
    note: 'Not one of the observed types, so choosing it would drop values.',
  },

  // — The schema review —
  {
    step: 'schema',
    utterance: 'looks right',
    expected: { kind: 'skip_step', step: 'schema' },
  },
  {
    step: 'schema',
    utterance: 'make order_id required',
    expected: { kind: 'toggle_required', path: 'order_id', required: true },
  },
  {
    step: 'schema',
    utterance: 'order_ts should be a date-time',
    expected: {
      kind: 'set_data_type',
      path: 'order_ts',
      dataType: 'date-time',
    },
  },
  {
    step: 'schema',
    utterance: 'delete coupon_code',
    expected: { kind: 'delete_field', path: 'coupon_code' },
  },

  // — Personal data —
  {
    step: 'pii',
    utterance: 'mask it',
    expected: {
      kind: 'set_pii',
      path: 'customer_email',
      action: 'mask',
      skipOnFailure: true,
    },
  },
  {
    step: 'pii',
    utterance: 'encrypt customer_email',
    expected: {
      kind: 'set_pii',
      path: 'customer_email',
      action: 'encrypt',
      skipOnFailure: true,
    },
  },
  {
    step: 'pii',
    utterance: 'leave it',
    expected: { kind: 'skip_step', step: 'pii', path: 'customer_email' },
  },
  {
    step: 'pii',
    utterance: 'why do you think that is personal?',
    expected: null,
    note: 'A question about the question changes nothing.',
  },

  // — Unknown fields —
  {
    step: 'validation',
    utterance: 'reject them',
    expected: { kind: 'set_additional_fields', allow: false },
  },
  {
    step: 'validation',
    utterance: 'let them through',
    expected: { kind: 'set_additional_fields', allow: true },
  },
  {
    step: 'validation',
    utterance: 'strict',
    expected: null,
    note: "The console's word for it, which the question does not offer.",
  },

  // — Transformations —
  {
    step: 'transform',
    utterance: 'no transformations',
    expected: { kind: 'skip_step', step: 'transform' },
  },
  {
    step: 'transform',
    utterance: 'none',
    expected: { kind: 'skip_step', step: 'transform' },
  },
  {
    step: 'transform',
    utterance: 'not right now',
    expected: { kind: 'skip_step', step: 'transform' },
  },

  // — Denormalisation —
  {
    step: 'denorm',
    utterance: 'Customers',
    expected: { kind: 'select_denorm', masterDatasetId: 'customers' },
  },
  {
    step: 'denorm',
    utterance: 'yes, customers',
    expected: { kind: 'select_denorm', masterDatasetId: 'customers' },
  },
  {
    step: 'denorm',
    utterance: 'not now',
    expected: { kind: 'skip_step', step: 'denorm' },
  },

  // — Duplicates —
  {
    step: 'dedup',
    utterance: 'order_id',
    expected: { kind: 'set_dedup', enabled: true, key: 'order_id' },
  },
  {
    step: 'dedup',
    utterance: 'drop duplicates on order_id',
    expected: { kind: 'set_dedup', enabled: true, key: 'order_id' },
  },
  {
    step: 'dedup',
    utterance: 'keep duplicates',
    expected: { kind: 'skip_step', step: 'dedup' },
  },
  {
    step: 'dedup',
    utterance: 'no',
    expected: { kind: 'skip_step', step: 'dedup' },
    note: 'Means nothing on its own; means "keep them" right after this.',
  },

  // — Storage —
  {
    step: 'storage',
    utterance: 'real-time',
    // Each option answers the whole question, naming the stores it turns
    // off as well as the one it turns on.
    expected: {
      kind: 'set_storage',
      realtime: true,
      lakehouse: false,
      cache: false,
    },
  },
  {
    step: 'storage',
    utterance: 'lakehouse',
    expected: {
      kind: 'set_storage',
      realtime: false,
      lakehouse: true,
      cache: false,
    },
  },
  {
    step: 'storage',
    utterance: 'both',
    expected: {
      kind: 'set_storage',
      realtime: true,
      lakehouse: true,
      cache: false,
    },
  },
  {
    step: 'storage',
    utterance: 'wherever is cheapest',
    expected: null,
  },

  // — Keys —
  {
    step: 'keys',
    utterance: 'order_ts',
    expected: { kind: 'set_keys', timestamp: 'order_ts' },
  },
  {
    step: 'keys',
    utterance: 'the timestamp is order_ts',
    expected: { kind: 'set_keys', timestamp: 'order_ts' },
  },
  {
    step: 'keys',
    utterance: 'use the arrival time',
    expected: { kind: 'set_keys', timestamp: 'Event Arrival Time' },
  },
  {
    step: 'keys',
    utterance: "i don't know",
    expected: null,
  },

  // — Saving —
  { step: 'review', utterance: 'yes', expected: { kind: 'save' } },
  { step: 'review', utterance: 'save it', expected: { kind: 'save' } },
  {
    step: 'review',
    utterance: 'not yet',
    expected: null,
    note: 'The one question where "no" must not be read as anything.',
  },
];
