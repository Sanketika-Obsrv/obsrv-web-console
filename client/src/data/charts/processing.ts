import * as _ from 'lodash';
import dayjs from 'dayjs';
import defaultConf from './common';
import prettyMilliseconds from 'pretty-ms';
import endpoints from 'data/apiEndpoints';

const dateFormat = 'YYYY-MM-DDT00:00:00+05:30'

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
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "topN",
                    "dataSource": "system-events",
                    "virtualColumns": [
                        {
                            "type": "expression",
                            "name": "v0",
                            "expression": "case_searched((count > 0),(total_processing_time/count),0",
                            "outputType": "DOUBLE"
                        }
                    ],
                    "threshold": 100,
                    "dimension": {
                        "type": "default",
                        "dimension": "dataset",
                        "outputName": "dataset",
                        "outputType": "STRING"
                    },
                    "metric": {
                        "type": "numeric",
                        "metric": "min_processing_time"
                    },
                    "intervals": ["$interval"],
                    "granularity": {
                        "type": "all",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "doubleMin",
                            "name": "min_processing_time",
                            "fieldName": "v0"
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
                const min_processing_time = _.get(response, 'result[0].result[0].min_processing_time');
                if (!min_processing_time) return [prettyMilliseconds(0), "primary"];
                return prettyMilliseconds(_.floor(min_processing_time));
            },
            error() {
                return [prettyMilliseconds(0), "error"];
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
            }
        }
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
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "topN",
                    "dataSource": "system-events",
                    "virtualColumns": [
                        {
                            "type": "expression",
                            "name": "v0",
                            "expression": "case_searched((count > 0),(total_processing_time/count),0",
                            "outputType": "DOUBLE"
                        }
                    ],
                    "threshold": 100,
                    "dimension": {
                        "type": "default",
                        "dimension": "dataset",
                        "outputName": "dataset",
                        "outputType": "STRING"
                    },
                    "metric": {
                        "type": "numeric",
                        "metric": "max_processing_time"
                    },
                    "intervals": "$interval",
                    "granularity": {
                        "type": "all",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "doubleMax",
                            "name": "max_processing_time",
                            "fieldName": "v0"
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
                const max_processing_time = _.get(response, 'result[0].result[0].max_processing_time');
                if (!max_processing_time) return [prettyMilliseconds(0), "primary"];
                return prettyMilliseconds(_.floor(max_processing_time));
            },
            error() {
                return [prettyMilliseconds(0), "error"];
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
            }
        }
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
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "groupBy",
                    "dataSource": "system-events",
                    "intervals": "$interval",
                    "granularity": {
                        "type": "all",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "longSum",
                            "name": "total_processing_time",
                            "fieldName": "total_processing_time"
                        },
                        {
                            "type": "longSum",
                            "name": "count",
                            "fieldName": "count"
                        }
                    ],
                    "postAggregations": [
                        {
                            "type": "expression",
                            "name": "average_processing_time",
                            "expression": "case_searched((count > 0),(total_processing_time/count),0",
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
                if (_.get(payload, 'length') === 0) return [prettyMilliseconds(0), "primary"];
                const sum = _.sumBy(payload, (value: any) => {
                    return _.get(value, 'event.average_processing_time') || 0;
                })
                return prettyMilliseconds(sum)
            },
            error() {
                return [prettyMilliseconds(0), "error"];
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
            }
        }
    },
    minProcessingTimeSeries: {
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
                show: true
            },
            zoom: {
                enabled: false
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return prettyMilliseconds(value);
                    }
                },
                title: {
                    text: "Processing Time (seconds)"
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(timestamp: number) {
                        if (typeof timestamp === 'number') {
                            return defaultConf.timestampLabelFormatter(timestamp);
                        }

                        return defaultConf.timestampLabelFormatterv2(timestamp);
                    }
                },
                y: {
                    show: true,
                    formatter(value: number) {
                        return prettyMilliseconds(value);
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
            id: 'minProcessingTimeTimeseries',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            noParams: true,
            body: {
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "timeseries",
                    "dataSource": "system-events",
                    "virtualColumns": [
                        {
                            "type": "expression",
                            "name": "v0",
                            "expression": "case_searched((count > 0),(total_processing_time/count),0",
                            "outputType": "DOUBLE"
                        }
                    ],
                    "intervals": "$interval",
                    "granularity": {
                        "type": "period",
                        "period": "PT5M",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "doubleMin",
                            "name": "min_processing_time",
                            "fieldName": "v0"
                        },
                        {
                            "type": "doubleMax",
                            "name": "max_processing_time",
                            "fieldName": "v0"
                        },
                        {
                            "type": "doubleSum",
                            "name": "a2",
                            "fieldName": "total_processing_time"
                        },
                        {
                            "type": "longSum",
                            "name": "a3",
                            "fieldName": "count"
                        }
                    ],
                    "postAggregations": [
                        {
                            "type": "expression",
                            "name": "avg_processing_time",
                            "expression": "case_searched((a3 > 0),(a2/a3),0",
                            "outputType": "DOUBLE"
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

                const getSeries = (key: string) => {
                    return _.map(payload, value => {
                        const timestamp = dayjs(_.get(value, 'timestamp')).unix();
                        let counter = _.get(value, ['result', key]) || 0;
                        if (_.includes(_.lowerCase(counter), "infinity")) {
                            counter = 0;
                        }
                        return [timestamp, counter];
                    });
                }

                return [
                    {
                        name: 'Min Processing Time',
                        data: getSeries('min_processing_time')
                    },
                    {
                        name: 'Max Processing Time',
                        data: getSeries('max_processing_time')
                    },
                    {
                        name: 'Avg Processing Time',
                        data: getSeries('avg_processing_time')
                    }
                ]
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
            }
        }
    },
    masterMinProcessingTimeSeries: {
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
                show: true
            },
            zoom: {
                enabled: false
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return prettyMilliseconds(value);
                    }
                },
                title: {
                    text: "Processing Time (seconds)"
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(timestamp: number) {
                        if (typeof timestamp === 'number') {
                            return defaultConf.timestampLabelFormatter(timestamp);
                        }

                        return defaultConf.timestampLabelFormatterv2(timestamp);
                    }
                },
                y: {
                    show: true,
                    formatter(value: number) {
                        return prettyMilliseconds(value);
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
            id: 'masterMinProcessingTimeTimeseries',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            noParams: true,
            body: {
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "timeseries",
                    "dataSource": "system-events",
                    "virtualColumns": [
                        {
                            "type": "expression",
                            "name": "v0",
                            "expression": "case_searched((count > 0),(total_processing_time/count),0",
                            "outputType": "DOUBLE"
                        }
                    ],
                    "intervals": "$interval",
                    "granularity": {
                        "type": "period",
                        "period": "PT5M",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "doubleMin",
                            "name": "min_processing_time",
                            "fieldName": "v0"
                        },
                        {
                            "type": "doubleMax",
                            "name": "max_processing_time",
                            "fieldName": "v0"
                        },
                        {
                            "type": "doubleSum",
                            "name": "a2",
                            "fieldName": "total_processing_time"
                        },
                        {
                            "type": "longSum",
                            "name": "a3",
                            "fieldName": "count"
                        }
                    ],
                    "postAggregations": [
                        {
                            "type": "expression",
                            "name": "avg_processing_time",
                            "expression": "case_searched((a3 > 0),(a2/a3),0",
                            "outputType": "DOUBLE"
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

                const getSeries = (key: string) => {
                    return _.map(payload, value => {
                        const timestamp = dayjs(_.get(value, 'timestamp')).unix();
                        let counter = _.get(value, ['result', key]) || 0;
                        if (_.includes(_.lowerCase(counter), "infinity")) {
                            counter = 0;
                        }
                        return [timestamp, counter];
                    });
                }

                return [
                    {
                        name: 'Min Processing Time',
                        data: getSeries('min_processing_time')
                    },
                    {
                        name: 'Max Processing Time',
                        data: getSeries('max_processing_time')
                    },
                    {
                        name: 'Avg Processing Time',
                        data: getSeries('avg_processing_time')
                    }
                ]
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
            }
        }
    },
    minProcessingTimeSeriesPerDataset: {
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
                show: true
            },
            zoom: {
                enabled: false
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return prettyMilliseconds(value);
                    }
                },
                title: {
                    text: "Processing Time (seconds)"
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(timestamp: number) {
                        if (typeof timestamp === 'number') {
                            return defaultConf.timestampLabelFormatter(timestamp);
                        }

                        return defaultConf.timestampLabelFormatterv2(timestamp);
                    }
                },
                y: {
                    show: true,
                    formatter(value: number) {
                        return prettyMilliseconds(value);
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
            id: 'minProcessingTimeSeriesPerDataset',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            noParams: true,
            body: {
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "timeseries",
                    "dataSource": "system-events",
                    "virtualColumns": [
                        {
                            "type": "expression",
                            "name": "v0",
                            "expression": "case_searched((count > 0),(total_processing_time/count),0",
                            "outputType": "DOUBLE"
                        }
                    ],
                    "intervals": "$interval",
                    "granularity": {
                        "type": "period",
                        "period": "PT5M",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "doubleMin",
                            "name": "min_processing_time",
                            "fieldName": "v0"
                        },
                        {
                            "type": "doubleMax",
                            "name": "max_processing_time",
                            "fieldName": "v0"
                        },
                        {
                            "type": "doubleSum",
                            "name": "a2",
                            "fieldName": "total_processing_time"
                        },
                        {
                            "type": "longSum",
                            "name": "a3",
                            "fieldName": "count"
                        }
                    ],
                    "postAggregations": [
                        {
                            "type": "expression",
                            "name": "avg_processing_time",
                            "expression": "case_searched((a3 > 0),(a2/a3),0",
                            "outputType": "DOUBLE"
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

                const getSeries = (key: string) => {
                    return _.map(payload, value => {
                        const timestamp = dayjs(_.get(value, 'timestamp')).unix();
                        let counter = _.get(value, ['result', key]) || 0;
                        if (_.includes(_.lowerCase(counter), "infinity")) {
                            counter = 0;
                        }
                        return [timestamp, counter];
                    });
                }

                return [
                    {
                        name: 'Min Processing Time',
                        data: getSeries('min_processing_time')
                    },
                    {
                        name: 'Max Processing Time',
                        data: getSeries('max_processing_time')
                    },
                    {
                        name: 'Avg Processing Time',
                        data: getSeries('avg_processing_time')
                    }
                ]
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
            }
        }
    },
    minProcessingTimeSeriesPerMasterDataset: {
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
                show: true
            },
            zoom: {
                enabled: false
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return prettyMilliseconds(value);
                    }
                },
                title: {
                    text: "Processing Time (seconds)"
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(timestamp: number) {
                        if (typeof timestamp === 'number') {
                            return defaultConf.timestampLabelFormatter(timestamp);
                        }

                        return defaultConf.timestampLabelFormatterv2(timestamp);
                    }
                },
                y: {
                    show: true,
                    formatter(value: number) {
                        return prettyMilliseconds(value);
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
            id: 'minProcessingTimeSeriesPerDataset',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            noParams: true,
            body: {
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "timeseries",
                    "dataSource": "system-events",
                    "virtualColumns": [
                        {
                            "type": "expression",
                            "name": "v0",
                            "expression": "case_searched((count > 0),(total_processing_time/count),0",
                            "outputType": "DOUBLE"
                        }
                    ],
                    "intervals": "$interval",
                    "granularity": {
                        "type": "period",
                        "period": "PT5M",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "doubleMin",
                            "name": "min_processing_time",
                            "fieldName": "v0"
                        },
                        {
                            "type": "doubleMax",
                            "name": "max_processing_time",
                            "fieldName": "v0"
                        },
                        {
                            "type": "doubleSum",
                            "name": "a2",
                            "fieldName": "total_processing_time"
                        },
                        {
                            "type": "longSum",
                            "name": "a3",
                            "fieldName": "count"
                        }
                    ],
                    "postAggregations": [
                        {
                            "type": "expression",
                            "name": "avg_processing_time",
                            "expression": "case_searched((a3 > 0),(a2/a3),0",
                            "outputType": "DOUBLE"
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

                const getSeries = (key: string) => {
                    return _.map(payload, value => {
                        const timestamp = dayjs(_.get(value, 'timestamp')).unix();
                        let counter = _.get(value, ['result', key]) || 0;
                        if (_.includes(_.lowerCase(counter), "infinity")) {
                            counter = 0;
                        }
                        return [timestamp, counter];
                    });
                }

                return [
                    {
                        name: 'Min Processing Time',
                        data: getSeries('min_processing_time')
                    },
                    {
                        name: 'Max Processing Time',
                        data: getSeries('max_processing_time')
                    },
                    {
                        name: 'Avg Processing Time',
                        data: getSeries('avg_processing_time')
                    }
                ]
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
            }
        }
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
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "topN",
                    "dataSource": "system-events",
                    "virtualColumns": [
                        {
                            "type": "expression",
                            "name": "v0",
                            "expression": "case_searched((count > 0),(total_processing_time/count),0",
                            "outputType": "DOUBLE"
                        }
                    ],
                    "threshold": 100,
                    "dimension": {
                        "type": "default",
                        "dimension": "dataset",
                        "outputName": "dataset",
                        "outputType": "STRING"
                    },
                    "metric": {
                        "type": "numeric",
                        "metric": "min_processing_time"
                    },
                    "intervals": ["$interval"],
                    "granularity": {
                        "type": "all",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "doubleMin",
                            "name": "min_processing_time",
                            "fieldName": "v0"
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
                const min_processing_time = _.get(response, 'result[0].result[0].min_processing_time');
                if (!min_processing_time) return [prettyMilliseconds(0), "primary"];
                return prettyMilliseconds(_.floor(min_processing_time));
            },
            error() {
                return [prettyMilliseconds(0), "error"];
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
            }
        }
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
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "topN",
                    "dataSource": "system-events",
                    "virtualColumns": [
                        {
                            "type": "expression",
                            "name": "v0",
                            "expression": "case_searched((count > 0),(total_processing_time/count),0",
                            "outputType": "DOUBLE"
                        }
                    ],
                    "threshold": 100,
                    "dimension": {
                        "type": "default",
                        "dimension": "dataset",
                        "outputName": "dataset",
                        "outputType": "STRING"
                    },
                    "metric": {
                        "type": "numeric",
                        "metric": "max_processing_time"
                    },
                    "intervals": "$interval",
                    "granularity": {
                        "type": "all",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "doubleMax",
                            "name": "max_processing_time",
                            "fieldName": "v0"
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
                const max_processing_time = _.get(response, 'result[0].result[0].max_processing_time');
                if (!max_processing_time) return [prettyMilliseconds(0), "primary"];
                return prettyMilliseconds(_.floor(max_processing_time));
            },
            error() {
                return [prettyMilliseconds(0), "error"];
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
            }
        }
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
                "context": {
                    "dataSource": "system-events"
                },
                "query": {
                    "queryType": "groupBy",
                    "dataSource": "system-events",
                    "intervals": "$interval",
                    "granularity": {
                        "type": "all",
                        "timeZone": "Asia/Kolkata"
                    },
                    "aggregations": [
                        {
                            "type": "longSum",
                            "name": "total_processing_time",
                            "fieldName": "total_processing_time"
                        },
                        {
                            "type": "longSum",
                            "name": "count",
                            "fieldName": "count"
                        }
                    ],
                    "postAggregations": [
                        {
                            "type": "expression",
                            "name": "average_processing_time",
                            "expression": "case_searched((count > 0),(total_processing_time/count),0",
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
                if (_.get(payload, 'length') === 0) return [prettyMilliseconds(0), "primary"];
                const sum = _.sumBy(payload, value => {
                    return _.get(value, 'event.average_processing_time') || 0;
                })
                return [prettyMilliseconds(sum), "primary"]
            },
            error() {
                return [prettyMilliseconds(0), "error"];
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
            }
        }
    }
}
