import endpoints from '../../constants/Enpoints';
import _ from 'lodash';
import dayjs from 'dayjs';
const dateFormat = 'YYYY-MM-DDT00:00:00+05:30';

export default {
  totalEventsProcessedToday: {
    query: {
      id: 'totalEventsProcessedToday',
      type: 'api',
      url: `${endpoints.druidNativeQuery}/dataset`,
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
          granularity: {
            type: 'all',
            timeZone: 'Asia/Kolkata',
          },
          intervals: ['$interval'],
          aggregations: [
            {
              type: 'longSum',
              name: 'count',
              fieldName: 'count',
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
                dimension: 'ctx_pdata_id',
                value: 'DruidRouterJob',
              },
              {
                type: 'selector',
                dimension: 'ctx_dataset_type',
                value: 'dataset',
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
        if (_.get(payload, 'length') === 0) return [0, 'primary'];
        return _.sumBy(payload, (value) => _.get(value, 'event.count') || 0);
      },
      error() {
        return [0];
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
  masterTotalEventsProcessedToday: {
    query: {
      id: 'masterTotalEventsProcessedToday',
      type: 'api',
      url: `${endpoints.druidNativeQuery}/masterDataset`,
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
          granularity: {
            type: 'all',
            timeZone: 'Asia/Kolkata',
          },
          intervals: ['$interval'],
          aggregations: [
            {
              type: 'longSum',
              name: 'totalCount',
              fieldName: 'count',
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
        if (_.get(payload, 'length') === 0) return [0, 'primary'];
        return _.sumBy(
          payload,
          (value) => _.get(value, 'event.totalCount') || 0,
        );
      },
      error() {
        return [0];
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
