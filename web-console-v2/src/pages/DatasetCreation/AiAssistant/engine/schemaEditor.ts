/**
 * Pure edits to a dataset's `data_schema`.
 *
 * Fields are addressed by the `ref` the vocabulary derives — the same dotted
 * pointer the API itself uses in `suggestions[].path`, e.g.
 * `properties.customer.properties.email`.
 *
 * The schema is mutated in place on a clone and returned whole, rather than
 * being flattened to rows and rebuilt. The wizard rebuilds
 * (`SchemaDetails.objectTransformation`), which forces every key it does not
 * know about through a destructure; editing the document directly keeps the
 * round-trip guarantee that `datasets/update` needs, since the PATCH replaces
 * `data_schema` wholesale.
 */
import _ from 'lodash';
import { ArrivalFormat } from './actions';
import {
  isDataTypeAllowed,
  jsonSchemaTypeFor,
  resolveTypeChange,
} from './dataMappings';

export type DataSchema = Record<string, unknown>;

export type SchemaEditResult =
  | { ok: true; dataSchema: DataSchema; changedRefs: string[] }
  | { ok: false; error: string };

export interface ConflictOptions {
  current?: string;
  candidates: string[];
  counts: Record<string, number> | null;
  /** What the console's own "Recommended Change" button offers. */
  recommended?: string;
  /** Widest candidate, i.e. the one that can hold every observed value. */
  safest?: string;
  /** True when following the recommendation would narrow observed values. */
  recommendationIsLossy: boolean;
  /** How many observed values the recommendation would narrow, when known. */
  valuesAtRisk: number | null;
}

interface SchemaField extends Record<string, unknown> {
  type?: string;
  data_type?: string;
  arrival_format?: string;
  properties?: Record<string, SchemaField>;
  oneof?: { type?: string }[];
  suggestions?: {
    message?: string;
    resolutionType?: string;
    severity?: string;
  }[];
}

const ok = (
  dataSchema: DataSchema,
  changedRefs: string[],
): SchemaEditResult => ({
  ok: true,
  dataSchema,
  changedRefs,
});

const fail = (error: string): SchemaEditResult => ({ ok: false, error });

const fieldAt = (
  dataSchema: DataSchema,
  ref: string,
): SchemaField | undefined => _.get(dataSchema, ref) as SchemaField | undefined;

/** Every edit works on a clone so callers can diff before and after. */
const edit = (
  dataSchema: DataSchema,
  ref: string,
  mutate: (field: SchemaField, draft: DataSchema) => string | null,
): SchemaEditResult => {
  const draft = _.cloneDeep(dataSchema);
  const field = fieldAt(draft, ref);

  if (!field) return fail(`No field found at "${ref}"`);

  const error = mutate(field, draft);
  if (error) return fail(error);

  field.isModified = true;

  return ok(draft, [ref]);
};

export const setDataType = (
  dataSchema: DataSchema,
  ref: string,
  dataType: string,
): SchemaEditResult =>
  edit(dataSchema, ref, (field) => {
    const change = resolveTypeChange(field.arrival_format, dataType);
    if (!change) return `No arrival format accepts the data type "${dataType}"`;

    field.arrival_format = change.arrivalFormat;
    field.data_type = change.dataType;
    field.type = change.type;

    return null;
  });

export const setArrivalFormat = (
  dataSchema: DataSchema,
  ref: string,
  arrivalFormat: ArrivalFormat,
): SchemaEditResult =>
  edit(dataSchema, ref, (field) => {
    const dataType = field.data_type;

    if (!dataType || !isDataTypeAllowed(arrivalFormat, dataType)) {
      return `Arrival format "${arrivalFormat}" cannot hold data type "${dataType}"`;
    }

    field.arrival_format = arrivalFormat;
    field.type = jsonSchemaTypeFor(arrivalFormat, dataType) as string;

    return null;
  });

export const setRequired = (
  dataSchema: DataSchema,
  ref: string,
  required: boolean,
): SchemaEditResult =>
  edit(dataSchema, ref, (field) => {
    field.isRequired = required;
    return null;
  });

export const setDescription = (
  dataSchema: DataSchema,
  ref: string,
  description: string,
): SchemaEditResult =>
  edit(dataSchema, ref, (field) => {
    if (description) field.description = description;
    else delete field.description;

    return null;
  });

export const deleteField = (
  dataSchema: DataSchema,
  ref: string,
): SchemaEditResult => {
  const draft = _.cloneDeep(dataSchema);

  if (!fieldAt(draft, ref)) return fail(`No field found at "${ref}"`);

  _.unset(draft, ref);

  return ok(draft, [ref]);
};

