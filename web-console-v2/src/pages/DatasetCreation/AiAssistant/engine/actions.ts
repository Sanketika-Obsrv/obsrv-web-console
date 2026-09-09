/**
 * The assistant's action catalog.
 *
 * Every action maps onto an existing Obsrv API call — the assistant coordinates
 * the current workflow rather than inventing new behaviour.
 *
 * The JSON Schema built here has two jobs, deliberately from one definition:
 * 1. validating whatever the in-browser model emits, and
 * 2. constraining the model's decoding via `response_format`.
 *
 * Path and connector-property slots can be pinned to the real vocabulary of the
 * dataset in play, which is what stops a small model inventing field names.
 */
import Ajv, { ErrorObject, ValidateFunction } from 'ajv';

export const ACTION_KINDS = [
  'set_dataset_name',
  'set_dataset_type',
  'attach_sample',
  'select_connector',
  'set_connector_field',
  'request_connector_secrets',
  'skip_connector',
  'set_data_type',
  'set_arrival_format',
  'toggle_required',
  'set_description',
  'add_field',
  'delete_field',
  'resolve_conflict',
  'set_additional_fields',
  'set_pii',
  'add_transformation',
  'add_derived_field',
  'set_dedup',
  'set_denorm',
  // Undo-only, and reachable no other way: a transformation or a
  // denormalisation is removed to put back a document that did not have it.
  // Both mirror what the wizard's own delete button sends.
  'remove_transformation',
  'remove_denorm',
  'set_storage',
  'set_keys',
  'goto_step',
  'save',
  'explain',
  'clarify',
  'undo',
] as const;

export type ActionKind = (typeof ACTION_KINDS)[number];

/** `arrival_format` values produced by `datasets/dataschema`. */
export const ARRIVAL_FORMATS = [
  'text',
  'number',
  'boolean',
  'object',
  'array',
] as const;

/** Union of every `store_format` in the API's `dataMappings` response. */
export const DATA_TYPES = [
  'string',
  'date-time',
  'date',
  'boolean',
  'epoch',
  'long',
  'double',
  'bigdecimal',
  'integer',
  'float',
  'number',
  'object',
  'array',
] as const;

export const DATASET_TYPES = ['event', 'transaction', 'master'] as const;

export const WIZARD_STEPS = [
  'connector',
  'ingestion',
  'schema',
  'processing',
  'storage',
  'preview',
] as const;

export type ArrivalFormat = (typeof ARRIVAL_FORMATS)[number];
export type DataType = (typeof DATA_TYPES)[number];
export type DatasetType = (typeof DATASET_TYPES)[number];
export type WizardStep = (typeof WIZARD_STEPS)[number];

export type Action =
  | { kind: 'set_dataset_name'; name: string }
  | { kind: 'set_dataset_type'; datasetType: DatasetType }
  | { kind: 'attach_sample'; fileName: string }
  | { kind: 'select_connector'; connectorId: string }
  | {
      kind: 'set_connector_field';
      property: string;
      value: string | number | boolean;
    }
  | { kind: 'request_connector_secrets' }
  | { kind: 'skip_connector' }
  | { kind: 'set_data_type'; path: string; dataType: DataType }
  | { kind: 'set_arrival_format'; path: string; arrivalFormat: ArrivalFormat }
  | { kind: 'toggle_required'; path: string; required: boolean }
  | { kind: 'set_description'; path: string; description: string }
  | {
      kind: 'add_field';
      name: string;
      arrivalFormat: ArrivalFormat;
      dataType: DataType;
      parentPath?: string;
    }
  | { kind: 'delete_field'; path: string }
  | {
      kind: 'resolve_conflict';
      path: string;
      mode: 'apply' | 'dismiss';
      /** Overrides the console's recommendation, which can be lossy. */
      dataType?: DataType;
    }
  | { kind: 'set_additional_fields'; allow: boolean }
  | {
      kind: 'set_pii';
      path: string;
      action: 'mask' | 'encrypt';
      skipOnFailure: boolean;
    }
  | {
      kind: 'add_transformation';
      path: string;
      expression: string;
      skipOnFailure: boolean;
    }
  | {
      kind: 'add_derived_field';
      name: string;
      expression: string;
      skipOnFailure: boolean;
    }
  | { kind: 'set_dedup'; enabled: boolean; key?: string }
  | {
      kind: 'set_denorm';
      path: string;
      masterDatasetId: string;
      outField: string;
    }
  | { kind: 'remove_transformation'; fieldKey: string }
  | { kind: 'remove_denorm'; path: string }
  | {
      kind: 'set_storage';
      lakehouse?: boolean;
      realtime?: boolean;
      cache?: boolean;
    }
  | {
      kind: 'set_keys';
      primary?: string;
      timestamp?: string;
      partition?: string;
    }
  | { kind: 'goto_step'; step: WizardStep }
  | { kind: 'save' }
  | { kind: 'explain'; topic?: string }
  | { kind: 'clarify'; question: string; options?: string[] }
  | { kind: 'undo' };

