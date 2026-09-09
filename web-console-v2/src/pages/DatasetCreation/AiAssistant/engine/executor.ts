/**
 * Executes assistant actions against the existing dataset APIs.
 *
 * Every turn is read → modify → PATCH → read:
 *
 * 1. `readDataset` for the current document and its `version_key`
 * 2. edit a clone of `data_schema` (the write buffer)
 * 3. `updateDataset` with the `version_key` from step 1, so a stale write
 *    fails loudly instead of clobbering a concurrent change
 * 4. `readDataset` again, and return *that* as the result
 *
 * The write buffer is discarded every turn, so the caller can never render
 * local state that has drifted from the server.
 *
 * This module currently wires the schema actions. Remaining kinds return
 * `UNSUPPORTED_ACTION` without touching the API.
 */
import _ from 'lodash';
import { evaluateDataType } from 'pages/DatasetCreation/Processing/utils/dataTypeUtil';
import { getSystemSetting } from 'services/configData';
import {
  UpdateDatasetPayload,
  createDataset,
  datasetExists,
  datasetStatusTransition,
  generateDataSchema,
  generateUploadUrls,
  readDataset,
  updateDataset,
  uploadToPresignedUrl,
} from 'services/datasetApi';
import { setAdditionalProperties } from 'services/json-schema';
import { ValidationMode } from 'types/datasets';
import { Action, DatasetType } from './actions';
import {
  UiSpec,
  connectorConfigPayload,
  fillableProps,
  isSecretProp,
  validateProp,
} from './connectors';
import {
  SESSION_EXPIRED,
  diagnose,
  isEmptyEnvelope,
  storageCapabilities,
} from './errorMap';
import {
  dateTimePaths,
  storageKeyEligiblePaths,
  vocabularyFromSchema,
} from './fieldVocabulary';
import { refFromPath } from './fieldVocabulary';
import {
  datasetIdFromName,
  isValidDatasetName,
  mergeSampleRows,
} from './ingestion';
import {
  DataSchema,
  SchemaEditResult,
  addField,
  deleteField,
  resolveConflict,
  setArrivalFormat,
  setDataType,
  setDescription,
  setRequired,
} from './schemaEditor';
import { inverseOf } from './undo';

/** Smallest projection that supports a schema edit. */
export const SCHEMA_READ_FIELDS = 'dataset_id,data_schema,version_key';

/** Projection carrying the name and type, which undo needs to restore. */
export const NAMED_READ_FIELDS = 'dataset_id,version_key,name,type';

/** Projection covering everything the processing and storage steps touch. */
export const PROCESSING_READ_FIELDS =
  'dataset_id,version_key,type,data_schema,sample_data,validation_config,' +
  'dedup_config,denorm_config,transformations_config,dataset_config';

/**
 * Every assistant write keeps the API's own suggestions.
 *
 * `updateDataset` strips them by default — the wizard's long-standing
 * behaviour — but `suggestions` is where the API reports unresolved MUST-FIX
 * type conflicts and its LOW-severity index and masking hints, and the server
 * does not re-derive them. So one stripped PATCH erases a conflict on a field
 * the user never touched, and nothing ever reports it again. Probed live: a
 * PATCH carrying suggestions is accepted and a re-read preserves them.
 *
 * Routed through one helper rather than an option at five call sites, so a
 * sixth cannot forget.
 */
const patchDatasetDocument = <T = unknown>(payload: UpdateDatasetPayload) =>
  updateDataset<T>(payload, { keepSuggestions: true });

/**
 * The console's label for indexing on ingestion time rather than a schema
 * field. It is stored as this reserved key, which is not part of the schema.
 */
export const EVENT_ARRIVAL_TIME = 'obsrv_meta.syncts';

/** The label the console's timestamp picker shows for that reserved key. */
export const EVENT_ARRIVAL_LABEL = 'Event Arrival Time';

/**
 * Name and type chosen before `datasets/create` has run.
 *
 * The server cannot hold these yet, so the session carries them between turns.
 * This is the one piece of state that legitimately lives client-side, and it
 * disappears the moment the draft exists.
 */
export interface PendingDataset {
  name?: string;
  datasetId?: string;
  datasetType?: DatasetType;
}

export interface SampleUpload {
  file: File;
  /** Parsed rows, used for inference and for `sample_data.mergedEvent`. */
  rows: unknown[];
}

/**
 * The connector chosen for this dataset, and the non-secret values gathered
 * so far.
 *
 * Buffered client-side because a connector is only written once, together
 * with its credentials. `values` never holds a secret — the classifier keeps
 * them out, and they are merged in only by `submitConnector`.
 */
export interface ConnectorDraft {
  id: string;
  name?: string;
  uiSpec?: UiSpec;
  values: Record<string, unknown>;
}

export interface ExecutorContext {
  /** Null until `attach_sample` has created the draft. */
  datasetId: string | null;
  pending?: PendingDataset;
  sample?: SampleUpload;
  connector?: ConnectorDraft;
}

