import promql from 'data/promql';
import endpoints from 'data/apiEndpoints';
import _ from 'lodash';
import defaultConf from './common';
import prettyMilliseconds from 'pretty-ms';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import apiEndpoints from 'data/apiEndpoints';

dayjs.extend(utc)

export default {
    jdbcStatus: ({ status, datasetId }: any) => ({
        query: {
            id: 'jdbcStatus',
            type: 'api',
            url: apiEndpoints.sourceConfig,
            method: 'POST',
            headers: {},
            body: {
                filters: {
                    dataset_id: datasetId,
                    status: status,
                    connector_type: "jdbc"
                }
            },
            parse: (response: any) => {
                const lastRunTime = _.get(response, 'result[0].connector_stats.last_run_timestamp');
                if (lastRunTime) {
                    const lastRunTimeFormatted = dayjs.utc(lastRunTime);
                    const currentTime = dayjs.utc();
                    const difference = currentTime.diff(lastRunTimeFormatted, 'minute');
                    if (difference > 120) {
                        return ["UNHEALTHY", "error"];
                    } else {
                        return "HEALTHY"
                    }
                } else {
                    return "N/A"
                }
            },
            error() {
                return ['N/A', "error"];
            }
        }
    }),

    jdbcLastRunTime: ({ status, datasetId }: any) => ({
        query: {
            id: 'jdbcLastRunTime',
            type: 'api',
            url: apiEndpoints.sourceConfig,
            method: 'POST',
            headers: {},
            body: {
                filters: {
                    dataset_id: datasetId,
                    status: status,
                    connector_type: "jdbc"
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
    jdbcNumberOfEventsProcessed: ({ evaluationEndTime, evaluationStartTime, datasetId }: any) => ({
        query: {
            id: 'jdbcNumberOfEventsProcessed',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.jdbc_processed_events.query.replace('$dataset', `"${datasetId}"`),
                time: evaluationEndTime
                // start: evaluationStartTime,
                // end: evaluationEndTime,
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

    jdbcNumberOfFailedEvents: ({ evaluationEndTime, evaluationStartTime, datasetId }: any) => ({
        query: {
            id: 'jdbcNumberOfFailedEvents',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.jdbc_failed_events.query.replace('$dataset', `"${datasetId}"`),
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

    jdbcAvgProcessingTime: ({ evaluationEndTime, evaluationStartTime, datasetId }: any) => ({
        query: {
            id: 'jdbcAvgProcessingTime',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.jdbc_avg_processing_time.query.replace('$dataset', `"${datasetId}"`),
                // start: evaluationStartTime,
                time: evaluationEndTime,
                // step: '5m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]') || 0
                return prettyMilliseconds(+result);
            },
            error() {
                return [prettyMilliseconds(0), "error"];
            }
        }
    }),

    jdbcTotalNumberOfEventsProcessed: ({ datasetId }: any) => ({
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
            id: 'jdbcNumberOfEventsProcessed',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: _.replace(promql.jdbc_processed_events.query, new RegExp("\\$dataset", "g"), `"${datasetId}"`),
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

    jdbcTotalNumberOfFailedEvents: ({ datasetId }: any) => ({
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
            id: 'jdbcNumberOfFailedEvents',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.jdbc_failed_events_chart.query.replace('$dataset', `"${datasetId}"`),
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