/**
 * An in-memory stand-in for the Obsrv config API.
 *
 * This is not a convenience mock. Every rule below was established by probing
 * the **live** API during this build, and several of them are rules that a
 * permissive mock would have hidden — mocks proved sequencing while the real
 * API rejected the payload shape. Encoding them here means a regression
 * against the real contract fails in CI rather than in a browser:
 *
 * - `version_key` optimistic locking; a stale key is `DATASET_OUTDATED`.
 * - `dataset_config` is `additionalProperties: false` — echoing the
 *   server-added `cache_config` back is rejected.
 * - `dedup_config` likewise; echoing the server-added `dedup_period` fails.
 * - `transformations_config` is a **delta** API: items must be
 *   `{ value, action }`, and a plain array is rejected.
 * - `data_schema` is the only genuine whole-document round trip.
 * - `datasets/read` needs `mode=edit` for a Draft; without it, asking for
 *   `version_key` gives `DATASET_INVALID_FIELDS`.
 * - `datasets/dataschema` requires `config`, not just `data`.
 * - `dataset/exists` answers 404 when the id is free.
 * - Enabling a storage type the cluster lacks gives
 *   `DATASET_UNSUPPORTED_STORAGE_TYPE`, with the available list in the message.
 *
 * The one thing deliberately *not* modelled is `create` validating storage
 * availability, because the live API does not: a fresh draft arrives with
 * `lakehouse_enabled: true` on a cluster that has no lakehouse.
 */

type Json = Record<string, unknown>;

export interface FakeApiOptions {
  /** Storage types the cluster has. Defaults to realtime only, as observed. */
  storageTypes?: Record<string, boolean>;
  /** Datasets that already exist, so `create` can collide. */
  existingIds?: string[];
}

interface StoredDataset extends Json {
  dataset_id: string;
  name: string;
  type: string;
  status: string;
  version_key: string;
  data_schema: Json;
  dataset_config: Json;
  dedup_config: Json;
  denorm_config: Json;
  validation_config: Json;
  transformations_config: Json[];
  connectors_config: Json[];
  sample_data: Json;
}

/** Shape of an axios-like response the services expect. */
interface FakeResponse {
  status: number;
  data: Json;
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly responseCode: string,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }

  /**
   * The rejection shape axios produces.
   *
   * `response.status` is the **numeric** HTTP status, not the API's
   * `responseCode` string — those are different fields and conflating them
   * broke the id-availability check, which trusts a numeric 404 to mean the
   * id is free. The API's own code lives in `data.error.code`, which is what
   * `describeApiError` and the error map read.
   */
  toRejection() {
    return Object.assign(new Error(this.message), {
      response: {
        status: this.status,
        data: {
          responseCode: this.responseCode,
          error: { code: this.code, message: this.message },
        },
      },
    });
  }
}

const ok = (result: unknown): FakeResponse => ({
  status: 200,
  data: { responseCode: 'OK', result },
});

/** Keys `dataset_config` accepts. Anything else is rejected outright. */
const DATASET_CONFIG_KEYS = [
  'file_upload_path',
  'indexing_config',
  'keys_config',
];

/** Keys `dedup_config` accepts; `dedup_period` is server-added. */
const DEDUP_CONFIG_KEYS = ['drop_duplicates', 'dedup_key'];

const STORAGE_FLAG_TO_TYPE: Record<string, string> = {
  lakehouse_enabled: 'lake_house',
  olap_store_enabled: 'realtime_store',
};

export interface FakeConfigApi {
  /** Drop-in replacement for the `http` axios instance. */
  http: {
    get: (url: string) => Promise<FakeResponse>;
    post: (url: string, body?: Json) => Promise<FakeResponse>;
    patch: (url: string, body?: Json) => Promise<FakeResponse>;
    put: (url: string, body?: unknown) => Promise<FakeResponse>;
  };
  /** The stored dataset, for asserting what the flow actually wrote. */
  dataset: (datasetId: string) => StoredDataset | undefined;
  /** Every request made, for asserting on call sequence. */
  calls: { method: string; url: string; body?: Json }[];
}