export interface ActionSchemaOptions {
  /** Restricts every field-path slot to the dataset's real paths. */
  fieldPaths?: string[];
  /** Restricts `set_connector_field` to a connector's non-secret ui_spec keys. */
  connectorProperties?: string[];
}

export type ActionValidationResult =
  { ok: true; action: Action } | { ok: false; errors: string[] };

type JsonSchema = Record<string, unknown>;

const nonEmptyString: JsonSchema = { type: 'string', minLength: 1 };

const variant = (
  kind: ActionKind,
  properties: Record<string, JsonSchema> = {},
  required: string[] = [],
  extra: JsonSchema = {},
): JsonSchema => ({
  type: 'object',
  properties: { kind: { const: kind }, ...properties },
  required: ['kind', ...required],
  additionalProperties: false,
  ...extra,
});

const buildVariants = ({
  fieldPaths,
  connectorProperties,
}: ActionSchemaOptions): JsonSchema[] => {
  const path: JsonSchema = fieldPaths?.length
    ? { type: 'string', enum: fieldPaths }
    : nonEmptyString;

  /**
   * A storage key slot, where the empty string means "clear this key".
   *
   * That is how the console stores a key that is not set, and undo needs to
   * be able to send it: restoring `keys_config` as it was often means putting
   * a key back to unset.
   */
  const keyOrCleared: JsonSchema = { anyOf: [path, { const: '' }] };

  const connectorProperty: JsonSchema = connectorProperties?.length
    ? { type: 'string', enum: connectorProperties }
    : nonEmptyString;

  return [
    variant('set_dataset_name', { name: nonEmptyString }, ['name']),
    variant(
      'set_dataset_type',
      { datasetType: { type: 'string', enum: [...DATASET_TYPES] } },
      ['datasetType'],
    ),
    variant('attach_sample', { fileName: nonEmptyString }, ['fileName']),
    variant('select_connector', { connectorId: nonEmptyString }, [
      'connectorId',
    ]),
    variant(
      'set_connector_field',
      {
        property: connectorProperty,
        value: { type: ['string', 'number', 'boolean'] },
      },
      ['property', 'value'],
    ),
    variant('request_connector_secrets'),
    variant('skip_connector'),
    variant(
      'set_data_type',
      { path, dataType: { type: 'string', enum: [...DATA_TYPES] } },
      ['path', 'dataType'],
    ),
    variant(
      'set_arrival_format',
      { path, arrivalFormat: { type: 'string', enum: [...ARRIVAL_FORMATS] } },
      ['path', 'arrivalFormat'],
    ),
    variant('toggle_required', { path, required: { type: 'boolean' } }, [
      'path',
      'required',
    ]),
    variant('set_description', { path, description: { type: 'string' } }, [
      'path',
      'description',
    ]),
    variant(
      'add_field',
      {
        name: nonEmptyString,
        parentPath: { type: 'string' },
        arrivalFormat: { type: 'string', enum: [...ARRIVAL_FORMATS] },
        dataType: { type: 'string', enum: [...DATA_TYPES] },
      },
      ['name', 'arrivalFormat', 'dataType'],
    ),
    variant('delete_field', { path }, ['path']),
    variant(
      'resolve_conflict',
      {
        path,
        mode: { type: 'string', enum: ['apply', 'dismiss'] },
        dataType: { type: 'string', enum: [...DATA_TYPES] },
      },
      ['path', 'mode'],
    ),
    variant('set_additional_fields', { allow: { type: 'boolean' } }, ['allow']),
    variant(
      'set_pii',
      {
        path,
        action: { type: 'string', enum: ['mask', 'encrypt'] },
        skipOnFailure: { type: 'boolean' },
      },
      ['path', 'action', 'skipOnFailure'],
    ),
    variant(
      'add_transformation',
      {
        path,
        expression: nonEmptyString,
        skipOnFailure: { type: 'boolean' },
      },
      ['path', 'expression', 'skipOnFailure'],
    ),
    variant(
      'add_derived_field',
      {
        name: nonEmptyString,
        expression: nonEmptyString,
        skipOnFailure: { type: 'boolean' },
      },
      ['name', 'expression', 'skipOnFailure'],
    ),
    // A dedup key is only meaningful when deduplication is switched on, and the
    // API rejects `drop_duplicates: true` without one.
    variant(
      'set_dedup',
      { enabled: { type: 'boolean' }, key: path },
      ['enabled'],
      {
        if: { properties: { enabled: { const: true } } },
        then: { required: ['kind', 'enabled', 'key'] },
      },
    ),
    variant(
      'set_denorm',
      { path, masterDatasetId: nonEmptyString, outField: nonEmptyString },
      ['path', 'masterDatasetId', 'outField'],
    ),
    variant('remove_transformation', { fieldKey: nonEmptyString }, [
      'fieldKey',
    ]),
    variant('remove_denorm', { path }, ['path']),
    variant(
      'set_storage',
      {
        lakehouse: { type: 'boolean' },
        realtime: { type: 'boolean' },
        cache: { type: 'boolean' },
      },
      [],
      {
        anyOf: [
          { required: ['lakehouse'] },
          { required: ['realtime'] },
          { required: ['cache'] },
        ],
      },
    ),
    variant(
      'set_keys',
      {
        primary: keyOrCleared,
        timestamp: keyOrCleared,
        partition: keyOrCleared,
      },
      [],
      {
        anyOf: [
          { required: ['primary'] },
          { required: ['timestamp'] },
          { required: ['partition'] },
        ],
      },
    ),
    variant(
      'goto_step',
      { step: { type: 'string', enum: [...WIZARD_STEPS] } },
      ['step'],
    ),
    variant('save'),
    variant('explain', { topic: { type: 'string' } }),
    variant(
      'clarify',
      {
        question: nonEmptyString,
        options: { type: 'array', items: { type: 'string' } },
      },
      ['question'],
    ),
    variant('undo'),
  ];
};

