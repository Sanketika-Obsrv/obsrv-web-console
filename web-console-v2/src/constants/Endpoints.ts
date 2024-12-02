export default {
  infrastructureMetricsURL: '/config/v2/data/metrics',
  prometheusRead: '/prom/api/v1/query',
  prometheusReadRange: '/prom/api/v1/query_range',
  druidNativeQuery: '/config/v2/data/metrics',
  getAllFields: "/api/web-console/generate-fields",
  generateJsonSchema: "/config/v2/datasets/dataschema",
  generateIngestionSpec: "/config/dataset/v1/ingestionspec",
  saveDatset: "/config/v2/datasets/create",
  updateDataset: "/config/v2/datasets/update",
  updateLiveDataset: "/config/datasets/v1/update",
  readDataset: "/config/v2/datasets/read",
  statusTransition: "/config/v2/datasets/status-transition",
  saveDatasource: "/config/datasources/v1/update",
  deleteDraftDatasources: "/config/datasources/v1/delete",
  listDatasources: "/config/datasources/v1/list",
  listDatasets: "/config/v2/datasets/list",
  sendEvents: "/config/v2/data/in",
  detectPiiFields: "/system/data/v1/analyze/pii",
  generateURL: "/config/v2/files/generate-url",
  alerts: "/alertmanager/api/prometheus/grafana/api/v1/rules",
  query_metrics_series: "/prom/api/v1/series",
  logout: "/api/oauth/v1/logout",
  sourceConfig: "/config/datasets/v1/source/config/list",
  fetchConfigData: "/api/config/data",
  testConnection: "/api/connector/test",
  fetchDatasetState: "/api/dataset/state",
  datasetExport: "/config/v2/datasets/export",
  importDataset: "/config/v2/datasets/import",
  datasetDiff: "/api/dataset/diff",
  fetchObjectMetadata: "/config/connector/v1/metadata/read/:datasetId"
};