export interface DatasetSnapshot extends Record<string, unknown> {
  dataset_id?: string;
  data_schema?: DataSchema;
  version_key?: string;
}

export type ExecutionFailureCode =
  | 'UNSUPPORTED_ACTION'
  | 'UNKNOWN_FIELD'
  | 'INVALID_EDIT'
  | 'NO_SCHEMA'
  | 'READ_FAILED'
  | 'PATCH_FAILED'
  | 'INVALID_DATASET_NAME'
  | 'DATASET_ID_TAKEN'
  | 'MISSING_DATASET_NAME'
  | 'MISSING_SAMPLE'
  | 'UPLOAD_URL_MISSING'
  | 'CREATE_FAILED'
  | 'INVALID_EXPRESSION'
  | 'INELIGIBLE_DEDUP_KEY'
  | 'INELIGIBLE_STORAGE_KEY'
  | 'INELIGIBLE_TIMESTAMP_KEY'
  | 'NO_STORAGE_SELECTED'
  | 'NO_DATASET'
  | 'NO_CONNECTOR'
  | 'UNKNOWN_CONNECTOR_FIELD'
  | 'INVALID_CONNECTOR_VALUE'
  | 'SECRET_NOT_ALLOWED'
  | 'ID_CHECK_FAILED'
  | string;

export type ExecutionOutcome =
  /** Written to the server; `dataset` is the post-PATCH re-read. */
  | {
      ok: true;
      status: 'applied';
      dataset: DatasetSnapshot;
      changedRefs: string[];
      /** Set when this action created the draft. */
      datasetId?: string;
      /**
       * What would put this change back, computed from the document as it was
       * read *before* the write. Only the pre-write read knows the old value,
       * which is why the inverse is derived here and not from the outcome.
       */
      inverse?: Action[];
      /** Why this change cannot be undone, when it cannot. */
      undoBlocked?: string;
      /** Set when a stale `version_key` forced a re-read and a second attempt. */
      replayed?: boolean;
    }
  /** Accepted, but held client-side because there is no draft to write to yet. */
  | { ok: true; status: 'pending'; pending: PendingDataset }
  /** Local-only, e.g. moving between steps. */
  | { ok: true; status: 'noop' }
  | { ok: false; error: string; code: ExecutionFailureCode };

const failure = (
  error: string,
  code: ExecutionFailureCode,
): ExecutionOutcome => ({ ok: false, error, code });

/**
 * Pulls the API's own error envelope out of an axios rejection. A fuller
 * mapping to user-facing guidance and recovery lands with the error map task.
 */
const describeApiError = (
  cause: unknown,
  fallbackCode: ExecutionFailureCode,
): ExecutionOutcome => {
  const envelope = _.get(cause, ['response', 'data', 'error']) as
    { code?: string; message?: string } | undefined;

  const message =
    envelope?.message ??
    (cause instanceof Error ? cause.message : String(cause));

  return failure(message, envelope?.code ?? fallbackCode);
};

/**
 * What an applied outcome carries about undoing itself: either the actions
 * that reverse it, or the reason it cannot be reversed.
 */
const undoFields = (
  action: Action,
  before: DatasetSnapshot,
): { inverse?: Action[]; undoBlocked?: string } => {
  const inverted = inverseOf(action, before);

  return inverted.ok
    ? { inverse: inverted.actions }
    : { undoBlocked: inverted.reason };
};

/**
 * Reads a dataset and insists on getting an envelope back.
 *
 * With no session the console answers the SPA HTML shell at HTTP 200, so
 * `unwrapResult` resolves to `undefined` instead of throwing. Without this
 * guard the next failure reported would be a misleading `NO_SCHEMA`.
 */
const readSnapshot = async (
  datasetId: string,
  fields: string,
): Promise<DatasetSnapshot> => {
  const result = await readDataset<DatasetSnapshot>({ datasetId, fields });

  if (isEmptyEnvelope(result)) {
    throw Object.assign(new Error('The response carried no API envelope'), {
      response: { data: { error: { code: SESSION_EXPIRED } } },
    });
  }

  return result;
};

/**
 * Runs a read → modify → PATCH → read attempt, repeating it once when the
 * failure is one the assistant can fix by itself.
 *
 * Only a stale `version_key` and a transport error qualify, and repeating is
 * safe precisely because every attempt starts with its own read: the body is
 * rebuilt against the current document rather than resent.
 */
const withReplay = async (
  attempt: () => Promise<ExecutionOutcome>,
): Promise<ExecutionOutcome> => {
  const first = await attempt();

  if (
    first.ok ||
    !diagnose({ code: first.code, error: first.error }).selfHeal
  ) {
    return first;
  }

  const second = await attempt();

  return second.ok && second.status === 'applied'
    ? { ...second, replayed: true }
    : second;
};

