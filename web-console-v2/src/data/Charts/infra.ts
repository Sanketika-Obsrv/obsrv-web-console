import promql from '../../constants/Queries';
import _ from 'lodash';
import endpoints from '../../constants/Endpoints';
import prettyMilliseconds from 'pretty-ms';
import dayjs from 'dayjs';

const payloadStartOfDay = (payload: any) => {
  const clonedPayload = _.cloneDeep(payload);
  const { params, metadata = {} } = clonedPayload;
  const query = _.get(params, 'query');
  if (query) {
    const now = dayjs();
    const minutesSinceStartOfDay = now.hour() * 60 + now.minute();
    _.set(
      params,
      'query',
      _.replace(query, /\$interval/g, `${minutesSinceStartOfDay}m`),
    );
  }
  return clonedPayload;
};
export default {
  total_nodes_count: {
    query: {
      id: 'totalNodesCount',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.cluster_total_nodes_count.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result');
        const sum = _.sumBy(result, (payload: any) => {
          const { value } = payload;
          const [_, percentage = 0] = value;
          return +percentage;
        });
        return _.floor(sum);
      },
      error() {
        return 0;
      },
    },
  },
  total_running_nodes_count: {
    query: {
      id: 'totalRunningNodesCount',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.cluster_running_nodes_count.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result');
        const sum = _.sumBy(result, (payload: any) => {
          const { value } = payload;
          const [_, percentage = 0] = value;
          return +percentage;
        });
        return _.floor(sum);
      },
      error() {
        return 0;
      },
    },
  },
  cpu_percentage: {
    query: {
      id: 'cpuUsagePercentage',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.cpu_percentage.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result');
        const sum = _.sumBy(result, (payload: any) => {
          const { value } = payload;
          const [_, percentage = 0] = value;
          return +percentage;
        });
        return result?.length ? _.floor((sum / result?.length) * 100) : 0;
      },
      error() {
        return 0;
      },
    },
  },
  pv_usage_percent: {
    query: {
      id: 'pvUsagePercentage',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.pv_usage_percent.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result[0].value[1]');
        if (!result) throw new Error();
        return _.floor(result, 0);
      },
      error() {
        return '0';
      },
    },
  },
  memory_percentage: {
    query: {
      id: 'memoryUsagePercentage',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.memory_percentage.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result');
        const sum = _.sumBy(result, (payload: any) => {
          const { value } = payload;
          const [_, percentage = 0] = value;
          return +percentage;
        });
        return result?.length ? _.floor((sum / result?.length) * 100) : 0;
      },
      error() {
        return 0;
      },
    },
  },
  totalCpuCores: {
    query: {
      id: 'totalCpuCores',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.totalCpuCores.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result');
        const sum = _.sumBy(result, (payload: any) => {
          const { value } = payload;
          const [_, percentage = 0] = value;
          return +percentage;
        });
        return _.floor(sum);
      },
      error() {
        return 0;
      },
    },
  },

  api_health: {
    query: {
      id: 'apiFailurePercentage',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.api_failure_percentage.query,
      },
      parse: (response: any) => {
        const value = _.get(response, 'data.result[0].value[1]') || 0;
        if (value === 0) return ['Healthy'];
        if (value > 1) return ['Unhealthy'];
        if (value > 0.1 && value <= 1) return ['Healthy'];
        return ['Healthy'];
      },
      error() {
        return ['Unhealthy'];
      },
      context: (payload: any) => {
        return payloadStartOfDay(payload);
      },
    },
  },
  node_query_response_time_max: {
    query: {
      id: 'apiResponseTimeAvg',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.node_query_response_time_max.query,
      },
      parse: (response: any) => {
        const value = _.get(response, 'data.result[0].value[1]') || 0;
        return prettyMilliseconds(+value);
      },
      error() {
        return [prettyMilliseconds(0)];
      },
      context: (payload: any) => {
        return payloadStartOfDay(payload);
      },
    },
  },
  node_query_response_time_avg: {
    query: {
      id: 'apiResponseTimeAvg',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.node_query_response_time_avg.query,
      },
      parse: (response: any) => {
        const value = _.get(response, 'data.result[0].value[1]') || 0;
        return prettyMilliseconds(+value);
      },
      error() {
        return [prettyMilliseconds(0)];
      },
      context: (payload: any) => {
        return payloadStartOfDay(payload);
      },
    },
  },
  api_failure_percent: {
    query: {
      id: 'apiFailurePercentage',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.api_failure_percentage.query,
      },
      parse: (response: any) => {
        const value = _.get(response, 'data.result[0].value[1]') || 0;
        return `${_.floor(value, 0)}%`;
      },
      error() {
        return ['0%'];
      },
      context: (payload: any) => {
        return payloadStartOfDay(payload);
      },
    },
  },
};