export const buildActionSchema = (
  options: ActionSchemaOptions = {},
): JsonSchema => ({
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'DatasetAssistantAction',
  type: 'object',
  required: ['kind'],
  properties: { kind: { type: 'string', enum: [...ACTION_KINDS] } },
  oneOf: buildVariants(options),
});

const formatError = (error: ErrorObject): string => {
  const target = error.instancePath || '(root)';

  if (error.keyword === 'additionalProperties') {
    const extra = (error.params as { additionalProperty: string })
      .additionalProperty;
    return `${target} has unexpected property "${extra}"`;
  }

  if (error.keyword === 'enum') {
    const allowed = (error.params as { allowedValues: unknown[] })
      .allowedValues;
    return `${target} must be one of: ${allowed.join(', ')}`;
  }

  if (error.keyword === 'required') {
    const missing = (error.params as { missingProperty: string })
      .missingProperty;
    return `${target} is missing required property "${missing}"`;
  }

  return `${target} ${error.message ?? 'is invalid'}`;
};

/**
 * `oneOf` reports a failure for every non-matching variant, which buries the
 * real problem. Keep the errors for the variant whose `kind` was requested.
 */
const relevantErrors = (
  errors: ErrorObject[] | null | undefined,
  value: unknown,
): string[] => {
  const all = errors ?? [];
  const kind =
    typeof value === 'object' && value !== null
      ? (value as { kind?: unknown }).kind
      : undefined;

  const kindIsKnown =
    typeof kind === 'string' &&
    (ACTION_KINDS as readonly string[]).includes(kind);

  if (!kindIsKnown) {
    return [
      typeof kind === 'undefined'
        ? 'Missing required property "kind"'
        : `Unknown action kind "${String(kind)}"`,
    ];
  }

  const specific = all.filter(
    (error) =>
      error.keyword !== 'oneOf' &&
      error.keyword !== 'const' &&
      !(error.keyword === 'enum' && error.instancePath === '/kind'),
  );

  const messages = (specific.length ? specific : all).map(formatError);

  return [...new Set(messages)];
};

/**
 * Keys that only appear on a built schema, never on the options.
 *
 * `ActionSchemaOptions` has none of its fields required, so
 * `createActionValidator(buildActionSchema(opts))` type-checks — and silently
 * produces a validator with *no* vocabulary constraints, which would let a
 * model set a secret connector property. Caught by the secret-leak test;
 * guarded here so it fails loudly rather than quietly.
 */
const SCHEMA_ONLY_KEYS = ['$schema', 'oneOf', 'definitions', 'properties'];

export const createActionValidator = (options: ActionSchemaOptions = {}) => {
  const looksLikeSchema = SCHEMA_ONLY_KEYS.some((key) => key in options);

  if (looksLikeSchema) {
    throw new Error(
      'createActionValidator takes ActionSchemaOptions, not a built schema. ' +
        'Passing a schema would drop every vocabulary constraint, including ' +
        'the one that keeps secret connector properties out of reach.',
    );
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate: ValidateFunction = ajv.compile(buildActionSchema(options));

  return (value: unknown): ActionValidationResult => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { ok: false, errors: ['Action must be a JSON object'] };
    }

    if (validate(value)) return { ok: true, action: value as Action };

    return { ok: false, errors: relevantErrors(validate.errors, value) };
  };
};

/** Convenience validator with no vocabulary constraints. */
export const validateAction = createActionValidator();