export const addField = (
  dataSchema: DataSchema,
  parentRef: string | null,
  name: string,
  arrivalFormat: ArrivalFormat,
  dataType: string,
): SchemaEditResult => {
  const type = jsonSchemaTypeFor(arrivalFormat, dataType);
  if (!type) {
    return fail(
      `Arrival format "${arrivalFormat}" cannot hold data type "${dataType}"`,
    );
  }

  const draft = _.cloneDeep(dataSchema);

  if (parentRef) {
    const parent = fieldAt(draft, parentRef);
    if (!parent) return fail(`No field found at "${parentRef}"`);
    if (parent.data_type !== 'object' && parent.type !== 'object') {
      return fail(`Field at "${parentRef}" is not an object`);
    }
    if (!parent.properties) parent.properties = {};
  }

  const containerRef = parentRef ? `${parentRef}.properties` : 'properties';
  const ref = `${containerRef}.${name}`;

  if (fieldAt(draft, ref)) return fail(`Field "${name}" already exists`);

  _.set(draft, ref, {
    key: name,
    type,
    arrival_format: arrivalFormat,
    data_type: dataType,
    isRequired: false,
    isModified: true,
    resolved: true,
  });

  return ok(draft, [ref]);
};

/**
 * How much each store format can hold, widest first.
 *
 * "Safest" is the widest candidate rather than the most frequent one: for a
 * field seen as 108 doubles and 12 strings, `string` keeps every value while
 * `double` would reject twelve of them.
 */
const WIDENING_RANK: Record<string, number> = {
  string: 100,
  bigdecimal: 80,
  double: 70,
  number: 70,
  float: 60,
  long: 50,
  epoch: 45,
  integer: 40,
  'date-time': 30,
  date: 25,
  boolean: 10,
  object: 5,
  array: 5,
};

const widest = (candidates: string[]): string | undefined =>
  [...candidates].sort(
    (a, b) => (WIDENING_RANK[b] ?? 0) - (WIDENING_RANK[a] ?? 0),
  )[0];

const dataTypeConflict = (field: SchemaField | undefined) =>
  field?.suggestions?.find(
    (suggestion) =>
      suggestion.resolutionType === 'DATA_TYPE' &&
      suggestion.severity === 'MUST-FIX',
  );

/**
 * Pulls occurrence counts out of the conflict message, which is the only place
 * the API reports them, e.g. "double: 108 time(s), string: 12 time(s)".
 */
export const parseConflictCounts = (
  message: string | undefined,
): Record<string, number> | null => {
  if (!message) return null;

  const counts: Record<string, number> = {};
  const pattern = /([A-Za-z][\w-]*)\s*:\s*(\d+)\s*time\(s\)/g;
  let match = pattern.exec(message);

  while (match) {
    counts[match[1]] = Number(match[2]);
    match = pattern.exec(message);
  }

  return Object.keys(counts).length ? counts : null;
};

/** Refs of every field with an unresolved MUST-FIX data-type conflict. */
export const unresolvedConflicts = (dataSchema: DataSchema): string[] => {
  const refs: string[] = [];

  const walk = (properties: Record<string, SchemaField>, prefix: string) => {
    Object.entries(properties).forEach(([name, field]) => {
      const ref = `${prefix}properties.${name}`;

      if (dataTypeConflict(field) && field.resolved !== true) refs.push(ref);
      if (field.properties) walk(field.properties, `${ref}.`);
    });
  };

  const root = (dataSchema as { properties?: Record<string, SchemaField> })
    .properties;
  if (root) walk(root, '');

  return refs;
};

export const conflictOptions = (
  dataSchema: DataSchema,
  ref: string,
): ConflictOptions | null => {
  const field = fieldAt(dataSchema, ref);
  const conflict = dataTypeConflict(field);

  if (!field || !conflict) return null;

  const candidates = (field.oneof ?? [])
    .map((entry) => entry.type)
    .filter((type): type is string => Boolean(type));
  const counts = parseConflictCounts(conflict.message);

  // The console offers the candidate that is not the current type, which is
  // why a 119-double / 1-integer field gets "Change Data Type to Integer".
  const recommended =
    candidates.find((candidate) => candidate !== field.data_type) ??
    candidates[0];

  const safest = widest(candidates) ?? recommended;
  const recommendationIsLossy = Boolean(
    recommended && safest && recommended !== safest,
  );

  return {
    current: field.data_type,
    candidates,
    counts,
    recommended,
    safest,
    recommendationIsLossy,
    // Values held by the wider type that the recommendation would narrow.
    valuesAtRisk:
      recommendationIsLossy && counts && safest
        ? (counts[safest] ?? null)
        : null,
  };
};

export const resolveConflict = (
  dataSchema: DataSchema,
  ref: string,
  mode: 'apply' | 'dismiss',
  dataType?: string,
): SchemaEditResult => {
  const options = conflictOptions(dataSchema, ref);

  if (!options) return fail(`Field at "${ref}" has no data-type conflict`);

  if (mode === 'dismiss') {
    return edit(dataSchema, ref, (field) => {
      field.resolved = true;
      return null;
    });
  }

  const target = dataType ?? options.recommended;
  if (!target) return fail(`No data type to apply for "${ref}"`);

  const applied = setDataType(dataSchema, ref, target);
  if (!applied.ok) return applied;

  return edit(applied.dataSchema, ref, (field) => {
    field.resolved = true;
    field.disableActions = true;
    return null;
  });
};
