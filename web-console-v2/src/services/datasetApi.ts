/**
 * Plain-async wrappers around the Obsrv dataset APIs.
 *
 * These exist alongside the React Query hooks in `services/dataset.ts` because
 * the AI assistant executor runs outside React and therefore cannot call hooks.
 * Every URL string lives here so both surfaces share one definition.
 *
 * Contract notes:
 * - `datasets/update` is a whole-blob PATCH guarded by `version_key`. Callers
 *   must pass the `version_key` from the immediately preceding read; this
 *   module never falls back to a cached copy.
 * - Only `suggestions` is removed from `data_schema` before sending. Every
 *   other key the API produced (`isRequired`, `resolved`, `isModified`,
 *   `oneof`, ...) is round-tripped untouched.
 */
import { AxiosResponse } from 'axios';
import _ from 'lodash';
import { DatasetStatus } from 'types/datasets';
import { http } from './http';
import { generateRequestBody } from './utils';

export const DATASET_ENDPOINTS = {
  DATASETS_READ: '/config/v2/datasets/read',
  CREATE_DATASET: '/config/v2/datasets/create',
  UPDATE_DATASET: '/config/v2/datasets/update',
  GENERATE_DATA_SCHEMA: '/config/v2/datasets/dataschema',
  GENERATE_URL: '/config/v2/files/generate-url',
  LIST_DATASET: '/config/v2/datasets/list',
  STATUS_TRANSITION: '/config/v2/datasets/status-transition',
  LIST_CONNECTORS: '/config/v2/connectors/list',
  READ_CONNECTORS: '/config/v2/connectors/read',
  DATASET_EXISTS: '/api/dataset/exists',
  DATASETS_DIFF: '/api/dataset/diff',
  DATASET_EXPORT: '/config/v2/datasets/export',
  DATASET_HEALTH: '/config/v2/datasets/health',
  GENERATE_FIELDS: '/api/web-console/generate-fields',
  DRUID_DATASOURCE: '/config/druid/coordinator/v1/datasources?simple',
} as const;

export const API_IDS = {
  create: 'api.datasets.create',
  update: 'api.datasets.update',
  dataSchema: 'api.datasets.dataschema',
  list: 'api.datasets.list',
  statusTransition: 'api.datasets.status-transition',
  generateUrl: 'api.files.generate-url',
  connectorsList: 'api.connectors.list',
  health: 'api.datasets.health',
} as const;

/** Field projections accepted by `datasets/read`, keyed by dataset status. */
export const fieldsByStatus: Record<string, string> = {
  Draft:
    'name,type,id,dataset_id,version,validation_config,extraction_config,' +
    'dedup_config,data_schema,denorm_config,router_config,dataset_config,' +
    'tags,status,created_by,updated_by,created_date,updated_date,version_key,' +
    'api_version,entry_topic,transformations_config,connectors_config,' +
    'sample_data',
  default:
    'name,type,id,dataset_id,version,validation_config,extraction_config,' +
    'dedup_config,data_schema,denorm_config,router_config,dataset_config,' +
    'tags,status,created_by,updated_by,created_date,updated_date,api_version,' +
    'entry_topic,sample_data',
};

/** Status values accepted by `datasets/status-transition`. */
export type DatasetTransition = 'ReadyToPublish' | 'Live' | 'Retire' | 'Delete';

export type FileAccess = 'read' | 'write';

/**
 * Endpoint payloads are dynamic and differ per `fields` projection, so the
 * result generics default to this alias rather than a fixed shape. New callers
 * should pass an explicit type argument; the alias only exists so the legacy
 * React Query hooks keep compiling against their loosely typed call sites.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiResult = any;

export interface ReadDatasetParams {
  datasetId: string;
  status?: DatasetStatus | string;
  /** Overrides the status-derived projection when supplied. */
  fields?: string;
}

