/**
 * Turns an action that was applied into the action that puts it back.
 *
 * Undo is expressed in the same action vocabulary as everything else, and
 * re-PATCHed through the same executor. That is a deliberate constraint
 * rather than a convenience:
 *
 * - the inverse is small enough to live in the transcript, so undo survives a
 *   reload without caching any part of the dataset document, and
 * - an undo is auditable in exactly the way an instruction is, because it *is*
 *   one.
 *
 * The cost is that some changes have no inverse the vocabulary can express —
 * rebuilding a deleted object with its children, un-resolving a conflict,
 * restoring a transformation that was replaced. Those are refused with the
 * reason, which is honest, rather than half-applied and reported as restored.
 *
 * Every inverse is computed from the document as it was read *before* the
 * write, which is why this is called from inside the executor's read → modify
 * → PATCH sequence rather than from the outcome.
 */
import _ from 'lodash';
import {
  ARRIVAL_FORMATS,
  Action,
  ArrivalFormat,
  DATA_TYPES,
  DATASET_TYPES,
  DataType,
  DatasetType,
} from './actions';
import { resolveTypeChange } from './dataMappings';
import { DatasetSnapshot } from './executor';
import { refFromPath } from './fieldVocabulary';
import type { Message } from '../session/types';

export type Inversion =
  { ok: true; actions: Action[] } | { ok: false; reason: string };

const invertible = (...actions: Action[]): Inversion => ({
  ok: true,
  actions,
});

const refuse = (reason: string): Inversion => ({ ok: false, reason });

interface SchemaField extends Record<string, unknown> {
  arrival_format?: string;
  data_type?: string;
  description?: string;
  isRequired?: boolean;
  properties?: Record<string, unknown>;
}

const fieldAt = (
  before: DatasetSnapshot,
  path: string,
): SchemaField | undefined =>
  _.get(before.data_schema, refFromPath(path)) as SchemaField | undefined;

const asDataType = (value: unknown): DataType | undefined =>
  (DATA_TYPES as readonly string[]).includes(value as string)
    ? (value as DataType)
    : undefined;

const asArrivalFormat = (value: unknown): ArrivalFormat | undefined =>
  (ARRIVAL_FORMATS as readonly string[]).includes(value as string)
    ? (value as ArrivalFormat)
    : undefined;

const block = (
  before: DatasetSnapshot,
  name: string,
): Record<string, unknown> => (before[name] ?? {}) as Record<string, unknown>;

const entries = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

/** The last segment of a path, which is the field's own name. */
const nameOf = (path: string): string => path.split('.').slice(-1)[0];

const parentOf = (path: string): string | undefined => {
  const segments = path.split('.');
  return segments.length > 1 ? segments.slice(0, -1).join('.') : undefined;
};

const invertSetDataType = (
  path: string,
  requested: DataType,
  before: DatasetSnapshot,
): Inversion => {
  const field = fieldAt(before, path);
  const priorType = asDataType(field?.data_type);
  const priorArrival = asArrivalFormat(field?.arrival_format);

  if (!field || !priorType) {
    return refuse(`I do not know what data type "${path}" had before.`);
  }

  const restore: Action = { kind: 'set_data_type', path, dataType: priorType };

  /**
   * A store format the current arrival bucket cannot hold moves the field to
   * another bucket, so restoring the store format alone can leave a pairing
   * the field never had: a `number`/`integer` field changed to `date-time`
   * lands in `text`, and setting `integer` back keeps it there.
   *
   * The two `resolveTypeChange` calls replay that — where the write left the
   * field, and where restoring the store format from there would land. The
   * arrival format is fixed second, because the check `setArrivalFormat`
   * applies only passes once the store format is back.
   */
  const afterWrite = resolveTypeChange(
    field.arrival_format,
    requested,
  )?.arrivalFormat;
  const landsOn = resolveTypeChange(afterWrite, priorType)?.arrivalFormat;

  return priorArrival && landsOn !== priorArrival
    ? invertible(restore, {
        kind: 'set_arrival_format',
        path,
        arrivalFormat: priorArrival,
      })
    : invertible(restore);
};

