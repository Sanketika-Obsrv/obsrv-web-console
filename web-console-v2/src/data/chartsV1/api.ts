import * as _ from 'lodash';
import dayjs from 'dayjs';
import prettyMilliseconds from 'pretty-ms';
import promql from 'data/promql';

import defaultConf from './common';
import endpoints from 'data/apiEndpoints';

const labelsMapping = {
    "alert-manager": "Alerts",
    "prometheus": "Reports"
}

const checkLabelExists = (entity: any, fallbackLabel: string) => {
    if (!entity) return fallbackLabel;
    const label = _.get(labelsMapping, entity);
    return label || entity;
}

const payloadStartOfDay = (payload: any) => {
    const clonedPayload = _.cloneDeep(payload);
    const { params, metadata = {} } = clonedPayload;
    const query = _.get(params, 'query');
    if (query) {
        const now = dayjs();
        const minutesSinceStartOfDay = now.hour() * 60 + now.minute();
        _.set(params, 'query', _.replace(query, /\$interval/g, `${minutesSinceStartOfDay}m`));
    }
    return clonedPayload;
}

export default {
    node_query_response_time_max_data_out: {
        query: {
            id: "apiResponseTimeMax",
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_query_response_time_max_data_out.query
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value);
            },
            error() {
                return [prettyMilliseconds(0), "error"];
            },
            context: (payload: any) => { return payloadStartOfDay(payload); }
        }
    },
    node_query_response_time_max_data_in: {
        query: {
            id: "apiResponseTimeMax",
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_query_response_time_max_data_in.query
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value);
            },
            error() {
                return [prettyMilliseconds(0), "error"];
            },
            context: (payload: any) => { return payloadStartOfDay(payload); }
        }
    },
    node_query_response_time_avg_data_out: {
        query: {
            id: "apiResponseTimeAvg",
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_query_response_time_avg_data_out.query
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value);
            },
            error() {
                return [prettyMilliseconds(0), "error"];
            },
            context: (payload: any) => { return payloadStartOfDay(payload); }
        }
    },
    node_query_response_time_avg_data_in: {
        query: {
            id: "apiResponseTimeAvg",
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_query_response_time_avg_data_in.query
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value);
            },
            error() {
                return [prettyMilliseconds(0), "error"];
            },
            context: (payload: any) => { return payloadStartOfDay(payload); }
        }
    },
    node_total_api_call_data_out: {
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
            legend: {
                show: true
            },
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 0)}`;
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
                        return defaultConf.timestampLabelFormatter(value);
                    }
                }
            },
            xaxis: {
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {
                        return defaultConf.timestampLabelFormatter(timestamp);
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
            id: 'totalApiCallsTimeseries',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_total_api_call_data_out.query,
                step: '1m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => {
                    const endpoint = _.get(payload, 'metric.exported_endpoint');
                    const name = (endpoint && _.last(_.split(endpoint, "/")));
                    return {
                        name: name || 'Total Api Calls',
                        data: _.get(payload, 'values')
                    }
                })
            },
            error() {
                return [];
            },
            context: (payload: any) => {
                const clonedPayload = _.cloneDeep(payload);
                const { params, metadata = {} } = clonedPayload;
                const { step } = metadata;
                const query = _.get(params, 'query');
                if (step && query) {
                    _.set(params, 'query', _.replace(query, '$interval', step));
                }
                return clonedPayload;
            },
        }
    },
    node_total_failed_api_call_data_out: {
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
            legend: {
                show: true
            },
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 0)}`;
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
                        return defaultConf.timestampLabelFormatter(value);
                    }
                }
            },
            xaxis: {
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {
                        return defaultConf.timestampLabelFormatter(timestamp);
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
            id: 'totalFailedApiCallsTimeseries',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_total_failed_api_call_data_out.query,
                step: '1m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => {
                    const endpoint = _.get(payload, 'metric.exported_endpoint');
                    const name = (endpoint && _.last(_.split(endpoint, "/")));
                    return {
                        name: name || 'Total Failed Api Calls',
                        data: _.get(payload, 'values')
                    }
                })
            },
            error() {
                return [];
            },
            context: (payload: any) => {
                const clonedPayload = _.cloneDeep(payload);
                const { params, metadata = {} } = clonedPayload;
                const { step } = metadata;
                const query = _.get(params, 'query');
                if (step && query) {
                    _.set(params, 'query', _.replace(query, '$interval', step));
                }
                return clonedPayload;
            },
        }
    },
    node_total_api_call_data_in: {
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
            legend: {
                show: true
            },
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 0)}`;
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
                        return defaultConf.timestampLabelFormatter(value);
                    }
                }
            },
            xaxis: {
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {
                        return defaultConf.timestampLabelFormatter(timestamp);
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
            id: 'totalApiCallsTimeseries',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_total_api_call_data_in.query,
                step: '1m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => {
                    const endpoint = _.get(payload, 'metric.exported_endpoint');
                    const name = (endpoint && _.last(_.split(endpoint, "/")));
                    return {
                        name: name || 'Total Api Calls',
                        data: _.get(payload, 'values')
                    }
                })
            },
            error() {
                return [];
            },
            context: (payload: any) => {
                const clonedPayload = _.cloneDeep(payload);
                const { params, metadata = {} } = clonedPayload;
                const { step } = metadata;
                const query = _.get(params, 'query');
                if (step && query) {
                    _.set(params, 'query', _.replace(query, '$interval', step));
                }
                return clonedPayload;
            },
        }
    },
    node_total_failed_api_call_data_in: {
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
            legend: {
                show: true
            },
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 0)}`;
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
                        return defaultConf.timestampLabelFormatter(value);
                    }
                }
            },
            xaxis: {
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {
                        return defaultConf.timestampLabelFormatter(timestamp);
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
            id: 'totalFailedApiCallsTimeseries',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_total_failed_api_call_data_in.query,
                step: '1m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => {
                    const endpoint = _.get(payload, 'metric.exported_endpoint');
                    const name = (endpoint && _.last(_.split(endpoint, "/")));
                    return {
                        name: name || 'Total Failed Api Calls',
                        data: _.get(payload, 'values')
                    }
                })
            },
            error() {
                return [];
            },
            context: (payload: any) => {
                const clonedPayload = _.cloneDeep(payload);
                const { params, metadata = {} } = clonedPayload;
                const { step } = metadata;
                const query = _.get(params, 'query');
                if (step && query) {
                    _.set(params, 'query', _.replace(query, '$interval', step));
                }
                return clonedPayload;
            },
        }
    },
    api_health_data_out: {
        query: {
            id: 'apiFailurePercentage',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.api_failure_percentage_data_out.query
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                if (value === 0) return ["HEALTHY", "primary"];
                if (value > 1) return ["UNHEALTHY", "error"]
                if (value > 0.1 && value <= 1) return ["HEALTHY", "warning"]
                return ["HEALTHY", "primary"];
            },
            error() {
                return ["UNHEALTHY", "error"];
            },
            context: (payload: any) => { return payloadStartOfDay(payload); }
        }
    },
    api_health_data_in: {
        query: {
            id: 'apiFailurePercentage',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.api_failure_percentage_data_in.query
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                if (value === 0) return ["HEALTHY", "primary"];
                if (value > 1) return ["UNHEALTHY", "error"]
                if (value > 0.1 && value <= 1) return ["HEALTHY", "warning"]
                return ["HEALTHY", "primary"];
            },
            error() {
                return ["UNHEALTHY", "error"];
            },
            context: (payload: any) => { return payloadStartOfDay(payload); }
        }
    },
    api_failure_percent_data_out: {
        query: {
            id: 'apiFailurePercentage',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.api_failure_percentage_data_out.query
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return _.floor(value, 3);
            },
            error() {
                return [0, "error"];
            },
            context: (payload: any) => { return payloadStartOfDay(payload); }
        }
    },
    api_failure_percent_data_in: {
        query: {
            id: 'apiFailurePercentage',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.api_failure_percentage_data_in.query
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return _.floor(value, 3);
            },
            error() {
                return [0, "error"];
            },
            context: (payload: any) => { return payloadStartOfDay(payload); }
        }
    },
    node_query_response_avg_timeseries_data_out: {
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
            legend: {
                show: true
            },
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 1)} ms`;
                    }
                },
                title: {
                    text: "API Response Time (Ms)"
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(value: number) {
                        return defaultConf.timestampLabelFormatter(value);
                    }
                }
            },
            xaxis: {
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {
                        return defaultConf.timestampLabelFormatter(timestamp);
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
            id: 'apiResponseTimeTimeseries',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_query_response_time_avg_timeseries_data_out.query,
                step: '1m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => {
                    const endpoint = _.get(payload, 'metric.exported_endpoint');
                    return {
                        name: (endpoint && _.last(_.split(endpoint, "/"))) || "Avg Query Response Time",
                        data: _.get(payload, 'values')
                    }
                })
            },
            error() {
                return [];
            },
            context: (payload: any) => {
                const clonedPayload = _.cloneDeep(payload);
                const { params, metadata = {} } = clonedPayload;
                const { step, res } = metadata;
                const query = _.get(params, 'query');
                if (step && query) {
                    _.set(params, 'query', _.replace(_.replace(query, '$interval', step), '$res', res));
                }
                return clonedPayload;
            }
        }
    },
    node_query_response_avg_timeseries_data_in: {
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
            legend: {
                show: true
            },
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 1)} ms`;
                    }
                },
                title: {
                    text: "API Response Time (Ms)"
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(value: number) {
                        return defaultConf.timestampLabelFormatter(value);
                    }
                }
            },
            xaxis: {
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {
                        return defaultConf.timestampLabelFormatter(timestamp);
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
            id: 'apiResponseTimeTimeseries',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_query_response_time_avg_timeseries_data_in.query,
                step: '1m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => {
                    const endpoint = _.get(payload, 'metric.exported_endpoint');
                    const name = (endpoint && _.last(_.split(endpoint, "/")));
                    return {
                        name: name || "Avg Query Response Time",
                        data: _.get(payload, 'values')
                    }
                })
            },
            error() {
                return [];
            },
            context: (payload: any) => {
                const clonedPayload = _.cloneDeep(payload);
                const { params, metadata = {} } = clonedPayload;
                const { step, res } = metadata;
                const query = _.get(params, 'query');
                if (step && query) {
                    _.set(params, 'query', _.replace(_.replace(query, '$interval', step), '$res', res));
                }
                return clonedPayload;
            }
        }
    },
    api_throughput: {
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
            legend: {
                show: true
            },
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 1)}`;
                    }
                },
                title: {
                    text: "Throughput = (count / response time )"
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
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {
                        return defaultConf.timestampLabelFormatter(timestamp);
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
            id: 'apiThroughputTimeseries',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.apiThroughput.query,
                step: '1m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => ({
                    name: _.get(payload, 'metric.entity') || "Throughput",
                    data: _.get(payload, 'values')
                }))
            },
            error() {
                return [];
            },
            context: (payload: any) => {
                const clonedPayload = _.cloneDeep(payload);
                const { params, metadata = {} } = clonedPayload;
                const { step, res } = metadata;
                const query = _.get(params, 'query');
                if (step && query) {
                    _.set(params, 'query', _.replace(_.replace(query, /\$interval/g, step), /\$res/g, res));
                }
                return clonedPayload;
            }
        }
    },
    ninty_percentile_query_response_time_data_out: {
        query: {
            id: 'apiNintyPercentile',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.ninty_percentile_query_response_time_data_out.query,
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value)
            },
            context: (payload: any) => { return payloadStartOfDay(payload); },
            error() {
                return [prettyMilliseconds(0), "error"];
            }
        }
    },
    seventy_percentile_query_response_time_data_out: {
        query: {
            id: 'apiSeventyPercentile',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.seventy_percentile_query_response_time_data_out.query,
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value)
            },
            context: (payload: any) => { return payloadStartOfDay(payload); },
            error() {
                return [prettyMilliseconds(0), "error"];
            }
        }
    },
    sixty_percentile_query_response_time_data_out: {
        query: {
            id: 'apiSixtyPercentile',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.sixty_percentile_query_response_time_interval_data_out.query,
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value)
            },
            context: (payload: any) => { return payloadStartOfDay(payload); },
            error() {
                return [prettyMilliseconds(0), "error"];
            }
        }
    },
    fifty_percentile_query_response_time_data_out: {
        query: {
            id: 'apiFiftyPercentile',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.fifty_percentile_query_response_time_interval_data_out.query,
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value)
            },
            context: (payload: any) => { return payloadStartOfDay(payload); },
            error() {
                return [prettyMilliseconds(0), "error"];
            }
        }
    },
    ninty_percentile_query_response_time_data_in: {
        query: {
            id: 'apiNintyPercentile',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.ninty_percentile_query_response_time_data_in.query,
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value)
            },
            context: (payload: any) => { return payloadStartOfDay(payload); },
            error() {
                return [prettyMilliseconds(0), "error"];
            }
        }
    },
    seventy_percentile_query_response_time_data_in: {
        query: {
            id: 'apiSeventyPercentile',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.seventy_percentile_query_response_time_data_in.query,
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value)
            },
            context: (payload: any) => { return payloadStartOfDay(payload); },
            error() {
                return [prettyMilliseconds(0), "error"];
            }
        }
    },
    sixty_percentile_query_response_time_data_in: {
        query: {
            id: 'apiSixtyPercentile',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.sixty_percentile_query_response_time_interval_data_in.query,
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value)
            },
            context: (payload: any) => { return payloadStartOfDay(payload); },
            error() {
                return [prettyMilliseconds(0), "error"];
            }
        }
    },
    fifty_percentile_query_response_time_data_in: {
        query: {
            id: 'apiFiftyPercentile',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.fifty_percentile_query_response_time_interval_data_in.query,
            },
            parse: (response: any) => {
                const value = _.get(response, 'data.result[0].value[1]') || 0;
                return prettyMilliseconds(+value)
            },
            context: (payload: any) => { return payloadStartOfDay(payload); },
            error() {
                return [prettyMilliseconds(0), "error"];
            }
        }
    }
}