export interface UpdateDatasetPayload extends Record<string, unknown> {
  dataset_id?: string;
  version_key?: string | number;
  data_schema?: unknown;
}

export interface PresignedUpload {
  filePath: string;
  fileName: string;
  preSignedUrl: string;
}

export interface SchemaField extends Record<string, unknown> {
  column: string;
  ref?: string;
  data_type?: string;
  arrival_format?: string;
}

const unwrapResult = <T>(response: AxiosResponse): T =>
  _.get(response, ['data', 'result']) as T;

const connectorsListBody = (filters: Record<string, unknown>) =>
  generateRequestBody({
    request: { filters },
    apiId: API_IDS.connectorsList,
  });

const statusTransitionBody = (datasetId: string, status: DatasetTransition) =>
  generateRequestBody({
    request: { dataset_id: datasetId, status },
    apiId: API_IDS.statusTransition,
  });

/**
 * Recursively removes `suggestions` while preserving container types.
 *
 * Arrays stay arrays: the previous implementation walked them with `for..in`,
 * which silently rewrote `oneof: [a, b]` as `{ "0": a, "1": b }` and broke the
 * round-trip guarantee.
 */
export const stripSuggestions = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripSuggestions(item)) as unknown as T;
  }

  if (_.isPlainObject(value)) {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    Object.keys(source).forEach((key) => {
      if (key !== 'suggestions') {
        result[key] = stripSuggestions(source[key]);
      }
    });

    return result as unknown as T;
  }

  return value;
};

// Returns the raw body: a 404 envelope means "available". Loosely typed
// because callers sniff the shape (including an HTML error page).
export const datasetExists = (datasetId: string): Promise<ApiResult> =>
  http
    .get(`${DATASET_ENDPOINTS.DATASET_EXISTS}/${datasetId}`)
    .then((response: AxiosResponse) => response.data);

export const readDataset = <T = ApiResult>({
  datasetId,
  status = DatasetStatus.Draft,
  fields,
}: ReadDatasetParams): Promise<T> => {
  const projection = fields ?? fieldsByStatus[status] ?? fieldsByStatus.default;
  const query =
    status === DatasetStatus.Draft
      ? `mode=edit&fields=${projection}`
      : `fields=${projection}`;

  return http
    .get(`${DATASET_ENDPOINTS.DATASETS_READ}/${datasetId}?${query}`)
    .then(unwrapResult<T>);
};

export const createDataset = <T = ApiResult>(
  payload: Record<string, unknown>,
): Promise<T> =>
  http
    .post(
      DATASET_ENDPOINTS.CREATE_DATASET,
      generateRequestBody({ request: payload, apiId: API_IDS.create }),
    )
    .then(unwrapResult<T>);

/**
 * Whole-blob PATCH. `version_key` is mandatory and must come from the read
 * that produced the payload, so a stale write fails loudly instead of
 * clobbering a concurrent change.
 */
export interface UpdateDatasetOptions {
  /**
   * Send `data_schema` with its `suggestions` intact.
   *
   * Off by default, because stripping is what the wizard has always done and
   * changing that silently is not this feature's call. But the strip is
   * destructive: `suggestions` is where the API reports unresolved MUST-FIX
   * type conflicts and its LOW-severity index and masking hints, and the
   * server does not re-derive them — so one stripped PATCH erases a conflict
   * on a field the user never touched, and it stops being reported at all.
   *
   * Verified against the live API: a PATCH carrying suggestions is accepted,
   * and a re-read shows them preserved alongside the `resolved` flag.
   */
  keepSuggestions?: boolean;
}