const invertDeleteField = (
  path: string,
  before: DatasetSnapshot,
): Inversion => {
  const field = fieldAt(before, path);

  if (!field) return refuse(`"${path}" was not in the dataset I read.`);

  if (field.properties && Object.keys(field.properties).length > 0) {
    return refuse(
      `"${path}" has fields under it, and adding a field back one at a time would not rebuild them. Re-attach a sample if you need them back.`,
    );
  }

  const arrivalFormat = asArrivalFormat(field.arrival_format);
  const dataType = asDataType(field.data_type);

  if (!arrivalFormat || !dataType) {
    return refuse(`I do not know what type "${path}" had before.`);
  }

  const parentPath = parentOf(path);

  const restore: Action[] = [
    {
      kind: 'add_field',
      name: nameOf(path),
      ...(parentPath ? { parentPath } : {}),
      arrivalFormat,
      dataType,
    },
  ];

  // `add_field` creates an optional field with no description, so anything
  // else the field carried is put back with its own action.
  if (field.isRequired === true) {
    restore.push({ kind: 'toggle_required', path, required: true });
  }

  if (typeof field.description === 'string' && field.description) {
    restore.push({
      kind: 'set_description',
      path,
      description: field.description,
    });
  }

  return invertible(...restore);
};

/**
 * A transformation write replaces by `field_key`, so undoing one that replaced
 * another would silently drop the original. No action carries a stored
 * transformation definition, so that case is refused.
 */
const invertTransformation = (
  fieldKey: string,
  before: DatasetSnapshot,
): Inversion => {
  const replaced = entries(before.transformations_config).some(
    (entry) => entry.field_key === fieldKey,
  );

  return replaced
    ? refuse(
        `That replaced a transformation already on "${fieldKey}", and I cannot put the original back. Set the one you want instead.`,
      )
    : invertible({ kind: 'remove_transformation', fieldKey });
};

const invertStorage = (before: DatasetSnapshot): Inversion => {
  const indexing = (block(before, 'dataset_config').indexing_config ??
    {}) as Record<string, unknown>;

  const realtime = indexing.olap_store_enabled === true;
  const lakehouse = indexing.lakehouse_enabled === true;
  const cache = indexing.cache_enabled === true;

  // The update API insists at least one store stays on, so an all-off triple
  // is refused here rather than sent and rejected.
  if (!realtime && !lakehouse && !cache) {
    return refuse(
      'Nothing was enabled before that change, and at least one storage option has to stay on.',
    );
  }

  return invertible({ kind: 'set_storage', realtime, lakehouse, cache });
};

const invertKeys = (before: DatasetSnapshot): Inversion => {
  const keys = block(before, 'dataset_config').keys_config as
    Record<string, string> | undefined;

  // An empty string clears a key, which is how the console stores "not set".
  return invertible({
    kind: 'set_keys',
    primary: keys?.data_key ?? '',
    partition: keys?.partition_key ?? '',
    timestamp: keys?.timestamp_key ?? '',
  });
};

