export const DATASETS_LIST_ENDPOINT = '/datasets/list';
export const DATASET_READ_ENDPOINT = (datasetId: string) =>
  `/datasets/read/${datasetId}?fields=version_key&mode=edit`;
export const DATASET_HEALTH_ENDPOINT = '/datasets/health';
export const DATASET_STATUS_TRANSITION_ENDPOINT = '/datasets/status-transition';
export const DATASET_UPDATE_ENDPOINT = '/datasets/update';
export const DATASET_EXPORT_ENDPOINT = (datasetId: string, status: string) =>
  `/datasets/export/${datasetId}?status=${status}`;
export const DATASET_COPY_ENDPOINT = '/datasets/copy';
export const DATASET_READ = (datasetId: string, params: string) => `/datasets/read/${datasetId}?${params}`;