import { IChartFetchRequest } from 'types/metadata';
import { http } from './http'
import { v4 } from 'uuid';

export const fetchChartData = (config: Partial<IChartFetchRequest>, metadata: Record<string, any> = {}) => {
    if (config.context) { config = config.context({ ...config, metadata }) }
    let { parse = (response => response), error } = config;
    const uuid = v4();
    const chartUUID = config.id || metadata.uuid;
    return http.post(`/config/v2/data/metrics`,
        { query: config },
        { params: { ...chartUUID && { id: chartUUID } } })
        .then(response => response.data)
        .then(response => parse(response))
        .catch(err => {
            if (error) return error();
            throw err;
        })
}

export const fetchMultipleMetrics = (queries: Partial<IChartFetchRequest>[], metadata: Record<string, any> = {}) => {
    return Promise.all(queries.map(query => fetchChartData(query, metadata)));
}

