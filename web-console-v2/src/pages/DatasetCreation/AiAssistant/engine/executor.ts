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
import { readDataset, updateDataset } from 'services/datasetApi';
import { Action } from './actions';
import { refFromPath } from './fieldVocabulary';
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

/** Smallest projection that supports a schema edit. */
export const SCHEMA_READ_FIELDS = 'dataset_id,data_schema,version_key';

export interface ExecutorContext {
  datasetId: string;
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
  | string;

export type ExecutionOutcome =
  | { ok: true; dataset: DatasetSnapshot; changedRefs: string[] }
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

export const executeAction = async (
  action: Action,
  context: ExecutorContext,
): Promise<ExecutionOutcome> => {
  if (!isSchemaAction(action)) {
    return failure(
      `Action "${action.kind}" is not wired up yet`,
      'UNSUPPORTED_ACTION',
    );
  }

  let current: DatasetSnapshot;

  try {
    current = await readDataset<DatasetSnapshot>({
      datasetId: context.datasetId,
      fields: SCHEMA_READ_FIELDS,
    });
  } catch (cause) {
    return describeApiError(cause, 'READ_FAILED');
  }

  const dataSchema = current.data_schema;

  if (!dataSchema) {
    return failure(
      `Dataset "${context.datasetId}" has no schema yet — upload a sample first`,
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
    await updateDataset({
      dataset_id: current.dataset_id ?? context.datasetId,
      version_key: current.version_key,
      data_schema: edited.dataSchema,
    });
  } catch (cause) {
    return describeApiError(cause, 'PATCH_FAILED');
  }

  try {
    const refreshed = await readDataset<DatasetSnapshot>({
      datasetId: context.datasetId,
      fields: SCHEMA_READ_FIELDS,
    });

    return { ok: true, dataset: refreshed, changedRefs: edited.changedRefs };
  } catch (cause) {
    return describeApiError(cause, 'READ_FAILED');
  }
};
