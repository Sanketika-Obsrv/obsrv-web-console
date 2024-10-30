import endpoints from '../constants/Enpoints';

import { IChartFetchRequest } from '../types/metadata';
import { http } from './http';

export const fetchMetricData = (
  config: Partial<IChartFetchRequest>,
  metadata: Record<string, any> = {},
) => {
  if (config.context) {
    config = config.context({ ...config, metadata });
  }
  const { parse = (response) => response, error } = config;
  const chartUUID = config.id || metadata.uuid;
  return http
    .post(
      endpoints.infrastructureMetricsURL,
      { query: config },
      { params: { ...(chartUUID && { id: chartUUID }) } },
    )
    .then((response) => response.data)
    .then((response) => parse(response))
    .catch((err) => {
      if (error) return error();
      throw err;
    });
};

export const fetchMultipleMetrics = (
  queries: Partial<IChartFetchRequest>[],
  metadata: Record<string, any> = {},
) => {
  return Promise.all(queries.map((query) => fetchMetricData(query, metadata)));
};
