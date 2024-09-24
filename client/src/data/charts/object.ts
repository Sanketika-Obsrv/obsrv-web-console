import promql from 'data/promql';
import endpoints from 'data/apiEndpoints';
import _ from 'lodash';
import defaultConf from './common';
import prettyMilliseconds from 'pretty-ms';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc'
import apiEndpoints from 'data/apiEndpoints';
import chartMeta from 'data/charts';
import { fetchChartData } from 'services/clusterMetrics';
import { IChartFetchRequest } from 'types/metadata';

dayjs.extend(utc)

export default {
    objectStatus: ({ status, datasetId }: any) => ({
        query: {
            id: 'objectStatus',
            type: 'api',
            url: apiEndpoints.sourceConfig,
            method: 'POST',
            headers: {},
            body: {
                filters: {
                    dataset_id: datasetId,
                    status: status,
                    connector_type: "object"
                }
            },
            parse: async (response: any) => {
                const lastRunTime = _.get(response, 'result[0].connector_stats.last_run_timestamp');

                const evaluationStartTime = dayjs().startOf('day').unix();
                const evaluationEndTime = dayjs().endOf('day').unix();
                const objectDiscoveredQuery = chartMeta.objectNumberOfObjectsDiscovered({ evaluationEndTime, evaluationStartTime, datasetId }).query as unknown as Partial<IChartFetchRequest>;
                const failedQuery = chartMeta.failedObjectsCount({ evaluationEndTime, evaluationStartTime, datasetId }).query as unknown as Partial<IChartFetchRequest>;
                const authFailedQuery = chartMeta.cloudAuthFailureCount({ evaluationEndTime, evaluationStartTime, datasetId }).query as unknown as Partial<IChartFetchRequest>;

                const [failedObjectCount, authFailureCount, objectsDiscoveredCount]: any = await Promise.all([fetchChartData(failedQuery), fetchChartData(authFailedQuery), fetchChartData(objectDiscoveredQuery)])
                if (failedObjectCount > (_.ceil(objectsDiscoveredCount / 2))) {
                    return ["UNHEALTHY", "error"]
                }

                if (lastRunTime) {
                    const lastRunTimeFormatted = dayjs.utc(lastRunTime);
                    const currentTime = dayjs().utc();
                    const difference = currentTime.diff(lastRunTimeFormatted, 'minute');
                    if (difference > 480) {
                        return ["UNHEALTHY", "error"];
                    } else {
                        return "HEALTHY"
                    }
                }
                else {
                    if (objectsDiscoveredCount > 0) {
                        return "HEALTHY"
                    } else {
                        return "N/A"
                    }
                }
            },
            error() {
                return ['N/A', "error"];
            }
        }
    }),
    objectLastRunTime: ({ status, datasetId }: any) => ({
        query: {
            id: 'objectLastRunTime',
            type: 'api',
            url: apiEndpoints.sourceConfig,
            method: 'POST',
            headers: {},
            body: {
                filters: {
                    dataset_id: datasetId,
                    status: status,
                    connector_type: "object"
                }
            },
            parse: (response: any) => {
                const result = _.get(response, 'result[0].connector_stats.last_run_timestamp');
                if (result)
                    return dayjs.utc(result).fromNow();
                else
                    return 'N/A'
            },
            error() {
                return ['N/A', "error"];
            }
        }
    }),

    objectNumberOfObjectsDiscovered: ({ evaluationEndTime, evaluationStartTime, datasetId }: any) => ({
        query: {
            id: 'objectNumberOfObjectsDiscovered',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.object_objects_discovered.query.replace('$dataset', `"${datasetId}"`),
                // start: evaluationStartTime,
                time: evaluationEndTime,
                // step: '5m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]') || 0
                return +result;
            },
            error() {
                return [0, "error"];
            }
        }
    }),

    numberOfEventsProcessed: ({ evaluationEndTime, evaluationStartTime, datasetId }: any) => ({
        query: {
            id: 'numberOfEventsProcessed',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.event_processed.query.replace('$dataset', `"${datasetId}"`),
                // start: evaluationStartTime,
                time: evaluationEndTime,
                // step: '5m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]') || 0
                return +result;
            },
            error() {
                return [0, "error"];
            }
        }
    }),

    numberOfObjectsProcessed: ({ evaluationEndTime, evaluationStartTime, datasetId }: any) => ({
        query: {
            id: 'numberOfObjectsProcessed',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.objects_processed.query.replace('$dataset', `"${datasetId}"`),
                time: evaluationEndTime,
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value') || [0]
                return _.last(result);
            },
            error() {
                return [0, "error"];
            }
        }
    }),

    cloudAuthFailureCount: ({ evaluationEndTime, evaluationStartTime, datasetId }: any) => ({
        query: {
            id: 'cloudAuthFailureCount',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.object_cloud_auth_failure.query.replace('$dataset', `"${datasetId}"`),
                time: evaluationEndTime,
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]') || 0
                return +result;
            },
            error() {
                return [0, "error"];
            }
        }
    }),

    numApiCalls: ({ evaluationEndTime, evaluationStartTime, datasetId }: any) => ({
        query: {
            id: 'numApiCalls',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: _.replace(promql.num_api_calls.query, new RegExp('\\$dataset', 'g'), `"${datasetId}"`),
                time: evaluationEndTime,
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]') || 0
                return +result;
            },
            error() {
                return [0, "error"];
            }
        }
    }),

    failedObjectsCount: ({ evaluationEndTime, evaluationStartTime, datasetId }: any) => ({
        query: {
            id: 'failedObjectsCount',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.object_processing_failure.query.replace('$dataset', `"${datasetId}"`),
                time: evaluationEndTime,
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]') || 0
                return +result;
            },
            error() {
                return [0, "error"];
            }
        }
    }),

    objectProcessingTime: ({ evaluationEndTime, evaluationStartTime, datasetId }: any) => ({
        query: {
            id: 'objectProcessingTime',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.object_processing_time.query.replace('$dataset', `"${datasetId}"`),
                // start: evaluationStartTime,
                time: evaluationEndTime,
                // step: '5m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]') || 0
                return prettyMilliseconds(+result);
            },
            error() {
                return [0, "error"];
            }
        }
    }),

    objectProcessedSize: ({ evaluationEndTime, evaluationStartTime, datasetId }: any) => ({
        query: {
            id: 'objectProcessedSize',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.object_processed_size.query.replace('$dataset', `"${datasetId}"`),
                time: evaluationEndTime,
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]') || 0
                return _.floor(+result / 1000000, 2);
            },
            error() {
                return [0, "error"];
            }
        }
    }),

    objectProcessedCount: ({ datasetId }: any) => ({
        type: 'pie',
        series: [],
        labels: ['Objects Processed', 'Objects Not Processed'],
        options: {
            labels: ['Objects Processed', 'Objects Not Processed'],
            chart: {
                width: 380,
                type: 'pie',
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        },
        queries: [{
            id: 'objectNumberOfObjectsDiscoveredPie',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.object_objects_discovered.query.replace('$dataset', `"${datasetId}"`),
                start: dayjs().startOf('day').unix(),
                end: dayjs().endOf('day').unix(),
                step: '5m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].values[0][1]') || 0
                return +result;
            },
            error() {
                return [0, "error"];
            }
        }, {
            id: 'numberOfObjectsProcessedPie',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.objects_processed.query.replace('$dataset', `"${datasetId}"`),
                time: dayjs().endOf('day').unix(),
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value') || [0]
                return _.last(result);
            },
            error() {
                return [0, "error"];
            }
        }]
    }),

    objectTotalNumberOfEventsProcessed: ({ datasetId }: any) => ({
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
            id: 'numberOfEventsProcessed',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.event_processed_chart.query.replace('$dataset', `"${datasetId}"`),
                step: '5m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result')
                return _.map(result, payload => ({
                    name: _.get(payload, 'metric.datasetId') || datasetId,
                    data: _.get(payload, 'values')
                }))
            },
            error() {
                return [0, "error"];
            }
        }
    }),

    objectTotalNumberOfObjectsProcessed: ({ datasetId }: any) => ({
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
            id: 'numberOfObjectsProcessed',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.objects_processed_chart.query.replace('$dataset', `"${datasetId}"`),
                step: '5m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result')
                return _.map(result, payload => ({
                    name: _.get(payload, 'metric.datasetId') || datasetId,
                    data: _.get(payload, 'values')
                }))
            },
            error() {
                return [0, "error"];
            }
        }
    })
}