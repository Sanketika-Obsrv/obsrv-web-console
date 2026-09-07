/**
 * Pure helpers for the ingestion step: dataset naming and sample handling.
 *
 * Naming mirrors the wizard exactly (`Ingestion.formatDatasetDetails` plus its
 * name regex) so a dataset created through chat gets the same id it would have
 * got through the form.
 */
import _ from 'lodash';

/** Characters the console refuses in a dataset name. */
const INVALID_NAME_CHARS = /[!@#$%^&*()+{}[\]:;<>,?~\\|]/;

export const isValidDatasetName = (name: string): boolean =>
  Boolean(name?.trim()) && !INVALID_NAME_CHARS.test(name);

/** Slug the console derives from a dataset name, e.g. "My Orders" -> "my-orders". */
export const datasetIdFromName = (name: string): string =>
  name.trim().replace(/\s+/g, '-').toLowerCase();

const SCHEMA_SHAPE_KEYS = ['properties', 'items', 'allOf', 'anyOf', 'oneOf'];

/**
 * Whether a parsed upload is a JSON Schema document rather than a data record.
 *
 * Deliberately stricter than the wizard's `isJsonSchema`, which flags any
 * object carrying one of a list of schema keywords. A plain order record with
 * an `items` array trips that check, which is why a wizard-created draft can
 * end up storing `sample_data: { mergedEvent: {} }`. Here a schema must either
 * declare `$schema`, or be an object type whose shape keyword holds an object.
 */
export const looksLikeJsonSchema = (value: unknown): boolean => {
  if (!_.isPlainObject(value)) return false;

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.$schema === 'string') return true;

  if (candidate.type !== 'object' && candidate.type !== 'array') return false;

  return SCHEMA_SHAPE_KEYS.some((key) => _.isPlainObject(candidate[key]));
};

/**
 * Deep-merges the sample rows into one representative event, which is what
 * `sample_data.mergedEvent` stores. Merging every row means fields that only
 * appear on some records still show up.
 */
export const mergeSampleRows = (
  rows: unknown[] | null | undefined,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!_.isPlainObject(row) || looksLikeJsonSchema(row)) return;
    _.merge(merged, row);
  });

  return merged;
};