type SchemaAction = Extract<
  Action,
  {
    kind:
      | 'set_data_type'
      | 'set_arrival_format'
      | 'toggle_required'
      | 'set_description'
      | 'add_field'
      | 'delete_field'
      | 'resolve_conflict';
  }
>;

const SCHEMA_ACTION_KINDS = new Set<Action['kind']>([
  'set_data_type',
  'set_arrival_format',
  'toggle_required',
  'set_description',
  'add_field',
  'delete_field',
  'resolve_conflict',
]);

const isSchemaAction = (action: Action): action is SchemaAction =>
  SCHEMA_ACTION_KINDS.has(action.kind);

/** The dot path an action names, for existence checks and error messages. */
const targetPath = (action: SchemaAction): string | null => {
  if (action.kind === 'add_field') return action.parentPath ?? null;
  return action.path;
};

const applyEdit = (
  action: SchemaAction,
  dataSchema: DataSchema,
): SchemaEditResult => {
  switch (action.kind) {
    case 'set_data_type':
      return setDataType(dataSchema, refFromPath(action.path), action.dataType);
    case 'set_arrival_format':
      return setArrivalFormat(
        dataSchema,
        refFromPath(action.path),
        action.arrivalFormat,
      );
    case 'toggle_required':
      return setRequired(dataSchema, refFromPath(action.path), action.required);
    case 'set_description':
      return setDescription(
        dataSchema,
        refFromPath(action.path),
        action.description,
      );
    case 'delete_field':
      return deleteField(dataSchema, refFromPath(action.path));
    case 'add_field':
      return addField(
        dataSchema,
        action.parentPath ? refFromPath(action.parentPath) : null,
        action.name,
        action.arrivalFormat,
        action.dataType,
      );
    case 'resolve_conflict':
      return resolveConflict(
        dataSchema,
        refFromPath(action.path),
        action.mode,
        action.dataType,
      );
    default:
      return { ok: false, error: 'Unhandled schema action' };
  }
};

/** Reads the current draft, then PATCHes the given top-level fields. */
const patchDataset = (
  datasetId: string,
  fields: string,
  action: Action,
  build: (current: DatasetSnapshot) => Record<string, unknown>,
): Promise<ExecutionOutcome> =>
  withReplay(async () => {
    let current: DatasetSnapshot;

    try {
      current = await readSnapshot(datasetId, fields);
    } catch (cause) {
      return describeApiError(cause, 'READ_FAILED');
    }

    try {
      await patchDatasetDocument({
        dataset_id: current.dataset_id ?? datasetId,
        version_key: current.version_key,
        ...build(current),
      });
    } catch (cause) {
      return describeApiError(cause, 'PATCH_FAILED');
    }

    try {
      const refreshed = await readSnapshot(datasetId, SCHEMA_READ_FIELDS);
      return {
        ok: true,
        status: 'applied',
        dataset: refreshed,
        changedRefs: [],
        ...undoFields(action, current),
      };
    } catch (cause) {
      return describeApiError(cause, 'READ_FAILED');
    }
  });

/**
 * Whether a dataset id is free.
 *
 * A 404 from `dataset/exists` means free, a success means taken, and anything
 * else means *we could not tell*. Those are three outcomes, not two: the
 * check still fails closed, but the caller must not claim the id is taken
 * when the endpoint simply errored. Reported live, where a 500 produced
 * "A dataset with the id X already exists" for an id that did not exist.
 */
type IdAvailability = 'free' | 'taken' | 'unknown';

const datasetIdAvailability = async (
  datasetId: string,
): Promise<IdAvailability> => {
  try {
    await datasetExists(datasetId);
    return 'taken';
  } catch (cause) {
    const status = _.get(cause, ['response', 'status']);
    if (status === 404) return 'free';
    return 'unknown';
  }
};

const setName = async (
  name: string,
  context: ExecutorContext,
): Promise<ExecutionOutcome> => {
  if (!isValidDatasetName(name)) {
    return failure(
      `"${name}" contains characters that are not allowed in a dataset name`,
      'INVALID_DATASET_NAME',
    );
  }

  if (context.datasetId) {
    // The id is derived from the original name and is immutable after create.
    // `name` and `type` are read so undo knows what to put back.
    return patchDataset(
      context.datasetId,
      NAMED_READ_FIELDS,
      { kind: 'set_dataset_name', name },
      () => ({ name }),
    );
  }

  const datasetId = datasetIdFromName(name);

  const availability = await datasetIdAvailability(datasetId);

  if (availability === 'taken') {
    return failure(
      `A dataset with the id "${datasetId}" already exists`,
      'DATASET_ID_TAKEN',
    );
  }

  if (availability === 'unknown') {
    return failure(
      `I could not check whether the id "${datasetId}" is free — the server did not answer. Try again in a moment.`,
      'ID_CHECK_FAILED',
    );
  }

  return { ok: true, status: 'pending', pending: { name, datasetId } };
};