export const updateDataset = async <T = ApiResult>(
  data: UpdateDatasetPayload,
  { keepSuggestions = false }: UpdateDatasetOptions = {},
): Promise<T> => {
  if (_.isNil(data.version_key) || data.version_key === '') {
    throw new Error(
      'updateDataset requires an explicit version_key from the preceding read',
    );
  }

  const request: UpdateDatasetPayload = { ...data };

  if (!_.isNil(request.data_schema) && !keepSuggestions) {
    request.data_schema = stripSuggestions(request.data_schema);
  }

  const response = await http.patch(
    DATASET_ENDPOINTS.UPDATE_DATASET,
    generateRequestBody({ request, apiId: API_IDS.update }),
  );

  return unwrapResult<T>(response);
};

export const generateDataSchema = <T = ApiResult>(
  payload: Record<string, unknown>,
): Promise<T> =>
  http
    .post(
      DATASET_ENDPOINTS.GENERATE_DATA_SCHEMA,
      generateRequestBody({ request: payload, apiId: API_IDS.dataSchema }),
    )
    .then(unwrapResult<T>);

export const generateUploadUrls = (
  files: string[],
  access: FileAccess = 'write',
): Promise<PresignedUpload[]> =>
  http
    .post(
      DATASET_ENDPOINTS.GENERATE_URL,
      generateRequestBody({
        request: { files, access },
        apiId: API_IDS.generateUrl,
      }),
    )
    .then(unwrapResult<PresignedUpload[]>);

export const uploadToPresignedUrl = (
  url: string,
  file: File,
): Promise<AxiosResponse> => {
  const formData = new FormData();

  formData.append('Content-Type', file.type);
  formData.append('file', file);

  return http.put(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'x-ms-blob-type': 'BlockBlob',
    },
  });
};

export const listDatasets = <T = ApiResult>(
  filters: Record<string, unknown> = {},
): Promise<T> =>
  http
    .post(
      DATASET_ENDPOINTS.LIST_DATASET,
      generateRequestBody({ request: { filters }, apiId: API_IDS.list }),
    )
    .then(unwrapResult<T>);

export const listConnectors = <T = ApiResult>(
  filters: Record<string, unknown> = {},
): Promise<T> =>
  http
    .post(DATASET_ENDPOINTS.LIST_CONNECTORS, connectorsListBody(filters))
    .then(unwrapResult<T>);

/** Raw axios response variant; `useConnectorsList` consumers read `data.result.data`. */
export const listConnectorsResponse = (
  filters: Record<string, unknown> = {},
): Promise<AxiosResponse> =>
  http.post(DATASET_ENDPOINTS.LIST_CONNECTORS, connectorsListBody(filters));

export const readConnector = <T = ApiResult>(connectorId: string): Promise<T> =>
  http
    .get(`${DATASET_ENDPOINTS.READ_CONNECTORS}/${connectorId}`)
    .then(unwrapResult<T>);

export const datasetStatusTransition = <T = ApiResult>(
  datasetId: string,
  status: DatasetTransition,
): Promise<T> =>
  http
    .post(
      DATASET_ENDPOINTS.STATUS_TRANSITION,
      statusTransitionBody(datasetId, status),
    )
    .then(unwrapResult<T>);

/** Raw axios response variant, preserving `usePublishDataset`'s historical shape. */
export const datasetStatusTransitionResponse = (
  datasetId: string,
  status: DatasetTransition,
): Promise<AxiosResponse> =>
  http.post(
    DATASET_ENDPOINTS.STATUS_TRANSITION,
    statusTransitionBody(datasetId, status),
  );

/**
 * Flat field list from the console BFF, used as the assistant's field
 * vocabulary. The endpoint wraps the list in an outer array.
 */
export const fetchAllFields = async (
  datasetId: string,
  status: DatasetStatus | string = DatasetStatus.Draft,
): Promise<SchemaField[]> => {
  const response = await http.get(
    `${DATASET_ENDPOINTS.GENERATE_FIELDS}/${datasetId}?status=${status}`,
  );
  const payload = response?.data;

  if (!Array.isArray(payload)) return [];

  const [fields] = payload;

  return Array.isArray(fields) ? (fields as SchemaField[]) : [];
};
