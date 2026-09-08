/**
 * Turns a failed action into an explanation and a recovery.
 *
 * Two rules shape this module:
 *
 * 1. **Nothing is invented.** Every code and message pattern here was captured
 *    from the live config API. An unrecognised code keeps the server's own
 *    wording rather than being dressed up in a friendlier guess.
 * 2. **A failure is never silent.** The failure mode this replaces is the
 *    storage step that appeared to save and did not, so the unsupported-store
 *    case must produce both a reason and an action that would actually work.
 */
import _ from 'lodash';
import { Action } from './actions';

/** Raised locally when a call resolves without an API envelope — see `isEmptyEnvelope`. */
export const SESSION_EXPIRED = 'SESSION_EXPIRED';

export type RecoveryKind =
  /** Re-read and dispatch the same action; safe to do without asking. */
  | 'replay'
  /** The request itself is wrong — a different value is needed. */
  | 'revise'
  /** The session is gone; nothing works until the user signs in again. */
  | 'reauth'
  /** Transient; the identical request may succeed. */
  | 'retry'
  /** The dataset no longer exists, so the session has to start over. */
  | 'restart'
  /** A body this code assembled was rejected — an assistant bug. */
  | 'report';

export interface StorageAvailability {
  /** The storage type the server refused, as it named it. */
  unavailable: string;
  /** The storage types it offered instead. */
  available: string[];
}

export interface Diagnosis {
  code: string;
  /** User-facing sentence. Falls back to the server message, never to a guess. */
  explanation: string;
  recovery: RecoveryKind;
  /** Whether the executor may transparently retry once, without asking. */
  selfHeal: boolean;
  /** The raw server message, for a "details" affordance. */
  detail?: string;
  /** The config block or field the server named, when the message carries one. */
  subject?: string;
  storage?: StorageAvailability;
  /** A concrete action that would succeed, when one can be derived. */
  retryAction?: Action;
}

export interface StorageCapabilities {
  lakehouse: boolean;
  realtime: boolean;
  cache: boolean;
}

/** Labels copied from the storage step's checkboxes, so wording matches the UI. */
const STORAGE_LABELS: Record<string, string> = {
  lake_house: 'Data Lakehouse (Hudi)',
  realtime_store: 'Real-time Store (Druid)',
};

/**
 * Which `set_storage` flag each storage type controls.
 *
 * `cache_enabled` is deliberately absent: the server does not validate cache
 * as a storage type, so it is never the subject of this error and must not be
 * toggled while recovering from one.
 */
const STORAGE_FLAGS: Record<string, 'lakehouse' | 'realtime'> = {
  lake_house: 'lakehouse',
  realtime_store: 'realtime',
};

export const availableStorageLabels = (stores: string[]): string[] =>
  stores.map((store) => STORAGE_LABELS[store] ?? store);

/**
 * Reads the `STORAGE_TYPES` system setting into the flags `set_storage` uses.
 *
 * Unknown means available. A missing or malformed setting must not make the
 * assistant refuse a store the cluster actually has — the server is still the
 * authority, and it will say so. Cache is always reported available because
 * the capability map does not describe it.
 */
export const storageCapabilities = (setting: unknown): StorageCapabilities => {
  const parse = (): unknown => {
    if (typeof setting !== 'string') return setting;
    try {
      return JSON.parse(setting);
    } catch {
      return undefined;
    }
  };

  const types = parse();
  const flag = (key: string): boolean =>
    _.isPlainObject(types)
      ? (types as Record<string, unknown>)[key] !== false
      : true;

  return {
    lakehouse: flag('lake_house'),
    realtime: flag('realtime_store'),
    cache: true,
  };
};

/**
 * The message is, verbatim from the API:
 *   The storage type "lake_house" is not available. Please use one of the
 *   available storage types: realtime_store
 */
const STORAGE_MESSAGE =
  /storage type "([^"]+)" is not available.*available storage types:\s*(.+?)\s*$/i;

const parseStorageAvailability = (
  message: string,
): StorageAvailability | undefined => {
  const matched = STORAGE_MESSAGE.exec(message);

  if (!matched) return undefined;

  return {
    unavailable: matched[1],
    available: matched[2]
      .split(',')
      .map((store) => store.trim())
      .filter(Boolean),
  };
};

/**
 * Builds a `set_storage` that asks only for stores the server just said it
 * has, and explicitly turns off the one it refused.
 */
export const storageRetryAction = (
  storage: StorageAvailability,
): Action | undefined => {
  const enable = storage.available
    .map((store) => STORAGE_FLAGS[store])
    .filter(Boolean);

  if (enable.length === 0) return undefined;

  const disable = STORAGE_FLAGS[storage.unavailable];
  const flags: Record<string, boolean> = {};

  if (disable) flags[disable] = false;
  enable.forEach((flag) => {
    flags[flag] = true;
  });

  return { kind: 'set_storage', ...flags } as Action;
};

/**
 * Pulls the subject out of an ajv message. The API reports schema failures as
 * a JSON pointer into its own request schema, e.g.
 * `#properties/request/properties/dataset_config/additionalProperties`.
 */
const POINTER_BLOCK = /#properties\/request\/properties\/([^/]+)/;
const REQUIRED_PROPERTY = /required property '([^']+)'/;
const INVALID_FIELDS = /fields \[([^\]]+)\]/;

const schemaSubject = (message: string): string | undefined => {
  const block = POINTER_BLOCK.exec(message);
  if (block) return block[1];

  const required = REQUIRED_PROPERTY.exec(message);
  if (required) return required[1];

  return undefined;
};