const setType = (
  datasetType: DatasetType,
  context: ExecutorContext,
): Promise<ExecutionOutcome> => {
  if (!context.datasetId) {
    return Promise.resolve({
      ok: true,
      status: 'pending',
      pending: { datasetType },
    });
  }

  return patchDataset(
    context.datasetId,
    NAMED_READ_FIELDS,
    { kind: 'set_dataset_type', datasetType },
    () => ({ type: datasetType }),
  );
};

const CREATE_READ_FIELDS = 'dataset_id,version_key,name,type,dataset_config';

/**
 * Uploads the sample, runs inference, then creates the draft or replaces the
 * sample on an existing one. Mirrors the wizard's sequence:
 * generate-url -> PUT -> dataschema -> create/update.
 */
const attachSample = async (
  fileName: string,
  context: ExecutorContext,
): Promise<ExecutionOutcome> => {
  if (!context.sample) {
    return failure('No sample file has been provided yet', 'MISSING_SAMPLE');
  }

  let existing: DatasetSnapshot | null = null;

  if (context.datasetId) {
    try {
      existing = await readDataset<DatasetSnapshot>({
        datasetId: context.datasetId,
        fields: CREATE_READ_FIELDS,
      });
    } catch (cause) {
      return describeApiError(cause, 'READ_FAILED');
    }
  }

  const datasetId = context.datasetId ?? context.pending?.datasetId;
  const name = (existing?.name as string | undefined) ?? context.pending?.name;

  // A name is only needed to create; an existing draft already has one.
  if (!datasetId || (!existing && !name)) {
    return failure(
      'Choose a dataset name before attaching a sample',
      'MISSING_DATASET_NAME',
    );
  }

  let filePath: string;

  try {
    const [upload] = await generateUploadUrls([fileName], 'write');

    if (!upload?.preSignedUrl) {
      return failure(
        'The API did not return an upload URL',
        'UPLOAD_URL_MISSING',
      );
    }

    await uploadToPresignedUrl(upload.preSignedUrl, context.sample.file);
    filePath = upload.filePath;
  } catch (cause) {
    return describeApiError(cause, 'PATCH_FAILED');
  }

  let dataSchema: DataSchema;

  try {
    // `config` is mandatory here; omitting it fails DATA_SCHEMA_INVALID_INPUT.
    const inferred = await generateDataSchema<{ schema: DataSchema }>({
      data: context.sample.rows,
      config: { dataset: datasetId },
    });
    dataSchema = inferred.schema;
  } catch (cause) {
    return describeApiError(cause, 'PATCH_FAILED');
  }

  const sampleData = { mergedEvent: mergeSampleRows(context.sample.rows) };
  const datasetType =
    (existing?.type as DatasetType) ?? context.pending?.datasetType ?? 'event';

  if (!existing) {
    try {
      await createDataset({
        name: name as string,
        dataset_id: datasetId,
        type: datasetType,
        dataset_config: {
          keys_config: {},
          indexing_config: {},
          file_upload_path: [filePath],
        },
        connectors_config: [],
        data_schema: dataSchema,
        sample_data: sampleData,
      });
    } catch (cause) {
      return describeApiError(cause, 'CREATE_FAILED');
    }
  } else {
    const config = (existing.dataset_config ?? {}) as Record<string, unknown>;

    try {
      await patchDatasetDocument({
        dataset_id: datasetId,
        version_key: existing.version_key,
        ...(name ? { name } : {}),
        type: datasetType,
        data_schema: dataSchema,
        dataset_config: {
          keys_config: config.keys_config ?? {},
          indexing_config: config.indexing_config ?? {},
          file_upload_path: [filePath],
        },
        sample_data: sampleData,
      });
    } catch (cause) {
      return describeApiError(cause, 'PATCH_FAILED');
    }
  }

  try {
    const refreshed = await readDataset<DatasetSnapshot>({
      datasetId,
      fields: SCHEMA_READ_FIELDS,
    });

    return {
      ok: true,
      status: 'applied',
      dataset: refreshed,
      changedRefs: [],
      datasetId,
      ...undoFields({ kind: 'attach_sample', fileName }, existing ?? {}),
    };
  } catch (cause) {
    return describeApiError(cause, 'READ_FAILED');
  }
};

type TransformationEntry = {
  field_key: string;
  transformation_function: Record<string, unknown>;
  mode: string;
};

/** The console stores "skip the record on failure?" as the transformation mode. */
const modeFor = (skipOnFailure: boolean) =>
  skipOnFailure ? 'Strict' : 'Lenient';

/**
 * `transformations_config` and `denorm_config.denorm_fields` are delta APIs:
 * the PATCH schema requires each item to be `{ value, action }` and rejects a
 * plain array. Replacing an entry means remove-then-upsert, which is what the
 * console sends.
 */