export const inverseOf = (
  action: Action,
  before: DatasetSnapshot,
): Inversion => {
  switch (action.kind) {
    case 'set_dataset_name': {
      const name = before.name;

      return typeof name === 'string' && name
        ? invertible({ kind: 'set_dataset_name', name })
        : refuse('I do not know what the dataset was called before.');
    }

    case 'set_dataset_type': {
      const priorType = (DATASET_TYPES as readonly string[]).includes(
        before.type as string,
      )
        ? (before.type as DatasetType)
        : undefined;

      return priorType
        ? invertible({ kind: 'set_dataset_type', datasetType: priorType })
        : refuse('I do not know what type the dataset was before.');
    }

    case 'attach_sample':
      return refuse(
        'The sample is what created the draft and inferred the schema, so there is nothing left to put it back to. Attach a different sample to replace it.',
      );

    case 'set_data_type':
      return invertSetDataType(action.path, action.dataType, before);

    case 'set_arrival_format': {
      const priorArrival = asArrivalFormat(
        fieldAt(before, action.path)?.arrival_format,
      );

      return priorArrival
        ? invertible({
            kind: 'set_arrival_format',
            path: action.path,
            arrivalFormat: priorArrival,
          })
        : refuse(
            `I do not know what arrival format "${action.path}" had before.`,
          );
    }

    case 'toggle_required': {
      const field = fieldAt(before, action.path);

      return field
        ? invertible({
            kind: 'toggle_required',
            path: action.path,
            required: field.isRequired === true,
          })
        : refuse(`"${action.path}" was not in the dataset I read.`);
    }

    case 'set_description': {
      const field = fieldAt(before, action.path);

      return field
        ? invertible({
            kind: 'set_description',
            path: action.path,
            description:
              typeof field.description === 'string' ? field.description : '',
          })
        : refuse(`"${action.path}" was not in the dataset I read.`);
    }

    case 'add_field':
      return invertible({
        kind: 'delete_field',
        path: action.parentPath
          ? `${action.parentPath}.${action.name}`
          : action.name,
      });

    case 'delete_field':
      return invertDeleteField(action.path, before);

    case 'resolve_conflict':
      return refuse(
        'Resolving a conflict marks the field as resolved, and there is no action that un-resolves it.',
      );

    case 'set_additional_fields': {
      const mode = block(before, 'validation_config').mode;

      if (mode !== 'Strict' && mode !== 'IgnoreNewFields') {
        return refuse(
          'The dataset carries no validation mode, so I do not know what it was before that change.',
        );
      }

      return invertible({
        kind: 'set_additional_fields',
        allow: mode === 'IgnoreNewFields',
      });
    }

    case 'set_pii':
    case 'add_transformation':
      return invertTransformation(action.path, before);

    case 'add_derived_field':
      return invertTransformation(action.name, before);

    case 'set_dedup': {
      const dedup = block(before, 'dedup_config');
      const enabled = dedup.drop_duplicates === true;
      const key = typeof dedup.dedup_key === 'string' ? dedup.dedup_key : '';

      if (enabled && !key) {
        return refuse(
          'Duplicates were being dropped with no key recorded, which is not a state I can send back.',
        );
      }

      return invertible(
        enabled
          ? { kind: 'set_dedup', enabled: true, key }
          : { kind: 'set_dedup', enabled: false },
      );
    }

    case 'set_denorm': {
      const replaced = entries(
        block(before, 'denorm_config').denorm_fields,
      ).some((entry) => entry.denorm_key === action.path);

      return replaced
        ? refuse(
            `That replaced the denormalisation already on "${action.path}", and I cannot put the original back.`,
          )
        : invertible({ kind: 'remove_denorm', path: action.path });
    }

    case 'set_storage':
      return invertStorage(before);

    case 'set_keys':
      return invertKeys(before);

    case 'save':
      return refuse(
        'Marking the dataset ready to publish is a status change, and moving a status backwards is not something the console offers.',
      );

    case 'remove_transformation':
      return refuse(
        'I did not keep the transformation I removed, so I cannot add it back. Ask for the one you want instead.',
      );

    case 'remove_denorm':
      return refuse(
        'I did not keep the denormalisation I removed, so I cannot add it back. Ask for the one you want instead.',
      );

    default:
      return refuse(`There is nothing to undo for "${action.kind}".`);
  }
};

/**
 * What an `undo` should act on, given the transcript.
 *
 * The rule is deliberately strict: the *newest* change is the candidate, and
 * if it cannot be inverted the answer is that reason. Skipping it to undo
 * something older would leave the dataset in a state the conversation never
 * described.
 *
 * A turn that wrote nothing — moving between steps, a choice buffered for the
 * connector, a rejected instruction — carries neither an inverse nor a
 * reason, and is passed over rather than reported.
 */
export type UndoTarget =
  | { status: 'none' }
  | { status: 'blocked'; message: Message; reason: string }
  | { status: 'ready'; message: Message; actions: Action[] };

export const undoTarget = (messages: Message[]): UndoTarget => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== 'assistant' || !message.action) continue;
    if (message.undone) continue;

    if (message.inverse?.length) {
      return { status: 'ready', message, actions: message.inverse };
    }

    if (message.undoBlocked) {
      return { status: 'blocked', message, reason: message.undoBlocked };
    }
  }

  return { status: 'none' };
};
