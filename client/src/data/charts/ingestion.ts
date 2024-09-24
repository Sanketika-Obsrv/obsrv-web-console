import * as _ from 'lodash';
import dayjs from 'dayjs';
import defaultConf from './common';
import endpoints from 'data/apiEndpoints';

const dateFormat = 'YYYY-MM-DDT00:00:00+05:30'

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
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "groupBy",
                    "dataSource": "system-events",
                    "granularity": {
                        "type": "all",
                        "timeZone": "Asia/Kolkata",
                    },
                    "intervals": [
                        "$interval",
                    ],
                    "aggregations": [
                        {
                            "type": "longSum",
                            "name": "count",
                            "fieldName": "count",
                        },
                    ],
                    "filter": {
                        "type": "and",
                        "fields": [
                            {
                                "type": "selector",
                                "dimension": "ctx_module",
                                "value": "processing"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_pdata_id",
                                "value": "DruidRouterJob"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_dataset_type",
                                "value": "dataset"
                            },
                            {
                                "type": "selector",
                                "dimension": "error_code",
                                "value": null
                            }
                        ]
                    }
                },
            },
            params: {},
            parse: (response: any) => {
                const payload = _.get(response, 'result') || [];
                if (_.get(payload, 'length') === 0) return [0, "primary"];
                return _.sumBy(payload, value => _.get(value, 'event.count') || 0)
            },
            error() {
                return [0, "error"];
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
    totalEventsProcessedTimeSeries: {
        type: 'line',
        series: [],
        options: {
            chart: {
                ...defaultConf.defaultChartConfigurations,
                type: 'line',
                animations: defaultConf.animations,
                toolbar: {
                    show: false
                }
            },
            grid: defaultConf.grid,
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            legend: {
                show: false
            },
            zoom: {
                enabled: false
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return value;
                    }
                },
                title: {
                    text: "Count"
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(value: number) {
                        if (typeof value === 'number') return defaultConf.timestampLabelFormatter(value)
                        return defaultConf.timestampLabelFormatterv2(value);
                    }
                }
            },
            xaxis: {
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {
                        if (typeof timestamp === 'number') {
                            return defaultConf.timestampLabelFormatter(timestamp);
                        }

                        return defaultConf.timestampLabelFormatterv2(timestamp);
                    }
                },
                tooltip: {
                    enabled: false
                },
                title: {
                    text: "Time"
                }
            }
        },
        query: {
            id: 'totalEventsProcessedTimeseries',
            type: 'api',
            url: `${endpoints.druidNativeQuery}/dataset`,
            method: 'POST',
            headers: {},
            body: {
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "timeseries",
                    "dataSource": "system-events",
                    "intervals": "$interval",
                    "granularity": {
                        "type": "period",
                        "period": "PT5M",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "longSum",
                            "name": "count",
                            "fieldName": "count"
                        }
                    ],
                    "filter": {
                        "type": "and",
                        "fields": [
                            {
                                "type": "selector",
                                "dimension": "ctx_module",
                                "value": "processing"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_dataset_type",
                                "value": "dataset"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_pdata_id",
                                "value": "DruidRouterJob"
                            },
                            {
                                "type": "selector",
                                "dimension": "error_code",
                                "value": null
                            }
                        ]
                    }
                }
            },
            params: {},
            parse: (response: any) => {
                const payload = _.get(response, 'result') || [];

                const series = _.map(payload, value => {
                    const timestamp = dayjs(_.get(value, 'timestamp')).unix();
                    const count = _.get(value, 'result.count')
                    return [timestamp, count];
                });

                return [{
                    name: 'Total Events Processed',
                    data: series
                }]
            },
            error() {
                return [];
            },
            context: (payload: any) => {
                const { body, metadata = {} } = payload;
                const { interval = 1140 } = metadata;
                const strPayload = JSON.stringify(body);
                const start = dayjs().subtract(interval - 1140, 'minutes').format(dateFormat);
                const end = dayjs().add(1, 'day').format(dateFormat);
                const rangeInterval = `${start}/${end}`;
                const updatedStrPayload = _.replace(strPayload, '$interval', rangeInterval);
                const updatedPayload = JSON.parse(updatedStrPayload);
                payload.body = updatedPayload;
                return payload;
            },
            noParams: true
        }
    },
    totalEventsProcessedTimeSeriesPerDataset: {
        type: 'line',
        series: [],
        options: {
            chart: {
                ...defaultConf.defaultChartConfigurations,
                type: 'line',
                animations: defaultConf.animations,
                toolbar: {
                    show: false
                }
            },
            grid: defaultConf.grid,
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            legend: {
                show: false
            },
            zoom: {
                enabled: false
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return value;
                    }
                },
                title: {
                    text: "Count"
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(value: any) {
                        if (typeof value === 'number') {
                            return defaultConf.timestampLabelFormatter(value);
                        }

                        return defaultConf.timestampLabelFormatterv2(value);
                    }
                }
            },
            xaxis: {
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {

                        if (typeof timestamp === 'number') {
                            return defaultConf.timestampLabelFormatter(timestamp);
                        }

                        return defaultConf.timestampLabelFormatterv2(timestamp);
                    }
                },
                tooltip: {
                    enabled: false
                },
                title: {
                    text: "Time"
                }
            }
        },
        query: {
            id: 'totalEventsProcessedTimeseriesPerDataset',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            body: {
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "timeseries",
                    "dataSource": "system-events",
                    "intervals": "$interval",
                    "granularity": {
                        "type": "period",
                        "period": "PT5M",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "longSum",
                            "name": "count",
                            "fieldName": "count"
                        }
                    ],
                    "filter": {
                        "type": "and",
                        "fields": [
                            {
                                "type": "selector",
                                "dimension": "ctx_module",
                                "value": "processing"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_dataset",
                                "value": "$datasetId"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_pdata_id",
                                "value": "DruidRouterJob"
                            },
                            {
                                "type": "selector",
                                "dimension": "error_code",
                                "value": null
                            }
                        ]
                    }
                }
            },
            params: {},
            parse: (response: any) => {
                const payload = _.get(response, 'result') || [];
                const series = _.map(payload, value => {
                    const timestamp = dayjs(_.get(value, 'timestamp')).unix();
                    const count = _.get(value, 'result.count')
                    return [timestamp, count];
                });

                return [{
                    name: 'Total Events Processed',
                    data: series
                }]
            },
            error() {
                return [];
            },
            context: (payload: any) => {
                const { body, metadata = {} } = payload;
                const { interval = 1140 } = metadata;
                const strPayload = JSON.stringify(body);
                const start = dayjs().subtract(interval - 1140, 'minutes').format(dateFormat);
                const end = dayjs().add(1, 'day').format(dateFormat);
                const rangeInterval = `${start}/${end}`;
                const updatedStrPayload = _.replace(strPayload, '$interval', rangeInterval);
                const updatedPayload = JSON.parse(updatedStrPayload);
                payload.body = updatedPayload;
                return payload;
            },
            noParams: true
        }
    },
    totalEventsProcessedTimeSeriesPerMasterDataset: {
        type: 'line',
        series: [],
        options: {
            chart: {
                ...defaultConf.defaultChartConfigurations,
                type: 'line',
                animations: defaultConf.animations,
                toolbar: {
                    show: false
                }
            },
            grid: defaultConf.grid,
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            legend: {
                show: false
            },
            zoom: {
                enabled: false
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return value;
                    }
                },
                title: {
                    text: "Count"
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(value: any) {
                        if (typeof value === 'number') {
                            return defaultConf.timestampLabelFormatter(value);
                        }

                        return defaultConf.timestampLabelFormatterv2(value);
                    }
                }
            },
            xaxis: {
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {

                        if (typeof timestamp === 'number') {
                            return defaultConf.timestampLabelFormatter(timestamp);
                        }

                        return defaultConf.timestampLabelFormatterv2(timestamp);
                    }
                },
                tooltip: {
                    enabled: false
                },
                title: {
                    text: "Time"
                }
            }
        },
        query: {
            id: 'totalEventsProcessedTimeSeriesPerMasterDataset',
            type: 'api',
            timeout: 3000,
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            body: {
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "timeseries",
                    "dataSource": "system-events",
                    "intervals": "$interval",
                    "granularity": {
                        "type": "period",
                        "period": "PT5M",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "longSum",
                            "name": "count",
                            "fieldName": "count"
                        }
                    ],
                    "filter": {
                        "type": "and",
                        "fields": [
                            {
                                "type": "selector",
                                "dimension": "ctx_module",
                                "value": "processing"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_dataset",
                                "value": "$datasetId"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_pdata_id",
                                "value": "MasterDataProcessorJob"
                            },
                            {
                                "type": "selector",
                                "dimension": "error_code",
                                "value": null
                            }
                        ]
                    }
                }
            },
            params: {},
            parse: (response: any) => {
                const payload = _.get(response, 'result') || [];
                const series = _.map(payload, value => {
                    const timestamp = dayjs(_.get(value, 'timestamp')).unix();
                    const count = _.get(value, 'result.count')
                    return [timestamp, count];
                });

                return [{
                    name: 'Total Events Processed',
                    data: series
                }]
            },
            error() {
                return [];
            },
            context: (payload: any) => {
                const { body, metadata = {} } = payload;
                const { interval = 1140 } = metadata;
                const strPayload = JSON.stringify(body);
                const start = dayjs().subtract(interval - 1140, 'minutes').format(dateFormat);
                const end = dayjs().add(1, 'day').format(dateFormat);
                const rangeInterval = `${start}/${end}`;
                const updatedStrPayload = _.replace(strPayload, '$interval', rangeInterval);
                const updatedPayload = JSON.parse(updatedStrPayload);
                payload.body = updatedPayload;
                return payload;
            },
            noParams: true
        }
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
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "groupBy",
                    "dataSource": "system-events",
                    "granularity": {
                        "type": "all",
                        "timeZone": "Asia/Kolkata",
                    },
                    "intervals": [
                        "$interval",
                    ],
                    "aggregations": [
                        {
                            "type": "longSum",
                            "name": "totalCount",
                            "fieldName": "count",
                        },
                    ],
                    "filter": {
                        "type": "and",
                        "fields": [
                            {
                                "type": "selector",
                                "dimension": "ctx_module",
                                "value": "processing"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_dataset_type",
                                "value": "master-dataset"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_pdata_id",
                                "value": "MasterDataProcessorJob"
                            },
                            {
                                "type": "selector",
                                "dimension": "error_code",
                                "value": null
                            }
                        ]
                    }
                },
            },
            params: {},
            parse: (response: any) => {
                const payload = _.get(response, 'result') || [];
                if (_.get(payload, 'length') === 0) return [0, "primary"];
                return _.sumBy(payload, value => _.get(value, 'event.totalCount') || 0)
            },
            error() {
                return [0, "error"];
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
    masterTotalEventsProcessedTimeSeries: {
        type: 'line',
        series: [],
        options: {
            chart: {
                ...defaultConf.defaultChartConfigurations,
                type: 'line',
                animations: defaultConf.animations,
                toolbar: {
                    show: false
                }
            },
            grid: defaultConf.grid,
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            legend: {
                show: false
            },
            zoom: {
                enabled: false
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return value;
                    }
                },
                title: {
                    text: "Count"
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(value: number) {
                        if (typeof value === 'number') return defaultConf.timestampLabelFormatter(value)
                        return defaultConf.timestampLabelFormatterv2(value);
                    }
                }
            },
            xaxis: {
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {

                        if (typeof timestamp === 'number') {
                            return defaultConf.timestampLabelFormatter(timestamp);
                        }

                        return defaultConf.timestampLabelFormatterv2(timestamp);
                    }
                },
                tooltip: {
                    enabled: false
                },
                title: {
                    text: "Time"
                }
            }
        },
        query: {
            id: 'masterTotalEventsProcessedTimeseries',
            type: 'api',
            url: `${endpoints.druidNativeQuery}/masterDataset`,
            method: 'POST',
            headers: {},
            body: {
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "timeseries",
                    "dataSource": "system-events",
                    "intervals": "$interval",
                    "granularity": {
                        "type": "period",
                        "period": "PT5M",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "longSum",
                            "name": "count",
                            "fieldName": "count"
                        }
                    ],
                    "filter": {
                        "type": "and",
                        "fields": [
                            {
                                "type": "selector",
                                "dimension": "ctx_module",
                                "value": "processing"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_dataset_type",
                                "value": "master-dataset"
                            },
                            {
                                "type": "selector",
                                "dimension": "ctx_pdata_id",
                                "value": "DruidRouterJob"
                            },
                            {
                                "type": "selector",
                                "dimension": "error_code",
                                "value": null
                            }
                        ]
                    }
                }
            },
            params: {},
            parse: (response: any) => {
                const payload = _.get(response, 'result') || [];
                const series = _.map(payload, value => {
                    const timestamp = dayjs(_.get(value, 'timestamp')).unix();
                    const count = _.get(value, 'result.count')
                    return [timestamp, count];
                });

                return [{
                    name: 'Total Events Processed',
                    data: series
                }]
            },
            error() {
                return [];
            },
            context: (payload: any) => {
                const { body, metadata = {} } = payload;
                const { interval = 1140 } = metadata;
                const strPayload = JSON.stringify(body);
                const start = dayjs().subtract(interval - 1140, 'minutes').format(dateFormat);
                const end = dayjs().add(1, 'day').format(dateFormat);
                const rangeInterval = `${start}/${end}`;
                const updatedStrPayload = _.replace(strPayload, '$interval', rangeInterval);
                const updatedPayload = JSON.parse(updatedStrPayload);
                payload.body = updatedPayload;
                return payload;
            },
            noParams: true
        }
    },
}