export const createFakeConfigApi = ({
  storageTypes = { lake_house: false, realtime_store: true },
  existingIds = [],
}: FakeApiOptions = {}): FakeConfigApi => {
  const datasets = new Map<string, StoredDataset>();
  const taken = new Set(existingIds);
  const calls: FakeConfigApi['calls'] = [];
  let versionCounter = 1000;

  const nextVersionKey = () => {
    versionCounter += 1;
    return String(versionCounter);
  };

  const request = (body?: Json): Json => (body?.request as Json) ?? {};

  const project = (dataset: StoredDataset, fields?: string) => {
    if (!fields) return dataset;

    const wanted = fields.split(',').map((field) => field.trim());
    const out: Json = {};

    wanted.forEach((field) => {
      if (field in dataset) out[field] = dataset[field];
    });

    return out;
  };

  const requireStorageAvailable = (indexing: Json) => {
    const unavailable = Object.entries(STORAGE_FLAG_TO_TYPE).find(
      ([flag, type]) => indexing[flag] === true && storageTypes[type] === false,
    );

    if (!unavailable) return;

    const available = Object.entries(storageTypes)
      .filter(([, present]) => present)
      .map(([type]) => type)
      .join(', ');

    throw new ApiError(
      400,
      'BAD_REQUEST',
      'DATASET_UNSUPPORTED_STORAGE_TYPE',
      `The storage type "${unavailable[1]}" is not available. Please use one of the available storage types: ${available}`,
    );
  };

  const rejectExtraKeys = (block: string, value: Json, allowed: string[]) => {
    const extra = Object.keys(value).find((key) => !allowed.includes(key));

    if (extra) {
      throw new ApiError(
        400,
        'BAD_REQUEST',
        'DATASET_UPDATE_INPUT_INVALID',
        `#properties/request/properties/${block}/additionalProperties must NOT have additional properties`,
      );
    }
  };

  const requireDeltaItems = (block: string, items: unknown) => {
    if (!Array.isArray(items)) return;

    const plain = items.find(
      (item) => !item || typeof item !== 'object' || !('value' in item),
    );

    if (plain) {
      throw new ApiError(
        400,
        'BAD_REQUEST',
        'DATASET_UPDATE_INPUT_INVALID',
        `#properties/request/properties/${block}/items/required must have required property 'value'`,
      );
    }
  };

  /** Applies delta entries to a stored array, keyed by the given field. */
  const applyDelta = (
    current: Json[],
    deltas: Json[],
    keyName: string,
  ): Json[] => {
    let next = [...current];

    deltas.forEach((delta) => {
      const value = delta.value as Json;
      const key = value?.[keyName];

      if (delta.action === 'remove') {
        next = next.filter((item) => item[keyName] !== key);
        return;
      }

      next = [...next.filter((item) => item[keyName] !== key), value];
    });

    return next;
  };

  const get = async (url: string): Promise<FakeResponse> => {
    calls.push({ method: 'GET', url });

    if (url.startsWith('/api/config/data')) {
      return {
        status: 200,
        data: {
          STORAGE_TYPES: JSON.stringify(storageTypes),
          AUTHENTICATION_TYPE: 'basic',
        },
      };
    }

    if (url.startsWith('/api/dataset/exists/')) {
      const id = url.split('/').pop() ?? '';

      // A 404 means the id is free — the only signal the executor trusts.
      if (!taken.has(id) && !datasets.has(id)) {
        throw new ApiError(404, 'NOT_FOUND', 'DATASET_NOT_FOUND', 'not found');
      }

      return ok({ exists: true });
    }

    if (url.startsWith('/api/web-console/generate-fields/')) {
      const id = url.split('/').pop()?.split('?')[0] ?? '';
      const dataset = datasets.get(id);
      const properties =
        (dataset?.data_schema?.properties as Json | undefined) ?? {};

      // The BFF returns a flat list wrapped in an outer array, and nested
      // fields arrive as their own rows with a dotted `column`.
      const fields: Json[] = [];

      Object.entries(properties).forEach(([key, spec]) => {
        const field = spec as Json;
        fields.push({
          column: key,
          type: field.type,
          data_type: field.data_type,
          arrival_format: field.arrival_format,
          ref: `properties.${key}`,
        });

        Object.entries((field.properties as Json | undefined) ?? {}).forEach(
          ([childKey, childSpec]) => {
            const child = childSpec as Json;
            fields.push({
              column: `${key}.${childKey}`,
              type: child.type,
              data_type: child.data_type,
              arrival_format: child.arrival_format,
              ref: `properties.${key}.properties.${childKey}`,
            });
          },
        );
      });

      return { status: 200, data: [fields] as unknown as Json };
    }

    if (url.startsWith('/config/v2/datasets/read/')) {
      const [path, queryString = ''] = url
        .replace('/config/v2/datasets/read/', '')
        .split('?');
      const query = new URLSearchParams(queryString);
      const dataset = datasets.get(path);

      if (!dataset) {
        throw new ApiError(
          404,
          'NOT_FOUND',
          'DATASET_NOT_FOUND',
          `Dataset with the given dataset_id:${path} not found`,
        );
      }

      const fields = query.get('fields') ?? undefined;

      // Without `mode=edit` a Draft does not expose `version_key`.
      if (query.get('mode') !== 'edit' && fields?.includes('version_key')) {
        throw new ApiError(
          400,
          'BAD_REQUEST',
          'DATASET_INVALID_FIELDS',
          'The specified fields [version_key] in the dataset cannot be found.',
        );
      }

      return ok(project(dataset, fields));
    }

    if (url.startsWith('/config/v2/connectors/read/')) {
      return ok({ ui_spec: { type: 'object', properties: {} } });
    }

    throw new ApiError(404, 'NOT_FOUND', 'ROUTE_NOT_FOUND', `no route ${url}`);
  };

  const post = async (url: string, body?: Json): Promise<FakeResponse> => {
    calls.push({ method: 'POST', url, body });
    const payload = request(body);

    if (url === '/config/v2/files/generate-url') {
      const files = (payload.files as string[]) ?? [];

      return ok(
        files.map((file) => ({
          filePath: `uploads/${file}`,
          preSignedUrl: `https://uploads.test/${file}`,
          fileName: file,
        })),
      );
    }

    if (url === '/config/v2/datasets/dataschema') {
      // `config` is mandatory; omitting it is a real rejection.
      if (!payload.config) {
        throw new ApiError(
          400,
          'BAD_REQUEST',
          'DATA_SCHEMA_INVALID_INPUT',
          "#properties/request/required must have required property 'config'",
        );
      }

      const rows = (payload.data as Json[]) ?? [];
      const merged: Json = {};
      rows.forEach((row) => Object.assign(merged, row));

      /**
       * Whether any row saw a fractional value for this key.
       *
       * Merging and reading the last row would call `[12.5, 30, 7]` an
       * integer, which the real API does not: it sees every value and widens.
       */
      const anyFractional = (key: string) =>
        rows.some((row) => {
          const value = row[key];
          return typeof value === 'number' && !Number.isInteger(value);
        });

      /**
       * The distinct store types seen for a key across every row.
       *
       * The real API widens over all values and reports a MUST-FIX conflict
       * when they disagree, with the occurrence counts in the message. The
       * fake used to emit no `suggestions` and no `oneof` at all, which is
       * why the entire conflict path — `unresolvedConflicts`, the
       * `ConflictCard`, `resolveConflict` — was never exercised end to end,
       * and why a PATCH that stripped a *second* field's unresolved conflict
       * went unnoticed.
       */
      const storeTypes = (key: string): Record<string, number> => {
        const counts: Record<string, number> = {};

        rows.forEach((row) => {
          const value = row[key];
          if (value === undefined || value === null) return;

          const type =
            typeof value === 'number'
              ? Number.isInteger(value)
                ? 'integer'
                : 'double'
              : typeof value === 'boolean'
                ? 'boolean'
                : 'string';

          counts[type] = (counts[type] ?? 0) + 1;
        });

        return counts;
      };

      /** Verbatim shape of a live MUST-FIX conflict suggestion. */
      const conflictSuggestion = (
        key: string,
        counts: Record<string, number>,
      ) => ({
        message: `Conflict in the Schema Generation at property: '${key}'. The property type ${Object.entries(
          counts,
        )
          .map(([type, count]) => `${type}: ${count} time(s)`)
          .join(', ')}, `,
        advice:
          'System can choose highest occurance property or last appeared object property',
        resolutionType: 'DATA_TYPE',
        severity: 'MUST-FIX',
        path: `properties.${key}`,
      });

      /** The LOW hints the live API attaches, in its own words. */
      const lowSuggestion = (key: string, kind: 'email' | 'date-time') =>
        kind === 'email'
          ? {
              message: `The Property '${key}' appears to be 'email' format type.`,
              advice: 'Suggest to Mask the Personal Information',
              resolutionType: 'TRANSFORMATION',
              severity: 'LOW',
              path: `properties.${key}`,
            }
          : {
              message: `The Property '${key}' appears to be 'date-time' format type.`,
              advice: 'The System can index all data on this column',
              resolutionType: 'INDEX',
              severity: 'LOW',
              path: `properties.${key}`,
            };

      const properties: Json = {};

      Object.entries(merged).forEach(([key, value]) => {
        const counts = storeTypes(key);
        const distinct = Object.keys(counts);
        const conflict =
          distinct.length > 1
            ? {
                oneof: distinct.map((type) => ({ type })),
                suggestions: [conflictSuggestion(key, counts)],
              }
            : {};

        if (typeof value === 'number') {
          properties[key] = {
            type: 'number',
            arrival_format: 'number',
            data_type:
              Number.isInteger(value) && !anyFractional(key)
                ? 'integer'
                : 'double',
            ...conflict,
          };
          return;
        }
        if (typeof value === 'boolean') {
          properties[key] = {
            type: 'boolean',
            arrival_format: 'boolean',
            data_type: 'boolean',
          };
          return;
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const nested: Json = {};
          Object.entries(value as Json).forEach(([childKey, childValue]) => {
            nested[childKey] = {
              type: typeof childValue === 'number' ? 'number' : 'string',
              arrival_format:
                typeof childValue === 'number' ? 'number' : 'text',
              data_type: typeof childValue === 'number' ? 'double' : 'string',
            };
          });
          properties[key] = {
            type: 'object',
            arrival_format: 'object',
            data_type: 'object',
            properties: nested,
          };
          return;
        }

        const isTimestamp =
          typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value);
        const isEmail =
          typeof value === 'string' && /^[^@\s]+@[^@\s]+$/.test(value);

        const hint = isEmail
          ? [lowSuggestion(key, 'email')]
          : isTimestamp
            ? [lowSuggestion(key, 'date-time')]
            : [];

        properties[key] = {
          type: 'string',
          arrival_format: 'text',
          data_type: isTimestamp ? 'date-time' : 'string',
          ...conflict,
          // A MUST-FIX conflict and a LOW hint can both be attached; the real
          // API sends whichever apply.
          ...(hint.length
            ? {
                suggestions: [
                  ...((conflict.suggestions as Json[]) ?? []),
                  ...hint,
                ],
              }
            : {}),
        };
      });

      return ok({
        schema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          additionalProperties: true,
          properties,
        },
      });
    }

    if (url === '/config/v2/datasets/create') {
      const id = payload.dataset_id as string;

      if (taken.has(id) || datasets.has(id)) {
        throw new ApiError(
          409,
          'CONFLICT',
          'DATASET_EXISTS',
          `Dataset Already exists with id:${id}`,
        );
      }

      const versionKey = nextVersionKey();

      datasets.set(id, {
        dataset_id: id,
        name: payload.name as string,
        type: (payload.type as string) ?? 'event',
        status: 'Draft',
        version_key: versionKey,
        data_schema: (payload.data_schema as Json) ?? {},
        // Storage availability is NOT validated on create by the live API,
        // so a fresh draft can carry a flag the cluster cannot honour.
        dataset_config: {
          keys_config: {},
          indexing_config: {
            olap_store_enabled: true,
            lakehouse_enabled: true,
            cache_enabled: false,
          },
          file_upload_path:
            ((payload.dataset_config as Json)?.file_upload_path as string[]) ??
            [],
          cache_config: { redis_db_host: 'valkey.test', redis_db_port: 6379 },
        },
        dedup_config: { drop_duplicates: false, dedup_key: '' },
        denorm_config: {
          redis_db_host: 'valkey.test',
          redis_db_port: 6379,
          denorm_fields: [],
        },
        validation_config: { validate: true, mode: 'Strict' },
        transformations_config: [],
        connectors_config: (payload.connectors_config as Json[]) ?? [],
        sample_data: (payload.sample_data as Json) ?? {},
      });

      return ok({ id, version_key: versionKey });
    }

    if (url === '/config/v2/datasets/status-transition') {
      const id = payload.dataset_id as string;
      const dataset = datasets.get(id);

      if (!dataset) {
        throw new ApiError(
          404,
          'NOT_FOUND',
          'DATASET_NOT_FOUND',
          `Dataset not found for dataset: ${id}`,
        );
      }

      const status = payload.status as string;

      if (status === 'Delete') {
        datasets.delete(id);
        return ok({ message: 'deleted' });
      }

      // Publishing re-validates storage, unlike create.
      requireStorageAvailable(
        (dataset.dataset_config.indexing_config as Json) ?? {},
      );

      dataset.status = status;
      return ok({ message: 'ok', id });
    }

    if (url === '/config/v2/connectors/list') {
      return ok({ data: [] });
    }

    if (url === '/config/v2/datasets/list') {
      return ok({ data: [...datasets.values()] });
    }

    throw new ApiError(404, 'NOT_FOUND', 'ROUTE_NOT_FOUND', `no route ${url}`);
  };

  const patch = async (url: string, body?: Json): Promise<FakeResponse> => {
    calls.push({ method: 'PATCH', url, body });
    const payload = request(body);

    if (url !== '/config/v2/datasets/update') {
      throw new ApiError(
        404,
        'NOT_FOUND',
        'ROUTE_NOT_FOUND',
        `no route ${url}`,
      );
    }

    const id = payload.dataset_id as string;
    const dataset = datasets.get(id);

    if (!dataset) {
      throw new ApiError(
        404,
        'NOT_FOUND',
        'DATASET_NOT_FOUND',
        `Dataset with the given dataset_id:${id} not found`,
      );
    }

    // Optimistic locking: a stale key means someone else wrote first.
    if (payload.version_key !== dataset.version_key) {
      throw new ApiError(
        409,
        'CONFLICT',
        'DATASET_OUTDATED',
        'The dataset is outdated. Please try to fetch latest changes of the dataset and perform the updates',
      );
    }

    if (payload.dataset_config) {
      const config = payload.dataset_config as Json;
      rejectExtraKeys('dataset_config', config, DATASET_CONFIG_KEYS);
      requireStorageAvailable((config.indexing_config as Json) ?? {});

      dataset.dataset_config = {
        ...dataset.dataset_config,
        ...config,
      };
    }

    if (payload.dedup_config) {
      const dedup = payload.dedup_config as Json;
      rejectExtraKeys('dedup_config', dedup, DEDUP_CONFIG_KEYS);
      dataset.dedup_config = { ...dedup, dedup_period: 604800 };
    }

    if (payload.transformations_config) {
      requireDeltaItems(
        'transformations_config',
        payload.transformations_config,
      );
      dataset.transformations_config = applyDelta(
        dataset.transformations_config,
        payload.transformations_config as Json[],
        'field_key',
      );
    }

    if (payload.denorm_config) {
      const denorm = payload.denorm_config as Json;
      rejectExtraKeys('denorm_config', denorm, ['denorm_fields']);
      requireDeltaItems('denorm_config', denorm.denorm_fields);
      dataset.denorm_config = {
        ...dataset.denorm_config,
        denorm_fields: applyDelta(
          (dataset.denorm_config.denorm_fields as Json[]) ?? [],
          denorm.denorm_fields as Json[],
          'denorm_key',
        ),
      };
    }

    if (payload.validation_config) {
      dataset.validation_config = payload.validation_config as Json;
    }

    // The one block that is a genuine whole-document round trip.
    if (payload.data_schema) {
      dataset.data_schema = payload.data_schema as Json;
    }

    if (payload.connectors_config) {
      requireDeltaItems('connectors_config', payload.connectors_config);
      dataset.connectors_config = applyDelta(
        dataset.connectors_config,
        payload.connectors_config as Json[],
        'id',
      );
    }

    if (payload.name) dataset.name = payload.name as string;
    if (payload.type) dataset.type = payload.type as string;

    dataset.version_key = nextVersionKey();

    return ok({
      message: 'Dataset is updated successfully',
      id,
      version_key: dataset.version_key,
    });
  };

  const wrap =
    <T extends (...args: never[]) => Promise<FakeResponse>>(fn: T) =>
    async (...args: Parameters<T>): Promise<FakeResponse> => {
      try {
        return await fn(...args);
      } catch (cause) {
        if (cause instanceof ApiError) throw cause.toRejection();
        throw cause;
      }
    };

  return {
    http: {
      get: wrap(get) as FakeConfigApi['http']['get'],
      post: wrap(post) as FakeConfigApi['http']['post'],
      patch: wrap(patch) as FakeConfigApi['http']['patch'],
      // Uploads go straight to a presigned URL and return nothing useful.
      put: async () => ({ status: 200, data: {} }),
    },
    dataset: (datasetId) => datasets.get(datasetId),
    calls,
  };
};
