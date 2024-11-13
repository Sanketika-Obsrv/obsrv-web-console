import * as _ from 'lodash';
import prettyBytes from 'pretty-bytes';
import dayjs from 'dayjs';
import promql from '../../constants/Queries';
import endpoints from '../../constants/Enpoints';
import prettyMilliseconds from 'pretty-ms';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export default {
  backup_count: {
    query: {
        id: 'backCount',
        type: 'api',
        url: endpoints.prometheusRead,
        method: 'GET',
        headers: {},
        body: {},
        params: {
            query: promql.backupCount.query
        },
        parse: (response: any) => {
            const result = _.get(response, 'data.result');
            const count = _.sumBy(result, (payload: any) => _.get(payload, 'value[1]'))
            if (!count) throw new Error();
            return _.floor(count);
        },
        error() {
            return 0
        }
    }
},
  deep_storage_total: {
    query: {
      id: 'deepStorageTotalSize',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.deep_storage_total.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result[0].value[1]');
        if (!result) throw new Error();
        return prettyBytes(+result);
      },
      error() {
        return prettyBytes(0);
      },
    },
  },

  backup_success_rate: {
    query: {
      id: 'backupSuccessRate',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.backupSuccessRate.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result[0].value[1]');
        if (!result) throw new Error();
        return _.floor(result * 100);
      },
      error() {
        return 0;
      },
    },
  },
  postgres_backup_files: {
    query: {
      id: 'postgresBackupFiles',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.postgres_backup_files.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result[0].value[1]');
        if (!result) throw new Error();
        return result;
      },
      error() {
        return 0;
      },
    },
  },
  redis_backup_files: {
    query: {
      id: 'redisBackupFiles',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.redis_backup_files.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result[0].value[1]');
        if (!result) throw new Error();
        return result;
      },
      error() {
        return 0;
      },
    },
  },
  postgres_last_backup_time: {
    query: {
      id: 'postgresLastBackupTime',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.postgres_last_backup_time.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result[0].value[1]');
        if (!result) throw new Error();
        const date = dayjs().subtract(result * 1000, 'milliseconds');
        const timeAgo = date.fromNow();
        return timeAgo
      },
      error() {
        return prettyMilliseconds(0);
      },
    },
  },
  redis_last_backup_time: {
    query: {
      id: 'redisLastBackupTime',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.redis_last_backup_time.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result[0].value[1]');
        if (!result) throw new Error();
        const date = dayjs().subtract(result * 1000, 'milliseconds');
        const timeAgo = date.fromNow();
        return timeAgo
      },
      error() {
        return prettyMilliseconds(0);
      },
    },
  },
  cluster_last_backup_time: {
    query: {
      id: 'clusterLastBackupTime',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.cluster_last_backup_time.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result[0].value[1]');
        if (!result) throw new Error();
        const date = dayjs().subtract(result * 1000, 'milliseconds');
        const timeAgo = date.fromNow();
        return timeAgo
      },
      error() {
        return prettyMilliseconds(0);
      },
    },
  },
  pv_total_size: {
    query: {
      id: 'pvTotalSize',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.pv_total_size.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result[0].value[1]');
        if (!result) throw new Error();
        return prettyBytes(+result);
      },
      error() {
        return prettyBytes(0);
      },
    },
  },
  pv_used_size: {
    query: {
      id: 'pvUsedSize',
      type: 'api',
      url: endpoints.prometheusRead,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.pv_used_size.query,
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result[0].value[1]');
        if (!result) throw new Error();
        return prettyBytes(+result);
      },
      error() {
        return prettyBytes(0);
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
        return `${_.floor(result, 0)}%`;
      },
      error() {
        return '0%';
      },
    },
  },
};