/** Codes raised by this code's own guards, which already carry a written message. */
const LOCAL_GUARD_CODES = new Set([
  'UNKNOWN_FIELD',
  'INVALID_EDIT',
  'NO_SCHEMA',
  'INVALID_DATASET_NAME',
  'MISSING_DATASET_NAME',
  'MISSING_SAMPLE',
  'INVALID_EXPRESSION',
  'INELIGIBLE_DEDUP_KEY',
  'INELIGIBLE_STORAGE_KEY',
  'INELIGIBLE_TIMESTAMP_KEY',
  'NO_STORAGE_SELECTED',
  'DATASET_ID_TAKEN',
  'NO_DATASET',
  'UNSUPPORTED_ACTION',
]);

/** Codes the API returns for a body that failed its own request schema. */
const SCHEMA_REJECTION_CODES = new Set([
  'DATASET_UPDATE_INPUT_INVALID',
  'DATASET_CREATE_INPUT_INVALID',
  'DATASET_STATUS_TRANSITION_INVALID_INPUT',
  'DATA_SCHEMA_INVALID_INPUT',
]);

const TRANSIENT_MESSAGE =
  /network error|timeout|exceeded|ECONNREFUSED|ETIMEDOUT/i;

const schemaExplanation = (message: string, subject?: string): string => {
  const where = subject ? `\`${subject}\`` : 'the request';

  if (/must NOT have additional properties/i.test(message)) {
    return `The server rejected ${where}: it carried a property the update API does not accept. This is a bug in how the assistant built the request — server-added fields must not be echoed back.`;
  }

  if (REQUIRED_PROPERTY.test(message)) {
    const property = REQUIRED_PROPERTY.exec(message)?.[1];

    if (property === 'value') {
      return `The server rejected ${where}: its entries must be delta-wrapped as \`{ value, action: 'upsert' | 'remove' }\`. This is a bug in how the assistant built the request.`;
    }

    return `The server rejected the request: \`${property}\` is required and was missing. This is a bug in how the assistant built the request.`;
  }

  return `The server rejected ${where} as invalid. This is a bug in how the assistant built the request.`;
};

/**
 * Whether a resolved API call carried no envelope.
 *
 * `unwrapResult` is `_.get(response, ['data', 'result'])`, so when the session
 * has expired the dev server answers the SPA HTML shell at HTTP 200 and the
 * call resolves to `undefined` rather than throwing. Without this check the
 * next failure reported would be a misleading `NO_SCHEMA`.
 */
export const isEmptyEnvelope = (result: unknown): boolean =>
  !_.isPlainObject(result) && !Array.isArray(result);

export interface ActionFailure {
  code: string;
  error: string;
}

export const diagnose = ({ code, error }: ActionFailure): Diagnosis => {
  const detail = error || undefined;
  const base = { code, detail };

  if (code === 'DATASET_OUTDATED') {
    return {
      ...base,
      explanation:
        'The dataset changed since it was last read, so the update was rejected to avoid overwriting that change.',
      recovery: 'replay',
      selfHeal: true,
    };
  }

  if (code === 'DATASET_UNSUPPORTED_STORAGE_TYPE') {
    const storage = parseStorageAvailability(error);

    if (!storage) {
      return {
        ...base,
        explanation:
          error || 'This cluster does not support the requested storage type.',
        recovery: 'revise',
        selfHeal: false,
      };
    }

    const wanted = STORAGE_LABELS[storage.unavailable] ?? storage.unavailable;
    const offered = availableStorageLabels(storage.available);

    return {
      ...base,
      explanation: `This cluster does not have ${wanted}. Available here: ${offered.join(', ')}.`,
      recovery: 'revise',
      selfHeal: false,
      storage,
      retryAction: storageRetryAction(storage),
    };
  }

  if (code === 'DATASET_NOT_FOUND') {
    return {
      ...base,
      explanation:
        'That dataset no longer exists on the server — it may have been deleted in another session.',
      recovery: 'restart',
      selfHeal: false,
    };
  }

  if (code === 'DATASET_EXISTS') {
    return {
      ...base,
      explanation:
        'A dataset already uses that id, which is derived from the name. Pick a different name.',
      recovery: 'revise',
      selfHeal: false,
    };
  }

  if (code === SESSION_EXPIRED) {
    return {
      ...base,
      explanation:
        'The console answered with the login page instead of data, which means the session is no longer signed in. Sign in again, then retry.',
      recovery: 'reauth',
      selfHeal: false,
    };
  }

  if (code === 'DATASET_INVALID_FIELDS') {
    const fields = INVALID_FIELDS.exec(error)?.[1];

    return {
      ...base,
      explanation: `The read asked for ${fields ? `\`${fields}\`` : 'fields'}, which this dataset's status does not expose. This is a bug in the assistant's read projection.`,
      recovery: 'report',
      selfHeal: false,
      subject: fields,
    };
  }

  if (SCHEMA_REJECTION_CODES.has(code)) {
    const subject = schemaSubject(error);

    return {
      ...base,
      explanation: schemaExplanation(error, subject),
      recovery: 'report',
      selfHeal: false,
      subject,
    };
  }

  if (LOCAL_GUARD_CODES.has(code)) {
    return {
      ...base,
      explanation: error || 'That change cannot be applied as requested.',
      recovery: 'revise',
      selfHeal: false,
    };
  }

  if (TRANSIENT_MESSAGE.test(error)) {
    return {
      ...base,
      explanation:
        'The console could not reach the server. Retrying may be enough.',
      recovery: 'retry',
      selfHeal: true,
    };
  }

  return {
    ...base,
    explanation:
      error || `The server rejected the request with ${code || 'no code'}.`,
    recovery: 'report',
    selfHeal: false,
  };
};

/** Whether the executor may transparently repeat the action once. */
export const isSelfHealable = (failure: ActionFailure): boolean =>
  diagnose(failure).selfHeal;
