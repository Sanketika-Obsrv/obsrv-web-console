/**
 * The utterance fixture set the rule resolver is measured against.
 *
 * These are phrasings a person would plausibly type at each step, written
 * before the resolver so the patterns are fitted to the utterances rather than
 * the other way round. `expected` is `null` where the utterance *must not*
 * resolve: those are the false-positive guards, and they matter more than the
 * hit rate — acting on a misread instruction is worse than asking.
 */
import { Action } from './actions';

export interface UtteranceFixture {
  utterance: string;
  /** Null when the resolver must decline rather than guess. */
  expected: Action | null;
  /** Set when declining should offer candidates instead of nothing. */
  ambiguous?: boolean;
  note?: string;
}

export const UTTERANCES: UtteranceFixture[] = [
  // — Naming and type —
  {
    utterance: 'call it My Orders',
    expected: { kind: 'set_dataset_name', name: 'My Orders' },
  },
  {
    utterance: 'name the dataset Customer Orders 2024',
    expected: { kind: 'set_dataset_name', name: 'Customer Orders 2024' },
  },
  {
    utterance: "it's event data",
    expected: { kind: 'set_dataset_type', datasetType: 'event' },
  },
  {
    utterance: 'this is master data',
    expected: { kind: 'set_dataset_type', datasetType: 'master' },
  },
  {
    utterance: 'these are transactions',
    expected: { kind: 'set_dataset_type', datasetType: 'transaction' },
  },

  // — Schema: datatype —
  {
    utterance: 'make total_amount a double',
    expected: {
      kind: 'set_data_type',
      path: 'total_amount',
      dataType: 'double',
    },
  },
  {
    utterance: 'order_id should be a string',
    expected: { kind: 'set_data_type', path: 'order_id', dataType: 'string' },
  },
  {
    utterance: 'set order_ts to date-time',
    expected: {
      kind: 'set_data_type',
      path: 'order_ts',
      dataType: 'date-time',
    },
  },
  {
    utterance: 'change the type of channel to string',
    expected: { kind: 'set_data_type', path: 'channel', dataType: 'string' },
  },

  // — Schema: arrival format —
  {
    utterance: 'total_amount arrives as number',
    expected: {
      kind: 'set_arrival_format',
      path: 'total_amount',
      arrivalFormat: 'number',
    },
  },

  // — Schema: required, description, add, delete —
  {
    utterance: 'make order_id required',
    expected: { kind: 'toggle_required', path: 'order_id', required: true },
  },
  {
    utterance: 'channel is optional',
    expected: { kind: 'toggle_required', path: 'channel', required: false },
  },
  {
    utterance: 'describe order_id as the order identifier',
    expected: {
      kind: 'set_description',
      path: 'order_id',
      description: 'the order identifier',
    },
  },
  {
    utterance: 'delete the coupon_code field',
    expected: { kind: 'delete_field', path: 'coupon_code' },
  },
  {
    utterance: 'remove channel',
    expected: { kind: 'delete_field', path: 'channel' },
  },

  // — Schema: conflicts —
  {
    utterance: 'resolve total_amount as double',
    expected: {
      kind: 'resolve_conflict',
      path: 'total_amount',
      mode: 'apply',
      dataType: 'double',
    },
  },
  {
    utterance: 'keep the current type for total_amount',
    expected: {
      kind: 'resolve_conflict',
      path: 'total_amount',
      mode: 'dismiss',
    },
  },

  // — Processing: additional fields —
  {
    utterance: 'allow extra fields',
    expected: { kind: 'set_additional_fields', allow: true },
  },
  {
    utterance: 'reject unknown fields',
    expected: { kind: 'set_additional_fields', allow: false },
  },

  // — Processing: PII —
  {
    utterance: 'mask customer.email',
    expected: {
      kind: 'set_pii',
      path: 'customer.email',
      action: 'mask',
      skipOnFailure: true,
    },
  },
  {
    utterance: 'encrypt the email',
    expected: {
      kind: 'set_pii',
      path: 'customer.email',
      action: 'encrypt',
      skipOnFailure: true,
    },
    note: '"email" is the unique leaf name of customer.email',
  },

  // — Processing: dedup —
  {
    utterance: 'dedup on order_id',
    expected: { kind: 'set_dedup', enabled: true, key: 'order_id' },
  },
  {
    utterance: 'drop duplicates using order_id',
    expected: { kind: 'set_dedup', enabled: true, key: 'order_id' },
  },
  {
    utterance: 'no deduplication',
    expected: { kind: 'set_dedup', enabled: false },
  },

  // — Storage —
  {
    utterance: 'enable the lakehouse',
    expected: { kind: 'set_storage', lakehouse: true },
  },
  {
    utterance: 'turn off the cache',
    expected: { kind: 'set_storage', cache: false },
  },
  {
    utterance: 'use the real-time store',
    expected: { kind: 'set_storage', realtime: true },
  },

  // — Keys —
  {
    utterance: 'primary key is order_id',
    expected: { kind: 'set_keys', primary: 'order_id' },
  },
  {
    utterance: 'partition by channel',
    expected: { kind: 'set_keys', partition: 'channel' },
  },
  {
    utterance: 'use order_ts as the timestamp',
    expected: { kind: 'set_keys', timestamp: 'order_ts' },
  },

  // — Navigation, save, meta —
  {
    utterance: 'go to storage',
    expected: { kind: 'goto_step', step: 'storage' },
  },
  {
    utterance: 'take me back to the schema',
    expected: { kind: 'goto_step', step: 'schema' },
  },
  { utterance: 'save it', expected: { kind: 'save' } },
  { utterance: "I'm done", expected: { kind: 'save' } },
  { utterance: 'undo that', expected: { kind: 'undo' } },
  {
    utterance: 'what does dedup mean?',
    expected: { kind: 'explain', topic: 'dedup' },
  },
  { utterance: 'skip the connector', expected: { kind: 'skip_connector' } },

  // — Must not resolve —
  {
    utterance: 'make the thing better',
    expected: null,
    note: 'no field, no action — must ask rather than guess',
  },
  {
    utterance: 'set id to string',
    expected: null,
    ambiguous: true,
    note: '"id" matches both order_id and customer.customer_id',
  },
  {
    utterance: 'make sku an integer',
    expected: null,
    note: 'items[].sku is not in the vocabulary; arrays stay opaque',
  },
  {
    utterance: 'delete everything',
    expected: null,
    note: 'a destructive verb with no field must never resolve',
  },
  {
    utterance: 'make total_amount a widget',
    expected: null,
    note: 'not a datatype the API accepts',
  },
];