type Delta = { value: Record<string, unknown>; action: 'upsert' | 'remove' };

const upsertDelta = (
  entry: Record<string, unknown>,
  keyName: string,
  existing: unknown,
): Delta[] => {
  const key = entry[keyName];
  const current = (Array.isArray(existing) ? existing : []) as Record<
    string,
    unknown
  >[];
  const alreadyPresent = current.some((item) => item[keyName] === key);
  const removal: Delta[] = alreadyPresent
    ? [{ value: { [keyName]: key }, action: 'remove' }]
    : [];

  return [...removal, { value: entry, action: 'upsert' }];
};

const upsertTransformation = (existing: unknown, entry: TransformationEntry) =>
  upsertDelta(
    entry as unknown as Record<string, unknown>,
    'field_key',
    existing,
  );

const vocabularyOf = (dataSchema: DataSchema | undefined) =>
  vocabularyFromSchema(dataSchema);

/**
 * Runs the expression against `sample_data.mergedEvent` to derive its store
 * type, reusing the wizard's own evaluator. Doubles as a preflight: an
 * expression that will not evaluate never reaches the API.
 */
const datatypeForExpression = async (
  expression: string,
  sampleData: unknown,
): Promise<{ ok: true; datatype: string } | { ok: false; error: string }> => {
  try {
    const evaluated = await evaluateDataType(expression, sampleData);
    return { ok: true, datatype: String(evaluated?.data_type ?? 'string') };
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
};

const requireDataset = (context: ExecutorContext): string | null =>
  context.datasetId ?? null;

/** Reads the processing projection, applies a builder, then PATCHes and re-reads. */
const patchProcessing = (
  datasetId: string,
  action: Action,
  build: (
    current: DatasetSnapshot,
  ) => Promise<Record<string, unknown> | ExecutionOutcome>,
): Promise<ExecutionOutcome> =>
  withReplay(async () => {
    let current: DatasetSnapshot;

    try {
      current = await readSnapshot(datasetId, PROCESSING_READ_FIELDS);
    } catch (cause) {
      return describeApiError(cause, 'READ_FAILED');
    }

    const built = await build(current);

    if ('ok' in built) return built as ExecutionOutcome;

    try {
      await patchDatasetDocument({
        dataset_id: current.dataset_id ?? datasetId,
        version_key: current.version_key,
        ...built,
      });
    } catch (cause) {
      return describeApiError(cause, 'PATCH_FAILED');
    }

    try {
      const refreshed = await readSnapshot(datasetId, PROCESSING_READ_FIELDS);
      return {
        ok: true,
        status: 'applied',
        dataset: refreshed,
        changedRefs: [],
        ...undoFields(action, current),
      };
    } catch (cause) {
      return describeApiError(cause, 'READ_FAILED');
    }
  });

const fieldExists = (current: DatasetSnapshot, path: string) =>
  Boolean(_.get(current.data_schema, refFromPath(path)));

export const executeAction = async (
  action: Action,
  context: ExecutorContext,
): Promise<ExecutionOutcome> => {
  if (action.kind === 'set_dataset_name') {
    return setName(action.name, context);
  }

  if (action.kind === 'set_dataset_type') {
    return setType(action.datasetType, context);
  }

  if (action.kind === 'attach_sample') {
    return attachSample(action.fileName, context);
  }

  if (action.kind === 'goto_step') {
    return { ok: true, status: 'noop' };
  }

  // A decision to leave something alone. Recorded by the caller, sent nowhere:
  // there is no API for "no", and inventing a write to represent one would put
  // a change in the dataset that the user declined to make.
  if (action.kind === 'skip_step') {
    return { ok: true, status: 'noop' };
  }

  const datasetId = requireDataset(context);

  if (
    !datasetId &&
    (action.kind === 'set_additional_fields' ||
      action.kind === 'set_pii' ||
      action.kind === 'add_transformation' ||
      action.kind === 'add_derived_field' ||
      action.kind === 'set_dedup' ||
      action.kind === 'set_denorm' ||
      action.kind === 'remove_transformation' ||
      action.kind === 'remove_denorm' ||
      action.kind === 'set_storage' ||
      action.kind === 'set_keys' ||
      action.kind === 'save')
  ) {
    return failure(
      'There is no dataset yet — attach a sample file first',
      'NO_DATASET',
    );
  }

  if (action.kind === 'set_additional_fields' && datasetId) {
    const mode = action.allow
      ? ValidationMode.IgnoreNewFields
      : ValidationMode.Strict;

    return patchProcessing(datasetId, action, async (current) => ({
      validation_config: { validate: true, mode },
      data_schema: setAdditionalProperties(
        _.cloneDeep(current.data_schema ?? {}),
        mode,
      ),
    }));
  }

  if (action.kind === 'set_pii' && datasetId) {
    return patchProcessing(datasetId, action, async (current) => {
      if (!fieldExists(current, action.path)) {
        return failure(`Unknown field "${action.path}"`, 'UNKNOWN_FIELD');
      }

      return {
        transformations_config: upsertTransformation(
          current.transformations_config,
          {
            field_key: action.path,
            transformation_function: {
              type: action.action,
              expr: action.path,
              datatype: 'string',
              category: 'pii',
            },
            mode: modeFor(action.skipOnFailure),
          },
        ),
      };
    });
  }

  if (action.kind === 'add_transformation' && datasetId) {
    return patchProcessing(datasetId, action, async (current) => {
      if (!fieldExists(current, action.path)) {
        return failure(`Unknown field "${action.path}"`, 'UNKNOWN_FIELD');
      }

      const evaluated = await datatypeForExpression(
        action.expression,
        current.sample_data,
      );

      if (!evaluated.ok) {
        return failure(evaluated.error, 'INVALID_EXPRESSION');
      }

      return {
        transformations_config: upsertTransformation(
          current.transformations_config,
          {
            field_key: action.path,
            transformation_function: {
              type: 'jsonata',
              expr: action.expression,
              datatype: evaluated.datatype,
              category: 'transform',
            },
            mode: modeFor(action.skipOnFailure),
          },
        ),
      };
    });
  }

  if (action.kind === 'add_derived_field' && datasetId) {
    return patchProcessing(datasetId, action, async (current) => {
      const evaluated = await datatypeForExpression(
        action.expression,
        current.sample_data,
      );

      if (!evaluated.ok) {
        return failure(evaluated.error, 'INVALID_EXPRESSION');
      }

      return {
        transformations_config: upsertTransformation(
          current.transformations_config,
          {
            field_key: action.name,
            transformation_function: {
              type: 'jsonata',
              expr: action.expression,
              datatype: evaluated.datatype,
              category: 'derived',
            },
            mode: modeFor(action.skipOnFailure),
          },
        ),
      };
    });
  }

  if (action.kind === 'set_dedup' && datasetId) {
    return patchProcessing(datasetId, action, async (current) => {
      if (action.enabled && action.key) {
        const eligible = storageKeyEligiblePaths(
          vocabularyOf(current.data_schema),
        );

        if (!eligible.includes(action.key)) {
          return failure(
            `"${action.key}" cannot be a dedup key — choose a top-level, non-object field`,
            'INELIGIBLE_DEDUP_KEY',
          );
        }
      }

      return {
        dedup_config: {
          drop_duplicates: action.enabled,
          dedup_key: action.enabled ? action.key : '',
        },
      };
    });
  }

  if (action.kind === 'set_denorm' && datasetId) {
    return patchProcessing(datasetId, action, async (current) => {
      if (!fieldExists(current, action.path)) {
        return failure(`Unknown field "${action.path}"`, 'UNKNOWN_FIELD');
      }

      const config = (current.denorm_config ?? {}) as Record<string, unknown>;

      // Only `denorm_fields` may be sent: the redis settings are
      // server-managed and `denorm_config` is additionalProperties:false.
      return {
        denorm_config: {
          denorm_fields: upsertDelta(
            {
              denorm_key: action.path,
              denorm_out_field: action.outField,
              dataset_id: action.masterDatasetId,
            },
            'denorm_key',
            config.denorm_fields,
          ),
        },
      };
    });
  }

  /**
   * Both removals exist for undo, and both send the delta the wizard's own
   * delete button sends: `{ value: { <key> }, action: 'remove' }`. Nothing
   * else about the block is echoed, because a delta PATCH describes changes
   * rather than the desired array.
   */
  if (action.kind === 'remove_transformation' && datasetId) {
    return patchProcessing(datasetId, action, async () => ({
      transformations_config: [
        { value: { field_key: action.fieldKey }, action: 'remove' },
      ],
    }));
  }

  if (action.kind === 'remove_denorm' && datasetId) {
    return patchProcessing(datasetId, action, async () => ({
      denorm_config: {
        denorm_fields: [
          { value: { denorm_key: action.path }, action: 'remove' },
        ],
      },
    }));
  }

  if (action.kind === 'set_storage' && datasetId) {
    return patchProcessing(datasetId, action, async (current) => {
      const config = (current.dataset_config ?? {}) as Record<string, unknown>;
      const indexing = (config.indexing_config ?? {}) as Record<
        string,
        boolean
      >;
      const isMaster = current.type === 'master';
      const available = storageCapabilities(getSystemSetting('STORAGE_TYPES'));

      // The storage step hides checkboxes for stores the cluster lacks, so
      // asking for one is refused here with a reason rather than sent and
      // rejected as DATASET_UNSUPPORTED_STORAGE_TYPE.
      const refused = (
        [
          ['lakehouse', 'lake_house'],
          ['realtime', 'realtime_store'],
        ] as const
      ).find(([flag]) => action[flag] === true && !available[flag]);

      if (refused) {
        const offered = [
          available.lakehouse ? 'lake_house' : '',
          available.realtime ? 'realtime_store' : '',
        ].filter(Boolean);

        /**
         * Phrased the way the API phrases it, deliberately.
         *
         * The error map already turns this exact sentence into the console's
         * own storage wording *and* derives a corrected `set_storage` to
         * retry with. Writing a nicer message here instead duplicated the
         * labelling and lost the retry, so the path that refuses *before*
         * sending offered less help than the one that let the server refuse.
         * Found by the end-to-end test.
         */
        return failure(
          `The storage type "${refused[1]}" is not available. Please use one of the available storage types: ${offered.join(', ')}`,
          'DATASET_UNSUPPORTED_STORAGE_TYPE',
        );
      }

      const next = {
        olap_store_enabled: available.realtime
          ? (action.realtime ?? indexing.olap_store_enabled ?? false)
          : false,
        // `create` does not validate storage availability but `update` does,
        // so a fresh draft can carry `lakehouse_enabled: true` on a cluster
        // with no lakehouse. Correct that default instead of echoing it, or
        // every later storage write fails for a flag the user never set.
        lakehouse_enabled: available.lakehouse
          ? (action.lakehouse ?? indexing.lakehouse_enabled ?? false)
          : false,
        // The console forces the cache store on for master datasets.
        cache_enabled: isMaster
          ? true
          : (action.cache ?? indexing.cache_enabled ?? false),
      };

      if (
        !next.olap_store_enabled &&
        !next.lakehouse_enabled &&
        !next.cache_enabled
      ) {
        return failure(
          'At least one storage option must stay enabled',
          'NO_STORAGE_SELECTED',
        );
      }

      // `dataset_config` is additionalProperties:false — echoing back the
      // server-added `cache_config` is rejected.
      return {
        dataset_config: {
          file_upload_path: config.file_upload_path,
          indexing_config: next,
          keys_config: config.keys_config ?? {},
        },
      };
    });
  }

  if (action.kind === 'set_keys' && datasetId) {
    return patchProcessing(datasetId, action, async (current) => {
      const vocabulary = vocabularyOf(current.data_schema);
      const config = (current.dataset_config ?? {}) as Record<string, unknown>;
      const keys = (config.keys_config ?? {}) as Record<string, string>;

      const eligible = storageKeyEligiblePaths(vocabulary);

      for (const key of [action.primary, action.partition]) {
        if (key && !eligible.includes(key)) {
          return failure(
            `"${key}" cannot be a storage key — choose a top-level, non-object field`,
            'INELIGIBLE_STORAGE_KEY',
          );
        }
      }

      let timestampKey = keys.timestamp_key ?? '';

      if (action.timestamp) {
        const isArrivalTime =
          action.timestamp === EVENT_ARRIVAL_LABEL ||
          action.timestamp === EVENT_ARRIVAL_TIME;

        if (isArrivalTime) {
          timestampKey = EVENT_ARRIVAL_TIME;
        } else if (dateTimePaths(vocabulary).includes(action.timestamp)) {
          timestampKey = action.timestamp;
        } else {
          return failure(
            `"${action.timestamp}" is not a date-time field — pick one, or use "${EVENT_ARRIVAL_LABEL}"`,
            'INELIGIBLE_TIMESTAMP_KEY',
          );
        }
      }

      /**
       * `indexing_config` is deliberately absent.
       *
       * Setting a key is not changing storage, and echoing the block back
       * meant carrying whatever default the draft arrived with — including
       * `lakehouse_enabled: true` on a cluster with no lakehouse, which the
       * update API rejects. Every `set_keys` then failed for a flag the user
       * never touched. Found by the end-to-end test.
       *
       * Verified against the live API: a `dataset_config` carrying only
       * `keys_config` is accepted, and `indexing_config` is preserved rather
       * than cleared — the update merges the block rather than replacing it.
       */
      return {
        dataset_config: {
          file_upload_path: config.file_upload_path,
          keys_config: {
            data_key: action.primary ?? keys.data_key ?? '',
            partition_key: action.partition ?? keys.partition_key ?? '',
            timestamp_key: timestampKey,
          },
        },
      };
    });
  }

  if (action.kind === 'save' && datasetId) {
    try {
      await datasetStatusTransition(datasetId, 'ReadyToPublish');
    } catch (cause) {
      return describeApiError(cause, 'PATCH_FAILED');
    }

    try {
      const refreshed = await readDataset<DatasetSnapshot>({
        datasetId,
        fields: 'dataset_id,status,version_key',
      });
      return {
        ok: true,
        status: 'applied',
        dataset: refreshed,
        changedRefs: [],
        ...undoFields(action, refreshed),
      };
    } catch (cause) {
      return describeApiError(cause, 'READ_FAILED');
    }
  }

  if (action.kind === 'select_connector') {
    // Existence was established when the list was read; there is nothing to
    // write until the credentials arrive, so this only records the choice.
    return { ok: true, status: 'noop' };
  }

  if (action.kind === 'skip_connector') {
    // A draft with no connector already has none, and `connectors_config` is
    // a delta API on PATCH — an empty array would mean "no changes", not
    // "remove all". So there is nothing to send.
    return { ok: true, status: 'noop' };
  }

  if (action.kind === 'request_connector_secrets') {
    return { ok: true, status: 'noop' };
  }

  if (action.kind === 'set_connector_field') {
    const { connector } = context;

    if (!connector) {
      return failure('No connector has been chosen yet', 'NO_CONNECTOR');
    }

    // The classifier guards the path, not just the property list: a secret
    // must never be settable through an action, because actions are recorded.
    if (isSecretProp(action.property, {})) {
      return failure(
        `${action.property} is a credential and is only ever collected in the secure form`,
        'SECRET_NOT_ALLOWED',
      );
    }

    const prop = fillableProps(connector.uiSpec).find(
      (candidate) => candidate.key === action.property,
    );

    if (!prop) {
      return failure(
        `"${action.property}" is not a property of the ${connector.id} connector`,
        'UNKNOWN_CONNECTOR_FIELD',
      );
    }

    const checked = validateProp(prop, action.value);
    if (!checked.ok) {
      return failure(checked.error, 'INVALID_CONNECTOR_VALUE');
    }

    return { ok: true, status: 'noop' };
  }

  if (!isSchemaAction(action)) {
    return failure(
      `Action "${action.kind}" is not wired up yet`,
      'UNSUPPORTED_ACTION',
    );
  }

  if (!context.datasetId) {
    return failure(
      'There is no dataset yet — attach a sample file first',
      'NO_SCHEMA',
    );
  }

  const datasetIdForSchema = context.datasetId;

  return withReplay(async () => {
    let current: DatasetSnapshot;

    try {
      current = await readSnapshot(datasetIdForSchema, SCHEMA_READ_FIELDS);
    } catch (cause) {
      return describeApiError(cause, 'READ_FAILED');
    }

    const dataSchema = current.data_schema;

    if (!dataSchema) {
      return failure(
        `Dataset "${datasetIdForSchema}" has no schema yet — upload a sample first`,
        'NO_SCHEMA',
      );
    }

    // Named up front so an unknown field reports the user's path, not the ref.
    const path = targetPath(action);
    if (path && !_.get(dataSchema, refFromPath(path))) {
      return failure(`Unknown field "${path}"`, 'UNKNOWN_FIELD');
    }

    const edited = applyEdit(action, dataSchema);
    if (!edited.ok) return failure(edited.error, 'INVALID_EDIT');

    try {
      await patchDatasetDocument({
        dataset_id: current.dataset_id ?? datasetIdForSchema,
        version_key: current.version_key,
        data_schema: edited.dataSchema,
      });
    } catch (cause) {
      return describeApiError(cause, 'PATCH_FAILED');
    }

    try {
      const refreshed = await readSnapshot(
        datasetIdForSchema,
        SCHEMA_READ_FIELDS,
      );

      return {
        ok: true,
        status: 'applied',
        dataset: refreshed,
        changedRefs: edited.changedRefs,
        ...undoFields(action, current),
      };
    } catch (cause) {
      return describeApiError(cause, 'READ_FAILED');
    }
  });
};

/**
 * Writes a connector and its credentials.
 *
 * **Deliberately not an `Action`.** Every action is recorded in the
 * transcript as an audit trail, and the transcript is persisted — so a
 * credential carried by an action would be written to IndexedDB even with
 * scrubbing as a backstop. Making this a direct call means there is no
 * representation of a secret that could be recorded in the first place.
 *
 * The secrets are received, merged into the payload and dropped. Nothing here
 * returns them, and the caller is expected to hold no copy.
 */
export const submitConnector = async (
  datasetId: string,
  connector: ConnectorDraft,
  secrets: Record<string, unknown>,
): Promise<ExecutionOutcome> => {
  let current: DatasetSnapshot;

  try {
    current = await readSnapshot(datasetId, 'dataset_id,version_key');
  } catch (cause) {
    return describeApiError(cause, 'READ_FAILED');
  }

  try {
    await patchDatasetDocument({
      dataset_id: current.dataset_id ?? datasetId,
      version_key: current.version_key,
      connectors_config: connectorConfigPayload({
        datasetId,
        connectorId: connector.id,
        values: connector.values,
        secrets,
        mode: 'update',
      }),
    });
  } catch (cause) {
    return describeApiError(cause, 'PATCH_FAILED');
  }

  try {
    const refreshed = await readSnapshot(datasetId, PROCESSING_READ_FIELDS);
    return { ok: true, status: 'applied', dataset: refreshed, changedRefs: [] };
  } catch (cause) {
    return describeApiError(cause, 'READ_FAILED');
  }
};
