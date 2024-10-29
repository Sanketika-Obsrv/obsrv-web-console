import * as _ from 'lodash';
import prettyMilliseconds from 'pretty-ms';
import dayjs from 'dayjs';
import promql from '../promql';
import defaultConf from './common';
import endpoints from 'data/apiEndpoints';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const cleanString = (string: string) => {
    string = string.replace(/-/g, '_')
        .replace(/\./g, '_')
        .replace(/\n/g, '')
        .replace(/[\n\r]/g, '')
    return string;
}

const replaceDataset = (query: string, dataset: string,) => {
    dataset = dataset.replace(/-/g, '_')
    query = query.replace(/\$dataset/g, cleanString(dataset));
    return query;
}

export default {
    druid_health_status: {
        query: {
            id: 'druidHealthStatus',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.druid_health_status.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                const sum = _.sumBy(result, (payload: any) => {
                    const { value } = payload;
                    const [_, percentage = 0] = value;
                    return +percentage
                })

                return sum === 1 ? "HEALTHY" : ["UNHEALTHY", "error"];
            },
            error() {
                return ["UNHEALTHY", "error"]
            }
        }
    },
    druid_avg_processing_time: {
        query: {
            id: 'druidAvgProcessingTime',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            body: {},
            params: {},
            parse: (response: any) => {
                const avgProcessingTime = _.get(response, 'result[0].event.average_processing_time') || 0
                return prettyMilliseconds(avgProcessingTime);
            },
            error() {
                return [prettyMilliseconds(0), "error"];
            }
        }
    },
    last_synced_time: {
        query: {
            id: 'lastSyncedTime',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            body: {},
            params: {},
            parse: (response: any) => {
                const ms = _.get(response, 'result[0].event.last_synced_time') || 0;
                if (!ms) return ["N/A", "primary"];
                return {
                    "value": dayjs(ms).fromNow(),
                    "hoverValue": dayjs(ms).format('YYYY-MM-DD HH:mm:ss')
                }
            },
            error() {
                return ["N/A", "error"]
            }
        }
    },
    last_synced_relative_time: {
        query: {
            id: 'lastSyncedTime',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            body: {},
            params: {},
            parse: (response: any) => {
                const ms = _.get(response, 'result[0].event.last_synced_time') || 0;
                if (!ms) return ["N/A", "primary"];
                return {
                    "value": dayjs(ms).fromNow(),
                    "hoverValue": dayjs(ms).format('YYYY-MM-DD HH:mm:ss')
                }
            },
            error() {
                return ["N/A", "error"]
            }
        }
    },
    total_events_processed: {
        query: {
            id: 'totalProcessedEventsCount',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            body: {},
            params: {},
            parse: (response: any) => {
                const payload = _.get(response, 'result') || [];
                const sum = _.sumBy(payload, value => {
                    return _.get(value, 'result.count') || 0;
                })
                if (!sum) return [0, "primary"];
                return sum;
            },
            error() {
                return [0, "error"]
            }
        }
    },
    total_events_failed: {
        query: {
            id: 'totalFailedEvents',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            body: {},
            params: {},
            parse: (response: any) => {
                const payload = _.get(response, 'result') || [];
                const sum = _.sumBy(payload, value => {
                    return _.get(value, 'result.count') || 0;
                })
                if (!sum) return [0, "primary"];
                return sum;
            },
            error() {
                return [0, "error"]
            }
        }
    },
    failed_events_summary_master_datasets: {
        query: {
            type: 'api',
            id: 'failedEventsCountPerDataset',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.flink_master_dataset_failed_events.query,
            },
            parse: (response: any) => {
                const count = _.get(response, 'data.result[0].value') || [0];
                return _.last(count);
            },
            context: (payload: any) => {
                const clonedPayload = _.cloneDeep(payload);
                const { params, time, dataset } = clonedPayload;
                const query = cleanString(_.get(params, 'query'));
                if (query && time && dataset) {
                    _.set(params, 'time', time);
                    _.set(params, 'query', replaceDataset(query, dataset));
                }
                return clonedPayload;
            },
            error() {
                return ["N/A", "error"];
            }
        }
    },
    failed_events_summary: {
        query: {
            type: 'api',
            id: 'failedEventsCountPerDataset',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.flink_dataset_failed_events.query,
            },
            parse: (response: any) => {
                const count = _.get(response, 'data.result[0].value') || [0];
                return _.last(count);
            },
            context: (payload: any) => {
                const clonedPayload = _.cloneDeep(payload);
                const { params, time, dataset } = clonedPayload;
                const query = cleanString(_.get(params, 'query'));
                if (query && time && dataset) {
                    _.set(params, 'time', time);
                    _.set(params, 'query', replaceDataset(query, dataset));
                }
                return clonedPayload;
            },
            error() {
                return ["N/A", "error"];
            }
        }
    },
    average_processing_time_series: {
        type: 'area',
        series: [],
        options: {
            chart: {
                ...defaultConf.defaultChartConfigurations,
                type: 'area',
                animations: defaultConf.animations,
                toolbar: {
                    show: false
                }
            },
            grid: defaultConf.grid,
            dataLabels: {
                enabled: false
            },
            legend: {
                show: false
            },
            zoom: {
                enabled: false
            },
            stroke: {
                curve: 'smooth'
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return _.round(value, 1);
                    }
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(value: number) {
                        return new Date(value * 1000)
                    }
                }
            },
            xaxis: {
                type: 'datetime',
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                },
                labels: {
                    show: false
                },
                tooltip: {
                    enabled: false
                }
            }
        },
        query: {
            id: 'avgProcessingTimeTimeseries',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            body: {},
            params: {},
            parse: (response: any) => {
                const payload = _.get(response, 'result') || [];
                const series = _.map(payload, value => {
                    const timestamp = dayjs(_.get(value, 'timestamp')).unix();
                    const time = _.get(value, 'result.processing_time')
                    return [timestamp, time];
                });

                return [{
                    name: 'Average Processing Time',
                    data: series
                }]
            },
            error() {
                return []
            }
        }
    },
    total_events_processed_time_series: {
        type: 'area',
        series: [],
        options: {
            chart: {
                ...defaultConf.defaultChartConfigurations,
                type: 'area',
                animations: defaultConf.animations,
                toolbar: {
                    show: false
                }
            },
            grid: defaultConf.grid,
            dataLabels: {
                enabled: false
            },
            legend: {
                show: false
            },
            zoom: {
                enabled: false
            },
            stroke: {
                curve: 'smooth'
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return _.round(value, 1);
                    }
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(value: number) {
                        return new Date(value * 1000)
                    }
                }
            },
            xaxis: {
                type: 'datetime',
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                },
                labels: {
                    show: false
                },
                tooltip: {
                    enabled: false
                }
            }
        },
        query: {
            id: 'totalEventsProcessedTimeseries',
            type: 'api',
            url: endpoints.druidNativeQuery,
            method: 'POST',
            headers: {},
            body: {},
            params: {},
            parse: (response: any) => {
                const payload = _.get(response, 'result') || [];
                const series = _.map(payload, value => {
                    const timestamp = dayjs(_.get(value, 'timestamp')).unix();
                    const count = _.get(value, 'result.count')
                    return [timestamp, count];
                });

                return [{
                    name: 'Events Processed',
                    data: series
                }]
            },
            error() {
                return []
            }
        }
    },
    duplicate_events_summary: {
        query: {
            type: 'api',
            id: 'duplicateEventsPerDataset',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.flink_dataset_duplicate_events.query,
            },
            parse: (response: any) => {
                const count = _.get(response, 'data.result[0].value') || [0];
                return _.last(count);
            },
            context: (payload: any) => {
                const clonedPayload = _.cloneDeep(payload);
                const { params, time, dataset } = clonedPayload;
                const query = _.get(params, 'query');
                if (query && time && dataset) {
                    _.set(params, 'time', time);
                    _.set(params, 'query', replaceDataset(query, dataset));
                }
                return clonedPayload;
            },
            error() {
                return ["N/A", "error"];
            }
        }
    },
    duplicate_batches_summary: {
        query: {
            type: 'api',
            id: 'duplicateBatchesPerDataset',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.flink_dataset_duplicate_batches.query,
            },
            parse: (response: any) => {
                const count = _.get(response, 'data.result[0].value') || [0];
                return _.last(count);
            },
            context: (payload: any) => {
                const clonedPayload = _.cloneDeep(payload);
                const { params, time, dataset } = clonedPayload;
                const query = _.get(params, 'query');
                if (query && time && dataset) {
                    _.set(params, 'time', time);
                    _.set(params, 'query', replaceDataset(query, dataset));
                }
                return clonedPayload;
            },
            error() {
                return ["N/A", "error"];
            }
        }
    },
}
