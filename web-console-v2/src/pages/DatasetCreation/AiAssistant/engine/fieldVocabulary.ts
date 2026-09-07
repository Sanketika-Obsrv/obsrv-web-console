/**
 * The assistant's field vocabulary.
 *
 * `GET /api/web-console/generate-fields/:id` returns top-level entries that
 * carry `column`/`ref`, with nested fields hanging off `properties` keyed by
 * name. This module flattens that into dot paths, which serve two purposes:
 * they become the enum that constrains the model's path slots, and they back
 * the fuzzy resolver that turns "email" into `customer.email`.
 *
 * Arrays stay opaque (`items`, not `items[].sku`) because every picker in the
 * wizard treats them that way; exposing sub-paths would let the assistant
 * offer fields the API will not accept.
 */
import { matchSorter } from 'match-sorter';
import { SchemaField } from 'services/datasetApi';

export interface VocabularyEntry {
  /** Dot path, e.g. `customer.address.city`. */
  path: string;
  /** JSON Schema pointer, e.g. `properties.customer.properties.address`. */
  ref: string;
  /** Final path segment. */
  name: string;
  dataType?: string;
  arrivalFormat?: string;
  /** False for objects, which only exist to hold children. */
  isLeaf: boolean;
  /** 1 for top-level fields. */
  depth: number;
}

export interface FieldVocabulary {
  paths: string[];
  entries: VocabularyEntry[];
  byPath: Record<string, VocabularyEntry>;
}

export type FieldResolution =
  | { status: 'exact'; path: string }
  | { status: 'fuzzy'; path: string }
  | { status: 'ambiguous'; candidates: string[] }
  | { status: 'unknown' };

const MAX_CANDIDATES = 5;

interface RawField {
  column?: string;
  key?: string;
  ref?: string;
  type?: string;
  data_type?: string;
  arrival_format?: string;
  properties?: Record<string, RawField>;
}

/** Strips case and separators so "Order ID", "order_id" and "orderId" agree. */
const normalise = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '');

const isObjectField = (field: RawField) =>
  field.data_type === 'object' || field.type === 'object';

const collect = (
  field: RawField,
  parentPath: string,
  parentRef: string,
  depth: number,
  into: VocabularyEntry[],
) => {
  const name = field.column?.split('.').pop() ?? field.key;
  if (!name) return;

  const path = parentPath ? `${parentPath}.${name}` : name;
  const ref = field.ref ?? `${parentRef}properties.${name}`;

  into.push({
    path,
    ref,
    name,
    dataType: field.data_type,
    arrivalFormat: field.arrival_format,
    isLeaf: !isObjectField(field),
    depth,
  });

  if (!field.properties) return;

  Object.values(field.properties).forEach((child) =>
    collect(child, path, `${ref}.`, depth + 1, into),
  );
};

export const buildFieldVocabulary = (
  fields: SchemaField[] | null | undefined,
): FieldVocabulary => {
  const entries: VocabularyEntry[] = [];

  (Array.isArray(fields) ? (fields as unknown as RawField[]) : []).forEach(
    (field) => collect(field, '', '', 1, entries),
  );

  return {
    entries,
    paths: entries.map((entry) => entry.path),
    byPath: Object.fromEntries(entries.map((entry) => [entry.path, entry])),
  };
};

/**
 * Turns a dot path into the JSON Schema ref the API uses, matching the wizard's
 * own derivation in `services/dataset.formatNewFields`.
 */
export const refFromPath = (path: string): string =>
  path
    .split('.')
    .filter(Boolean)
    .map((segment) => `properties.${segment}`)
    .join('.');

const uniquePaths = (entries: VocabularyEntry[]) => [
  ...new Set(entries.map((entry) => entry.path)),
];

export const resolveField = (
  vocabulary: FieldVocabulary,
  term: string,
): FieldResolution => {
  const needle = normalise(term ?? '');
  if (!needle) return { status: 'unknown' };

  const exactPath = vocabulary.entries.filter(
    (entry) => normalise(entry.path) === needle,
  );
  if (exactPath.length === 1)
    return { status: 'exact', path: exactPath[0].path };

  const exactName = vocabulary.entries.filter(
    (entry) => normalise(entry.name) === needle,
  );
  if (exactName.length === 1)
    return { status: 'exact', path: exactName[0].path };
  if (exactName.length > 1) {
    return { status: 'ambiguous', candidates: uniquePaths(exactName) };
  }

  const ranked = matchSorter(vocabulary.entries, term.trim(), {
    keys: ['path', 'name'],
    threshold: matchSorter.rankings.CONTAINS,
  });

  if (!ranked.length) return { status: 'unknown' };
  if (ranked.length === 1) return { status: 'fuzzy', path: ranked[0].path };

  return {
    status: 'ambiguous',
    candidates: uniquePaths(ranked).slice(0, MAX_CANDIDATES),
  };
};

/**
 * Dedup keys: top-level, not an object, not a date-time.
 *
 * Verified against the live console — the picker excluded every nested path and
 * `order_ts`, while still offering booleans and arrays.
 */
export const dedupEligiblePaths = (vocabulary: FieldVocabulary): string[] =>
  vocabulary.entries
    .filter(
      (entry) =>
        entry.depth === 1 && entry.isLeaf && entry.dataType !== 'date-time',
    )
    .map((entry) => entry.path);

/** Primary and partition key pickers offered exactly the dedup list. */
export const storageKeyEligiblePaths = dedupEligiblePaths;

/** The sensitive-field picker offered every leaf, nested paths included. */
export const piiEligiblePaths = (vocabulary: FieldVocabulary): string[] =>
  vocabulary.entries.filter((entry) => entry.isLeaf).map((entry) => entry.path);

/**
 * Date-time fields at any depth.
 *
 * The wizard's timestamp-key picker additionally offers "Event Arrival Time"
 * (`obsrv_meta.syncts`), which is not part of the dataset schema. The exact
 * option list for that picker has not been verified yet.
 */
export const dateTimePaths = (vocabulary: FieldVocabulary): string[] =>
  vocabulary.entries
    .filter((entry) => entry.dataType === 'date-time')
    .map((entry) => entry.path);
