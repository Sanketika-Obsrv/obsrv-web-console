import * as _ from 'lodash';
import dayjs from 'dayjs';
import prettyMilliseconds from 'pretty-ms';
import endpoints from '../../constants/Enpoints';

const dateFormat = 'YYYY-MM-DDT00:00:00+05:30';

export default {
  minProcessingTime: {
    query: {
      id: 'minProcessingTime',
      type: 'api',
      url: endpoints.druidNativeQuery,
      method: 'POST',
      headers: {},
      noParams: true,
      body: {
        context: {
          dataSource: 'system-events',
        },
        query: {
          queryType: 'topN',
          dataSource: 'system-events',
          virtualColumns: [
            {
              type: 'expression',
              name: 'v0',
              expression:
                'case_searched((count > 0),(total_processing_time/count),0',
              outputType: 'DOUBLE',
            },
          ],
          threshold: 100,
          dimension: {
            type: 'default',
            dimension: 'dataset',
            outputName: 'dataset',
            outputType: 'STRING',
          },
          metric: {
            type: 'numeric',
            metric: 'min_processing_time',
          },
          intervals: ['$interval'],
          granularity: {
            type: 'all',
            timeZone: 'Asia/Kolkata',
          },
          aggregations: [
            {
              type: 'doubleMin',
              name: 'min_processing_time',
              fieldName: 'v0',
            },
          ],
          filter: {
            type: 'and',
            fields: [
              {
                type: 'selector',
                dimension: 'ctx_module',
                value: 'processing',
              },
              {
                type: 'selector',
                dimension: 'ctx_dataset_type',
                value: 'dataset',
              },
              {
                type: 'selector',
                dimension: 'ctx_pdata_id',
                value: 'DruidRouterJob',
              },
              {
                type: 'selector',
                dimension: 'error_code',
                value: null,
              },
            ],
          },
        },
      },
      params: {},
      parse: (response: any) => {
        const min_processing_time = _.get(
          response,
          'result[0].result[0].min_processing_time',
        );
        if (!min_processing_time) return [prettyMilliseconds(0)];
        return prettyMilliseconds(_.floor(min_processing_time));
      },
      error() {
        return [prettyMilliseconds(0)];
      },
      context: (query: any) => {
        const strPayload = JSON.stringify(query.body);
        const start = dayjs().format(dateFormat);
        const end = dayjs().add(1, 'day').format(dateFormat);
        const interval = `${start}/${end}`;
        const updatedStrPayload = _.replace(strPayload, '$interval', interval);
        const updatedPayload = JSON.parse(updatedStrPayload);
        query.body = updatedPayload;
        return query;
      },
    },
  },
  maxProcessingTime: {
    query: {
      id: 'maxProcessingTime',
      type: 'api',
      url: endpoints.druidNativeQuery,
      method: 'POST',
      headers: {},
      noParams: true,
      body: {
        context: {
          dataSource: 'system-events',
        },
        query: {
          queryType: 'topN',
          dataSource: 'system-events',
          virtualColumns: [
            {
              type: 'expression',
              name: 'v0',
              expression:
                'case_searched((count > 0),(total_processing_time/count),0',
              outputType: 'DOUBLE',
            },
          ],
          threshold: 100,
          dimension: {
            type: 'default',
            dimension: 'dataset',
            outputName: 'dataset',
            outputType: 'STRING',
          },
          metric: {
            type: 'numeric',
            metric: 'max_processing_time',
          },
          intervals: '$interval',
          granularity: {
            type: 'all',
            timeZone: 'Asia/Kolkata',
          },
          aggregations: [
            {
              type: 'doubleMax',
              name: 'max_processing_time',
              fieldName: 'v0',
            },
          ],
          filter: {
            type: 'and',
            fields: [
              {
                type: 'selector',
                dimension: 'ctx_module',
                value: 'processing',
              },
              {
                type: 'selector',
                dimension: 'ctx_dataset_type',
                value: 'dataset',
              },
              {
                type: 'selector',
                dimension: 'ctx_pdata_id',
                value: 'DruidRouterJob',
              },
              {
                type: 'selector',
                dimension: 'error_code',
                value: null,
              },
            ],
          },
        },
      },
      params: {},
      parse: (response: any) => {
        const max_processing_time = _.get(
          response,
          'result[0].result[0].max_processing_time',
        );
        if (!max_processing_time) return [prettyMilliseconds(0)];
        return prettyMilliseconds(_.floor(max_processing_time));
      },
      error() {
        return [prettyMilliseconds(0)];
      },
      context: (query: any) => {
        const strPayload = JSON.stringify(query.body);
        const start = dayjs().format(dateFormat);
        const end = dayjs().add(1, 'day').format(dateFormat);
        const interval = `${start}/${end}`;
        const updatedStrPayload = _.replace(strPayload, '$interval', interval);
        const updatedPayload = JSON.parse(updatedStrPayload);
        query.body = updatedPayload;
        return query;
      },
    },
  },
  avgProcessingTime: {
    query: {
      id: 'avgProcessingTime',
      type: 'api',
      url: endpoints.druidNativeQuery,
      method: 'POST',
      headers: {},
      noParams: true,
      body: {
        context: {
          dataSource: 'system-events',
        },
        query: {
          queryType: 'groupBy',
          dataSource: 'system-events',
          intervals: '$interval',
          granularity: {
            type: 'all',
            timeZone: 'Asia/Kolkata',
          },
          aggregations: [
            {
              type: 'longSum',
              name: 'total_processing_time',
              fieldName: 'total_processing_time',
            },
            {
              type: 'longSum',
              name: 'count',
              fieldName: 'count',
            },
          ],
          postAggregations: [
            {
              type: 'expression',
              name: 'average_processing_time',
              expression:
                'case_searched((count > 0),(total_processing_time/count),0',
            },
          ],
          filter: {
            type: 'and',
            fields: [
              {
                type: 'selector',
                dimension: 'ctx_module',
                value: 'processing',
              },
              {
                type: 'selector',
                dimension: 'ctx_dataset_type',
                value: 'dataset',
              },
              {
                type: 'selector',
                dimension: 'ctx_pdata_id',
                value: 'DruidRouterJob',
              },
              {
                type: 'selector',
                dimension: 'error_code',
                value: null,
              },
            ],
          },
        },
      },
      params: {},
      parse: (response: any) => {
        const payload = _.get(response, 'result') || [];
        if (_.get(payload, 'length') === 0) return [prettyMilliseconds(0)];
        const sum = _.sumBy(payload, (value: any) => {
          return _.get(value, 'event.average_processing_time') || 0;
        });
        return prettyMilliseconds(sum);
      },
      error() {
        return [prettyMilliseconds(0)];
      },
      context: (query: any) => {
        const strPayload = JSON.stringify(query.body);
        const start = dayjs().format(dateFormat);
        const end = dayjs().add(1, 'day').format(dateFormat);
        const interval = `${start}/${end}`;
        const updatedStrPayload = _.replace(strPayload, '$interval', interval);
        const updatedPayload = JSON.parse(updatedStrPayload);
        query.body = updatedPayload;
        return query;
      },
    },
  },
  masterMinProcessingTime: {
    query: {
      id: 'masterMinProcessingTime',
      type: 'api',
      url: endpoints.druidNativeQuery,
      method: 'POST',
      headers: {},
      noParams: true,
      body: {
        context: {
          dataSource: 'system-events',
        },
        query: {
          queryType: 'topN',
          dataSource: 'system-events',
          virtualColumns: [
            {
              type: 'expression',
              name: 'v0',
              expression:
                'case_searched((count > 0),(total_processing_time/count),0',
              outputType: 'DOUBLE',
            },
          ],
          threshold: 100,
          dimension: {
            type: 'default',
            dimension: 'dataset',
            outputName: 'dataset',
            outputType: 'STRING',
          },
          metric: {
            type: 'numeric',
            metric: 'min_processing_time',
          },
          intervals: ['$interval'],
          granularity: {
            type: 'all',
            timeZone: 'Asia/Kolkata',
          },
          aggregations: [
            {
              type: 'doubleMin',
              name: 'min_processing_time',
              fieldName: 'v0',
            },
          ],
          filter: {
            type: 'and',
            fields: [
              {
                type: 'selector',
                dimension: 'ctx_module',
                value: 'processing',
              },
              {
                type: 'selector',
                dimension: 'ctx_dataset_type',
                value: 'master-dataset',
              },
              {
                type: 'selector',
                dimension: 'ctx_pdata_id',
                value: 'MasterDataProcessorJob',
              },
              {
                type: 'selector',
                dimension: 'error_code',
                value: null,
              },
            ],
          },
        },
      },
      params: {},
      parse: (response: any) => {
        const min_processing_time = _.get(
          response,
          'result[0].result[0].min_processing_time',
        );
        if (!min_processing_time) return [prettyMilliseconds(0)];
        return prettyMilliseconds(_.floor(min_processing_time));
      },
      error() {
        return [prettyMilliseconds(0)];
      },
      context: (query: any) => {
        const strPayload = JSON.stringify(query.body);
        const start = dayjs().format(dateFormat);
        const end = dayjs().add(1, 'day').format(dateFormat);
        const interval = `${start}/${end}`;
        const updatedStrPayload = _.replace(strPayload, '$interval', interval);
        const updatedPayload = JSON.parse(updatedStrPayload);
        query.body = updatedPayload;
        return query;
      },
    },
  },
  masterMaxProcessingTime: {
    query: {
      id: 'masterMaxProcessingTime',
      type: 'api',
      url: endpoints.druidNativeQuery,
      method: 'POST',
      headers: {},
      noParams: true,
      body: {
        context: {
          dataSource: 'system-events',
        },
        query: {
          queryType: 'topN',
          dataSource: 'system-events',
          virtualColumns: [
            {
              type: 'expression',
              name: 'v0',
              expression:
                'case_searched((count > 0),(total_processing_time/count),0',
              outputType: 'DOUBLE',
            },
          ],
          threshold: 100,
          dimension: {
            type: 'default',
            dimension: 'dataset',
            outputName: 'dataset',
            outputType: 'STRING',
          },
          metric: {
            type: 'numeric',
            metric: 'max_processing_time',
          },
          intervals: '$interval',
          granularity: {
            type: 'all',
            timeZone: 'Asia/Kolkata',
          },
          aggregations: [
            {
              type: 'doubleMax',
              name: 'max_processing_time',
              fieldName: 'v0',
            },
          ],
          filter: {
            type: 'and',
            fields: [
              {
                type: 'selector',
                dimension: 'ctx_module',
                value: 'processing',
              },
              {
                type: 'selector',
                dimension: 'ctx_dataset_type',
                value: 'master-dataset',
              },
              {
                type: 'selector',
                dimension: 'ctx_pdata_id',
                value: 'MasterDataProcessorJob',
              },
              {
                type: 'selector',
                dimension: 'error_code',
                value: null,
              },
            ],
          },
        },
      },
      params: {},
      parse: (response: any) => {
        const max_processing_time = _.get(
          response,
          'result[0].result[0].max_processing_time',
        );
        if (!max_processing_time) return [prettyMilliseconds(0)];
        return prettyMilliseconds(_.floor(max_processing_time));
      },
      error() {
        return [prettyMilliseconds(0)];
      },
      context: (query: any) => {
        const strPayload = JSON.stringify(query.body);
        const start = dayjs().format(dateFormat);
        const end = dayjs().add(1, 'day').format(dateFormat);
        const interval = `${start}/${end}`;
        const updatedStrPayload = _.replace(strPayload, '$interval', interval);
        const updatedPayload = JSON.parse(updatedStrPayload);
        query.body = updatedPayload;
        return query;
      },
    },
  },
  masterAvgProcessingTime: {
    query: {
      id: 'masterAvgProcessingTime',
      type: 'api',
      url: endpoints.druidNativeQuery,
      method: 'POST',
      headers: {},
      noParams: true,
      body: {
        context: {
          dataSource: 'system-events',
        },
        query: {
          queryType: 'groupBy',
          dataSource: 'system-events',
          intervals: '$interval',
          granularity: {
            type: 'all',
            timeZone: 'Asia/Kolkata',
          },
          aggregations: [
            {
              type: 'longSum',
              name: 'total_processing_time',
              fieldName: 'total_processing_time',
            },
            {
              type: 'longSum',
              name: 'count',
              fieldName: 'count',
            },
          ],
          postAggregations: [
            {
              type: 'expression',
              name: 'average_processing_time',
              expression:
                'case_searched((count > 0),(total_processing_time/count),0',
            },
          ],
          filter: {
            type: 'and',
            fields: [
              {
                type: 'selector',
                dimension: 'ctx_module',
                value: 'processing',
              },
              {
                type: 'selector',
                dimension: 'ctx_dataset_type',
                value: 'master-dataset',
              },
              {
                type: 'selector',
                dimension: 'ctx_pdata_id',
                value: 'MasterDataProcessorJob',
              },
              {
                type: 'selector',
                dimension: 'error_code',
                value: null,
              },
            ],
          },
        },
      },
      params: {},
      parse: (response: any) => {
        const payload = _.get(response, 'result') || [];
        if (_.get(payload, 'length') === 0) return [prettyMilliseconds(0)];
        const sum = _.sumBy(payload, (value) => {
          return _.get(value, 'event.average_processing_time') || 0;
        });
        return [prettyMilliseconds(sum)];
      },
      error() {
        return [prettyMilliseconds(0)];
      },
      context: (query: any) => {
        const strPayload = JSON.stringify(query.body);
        const start = dayjs().format(dateFormat);
        const end = dayjs().add(1, 'day').format(dateFormat);
        const interval = `${start}/${end}`;
        const updatedStrPayload = _.replace(strPayload, '$interval', interval);
        const updatedPayload = JSON.parse(updatedStrPayload);
        query.body = updatedPayload;
        return query;
      },
    },
  },
};
