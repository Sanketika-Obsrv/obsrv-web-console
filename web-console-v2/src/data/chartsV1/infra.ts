import * as _ from 'lodash';
import dayjs from 'dayjs';
import promql from '../promql';
import defaultConf from './common'
import endpoints from 'data/apiEndpoints';
import prettyBytes from 'pretty-bytes';

export default {
    node_memory: {
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
            grid: {
                ...defaultConf.grid,
                borderColor: 'rgba(26, 17, 16, .2)',
            },
            annotations: {
                yaxis: [
                    {
                        y: 80,
                        y2: 90,
                        fillColor: '#FEB019',
                        opacity: 0.2,
                        label: {
                            borderColor: '#333',
                            style: {
                                fontSize: '10px',
                                background: '#FEB019',
                            },
                            text: 'Warn',
                        }
                    },
                    {
                        y: 90,
                        y2: 100,
                        fillColor: '#FF0000',
                        opacity: 0.3,
                        label: {
                            borderColor: '#333',
                            style: {
                                fontSize: '10px',
                                background: '#FEB019',
                            },
                            text: 'Critical',
                        }
                    }
                ]
            },
            legend: {
                show: false
            },
            zoom: {
                enabled: false
            },
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            title: {
                "text": "Memory Usage",
                align: "right"
            },
            yaxis: {
                min: 0,
                max: 100,
                tickAmount: 5,
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 1)}%`;
                    }
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(timestamp: number) {
                        return dayjs.unix(timestamp).format('HH:mm');
                    }
                }
            },
            xaxis: {
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {
                        return dayjs.unix(timestamp).format('HH:mm');
                    }
                },
                tooltip: {
                    enabled: false
                }
            }
        },
        query: {
            id: 'nodeMemoryTimeseries',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_memory.query,
                step: '30s'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => ({
                    name: _.get(payload, 'metric.instance') || "Memory Usage",
                    data: _.get(payload, 'values')
                }))
            },
            error() {
                return []
            }
        }
    },
    node_cpu: {
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
            grid: {
                ...defaultConf.grid,
                borderColor: 'rgba(26, 17, 16, .2)',
            },
            annotations: {
                yaxis: [
                    {
                        y: 80,
                        y2: 90,
                        fillColor: '#FEB019',
                        opacity: 0.2,
                        label: {
                            borderColor: '#333',
                            style: {
                                fontSize: '10px',
                                background: '#FEB019',
                            },
                            text: 'Warn',
                        }
                    },
                    {
                        y: 90,
                        y2: 100,
                        fillColor: '#FF0000',
                        opacity: 0.2,
                        label: {
                            borderColor: '#333',
                            style: {
                                fontSize: '10px',
                                background: '#FEB019',
                            },
                            text: 'Critical',
                        }
                    }
                ]
            },
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
            title: {
                "text": "CPU Usage",
                align: "right"
            },
            yaxis: {
                min: 0,
                max: 100,
                tickAmount: 5,
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 1)}%`;
                    }
                }
            },
            tooltip: {
                theme: 'light',
                x: {
                    show: true,
                    formatter(timestamp: number) {
                        return dayjs.unix(timestamp).format('HH:mm');
                    }
                }
            },
            xaxis: {
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {
                        return dayjs.unix(timestamp).format('HH:mm');
                    }
                },
                tooltip: {
                    enabled: false
                }
            }
        },
        query: {
            id: 'nodeCpuTimeseries',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.node_cpu.query,
                step: '30s'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => ({
                    name: _.get(payload, 'metric.instance') || "CPU Usage",
                    data: _.get(payload, 'values')
                }))
            },
            error() {
                return []
            }
        }
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
                query: promql.cpu_percentage.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                const sum = _.sumBy(result, (payload: any) => {
                    const { value } = payload;
                    const [_, percentage = 0] = value;
                    return +percentage
                })
                return result?.length ? _.floor((sum / result?.length) * 100) : 0;
            },
            error() {
                return 0;
            }
        }
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
                query: promql.memory_percentage.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                const sum = _.sumBy(result, (payload: any) => {
                    const { value } = payload;
                    const [_, percentage = 0] = value;
                    return +percentage
                })
                return result?.length ? _.floor((sum / result?.length) * 100) : 0;
            },
            error() {
                return 0
            }
        }
    },
    nodes_percentage: {
        query: {
            id: 'nodeRunningPercentage',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.nodes_percentage.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                const sum = _.sumBy(result, (payload: any) => {
                    const { value } = payload;
                    const [_, percentage = 0] = value;
                    return +percentage
                })
                return _.floor(sum / result?.length);
            },
            error() {
                return [0]
            }
        }
    },
    instance_memory: {
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
            annotations: {
                yaxis: [
                    {
                        y: 80,
                        y2: 90,
                        fillColor: '#FEB019',
                        opacity: 0.2,
                        label: {
                            borderColor: '#333',
                            style: {
                                fontSize: '10px',
                                background: '#FEB019',
                            },
                            text: 'Warn',
                        }
                    },
                    {
                        y: 90,
                        y2: 100,
                        fillColor: '#FF0000',
                        opacity: 0.2,
                        label: {
                            borderColor: '#333',
                            style: {
                                fontSize: '10px',
                                background: '#FEB019',
                            },
                            text: 'Critical',
                        }
                    }
                ]
            },
            legend: {
                show: false
            },
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            yaxis: {
                min: 0,
                max: 100,
                tickAmount: 5,
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 1)}%`;
                    }
                },
                title: {
                    text: "Memory Utilization Percentage"
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
            id: "memoryTimeseries",
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.instance_memory.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => ({
                    name: "Memory Percentage",
                    data: _.get(payload, 'values')
                }))
            },
            error() {
                return []
            }
        }
    },
    instance_cpu: {
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
            annotations: {
                yaxis: [
                    {
                        y: 80,
                        y2: 90,
                        fillColor: '#FEB019',
                        opacity: 0.2,
                        label: {
                            borderColor: '#333',
                            style: {
                                fontSize: '10px',
                                background: '#FEB019',
                            },
                            text: 'Warn',
                        }
                    },
                    {
                        y: 90,
                        y2: 100,
                        fillColor: '#FF0000',
                        opacity: 0.2,
                        label: {
                            borderColor: '#333',
                            style: {
                                fontSize: '10px',
                                background: '#FEB019',
                            },
                            text: 'Critical',
                        }
                    }
                ]
            },
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
                min: 0,
                max: 100,
                tickAmount: 5,
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 1)}%`;
                    }
                },
                title: {
                    text: "CPU Utilization Percentage"
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
            id: 'cpuTimeseries',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.instance_cpu.query,
                step: '5m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => ({
                    name: 'Cpu Percentage',
                    data: _.get(payload, 'values')
                }))
            },
            error() {
                return []
            }
        }
    },
    instance_disk: {
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
            annotations: {
                yaxis: [
                    {
                        y: 60,
                        y2: 80,
                        fillColor: '#FEB019',
                        opacity: 0.2,
                        label: {
                            borderColor: '#333',
                            style: {
                                fontSize: '10px',
                                background: '#FEB019',
                            },
                            text: 'Warn',
                        }
                    },
                    {
                        y: 80,
                        y2: 100,
                        fillColor: '#FF0000',
                        opacity: 0.2,
                        label: {
                            borderColor: '#333',
                            style: {
                                fontSize: '10px',
                                background: '#FEB019',
                            },
                            text: 'Critical',
                        }
                    }
                ]
            },
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
                min: 0,
                max: 100,
                tickAmount: 5,
                labels: {
                    formatter: function (value: number) {
                        return ` ${_.round(value, 1)}%`;
                    }
                },
                title: {
                    text: "Disk Utilization Percentage"
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
            id: 'diskTimeseries',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.pv_usage_percent.query,
                step: '5m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => ({
                    name: 'Disk Percentage',
                    data: _.get(payload, 'values')
                }))
            },
            error() {
                return []
            }
        }
    },
    cpu_usage_radial: {
        type: 'radialBar',
        series: [],
        options: {
            chart: {
                ...defaultConf.defaultChartConfigurations,
                type: 'radialBar',
                offsetY: -20,
                sparkline: {
                    enabled: true
                }
            },
            plotOptions: {
                radialBar: {
                    startAngle: -90,
                    endAngle: 90,
                    track: {
                        background: "#e7e7e7",
                        strokeWidth: '97%',
                        margin: 5,
                        dropShadow: {
                            enabled: true,
                            top: 2,
                            left: 0,
                            color: '#999',
                            opacity: 1,
                            blur: 2
                        }
                    },
                    dataLabels: {
                        name: {
                            show: false
                        },
                        value: {
                            offsetY: -2,
                            fontSize: '22px'
                        }
                    }
                }
            },
            grid: {
                padding: {
                    top: -10
                }
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'dark',
                    shadeIntensity: 0.15,
                    inverseColors: false,
                    opacityFrom: 1,
                    opacityTo: 1,
                    stops: [0, 50, 65, 91]
                },
            },
            labels: ['Disk Usage'],
        },
        query: {
            id: "cpuUsage",
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.cpu_usage_radial.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                const sum = _.sumBy(result, (payload: any) => {
                    const { value } = payload;
                    const [_, percentage = 0] = value;
                    return +percentage
                })
                return result?.length ? [_.floor((sum / result?.length) * 100)] : [0];
            },
            error() {
                return [];
            }
        }
    },
    memory_usage_radial: {
        type: 'radialBar',
        series: [],
        options: {
            chart: {
                ...defaultConf.defaultChartConfigurations,
                type: 'radialBar',
                offsetY: -20,
                sparkline: {
                    enabled: true
                }
            },
            plotOptions: {
                radialBar: {
                    startAngle: -90,
                    endAngle: 90,
                    track: {
                        background: "#e7e7e7",
                        strokeWidth: '97%',
                        margin: 5,
                        dropShadow: {
                            enabled: true,
                            top: 2,
                            left: 0,
                            color: '#999',
                            opacity: 1,
                            blur: 2
                        }
                    },
                    dataLabels: {
                        name: {
                            show: false
                        },
                        value: {
                            offsetY: -2,
                            fontSize: '22px'
                        }
                    }
                }
            },
            grid: {
                padding: {
                    top: -10
                }
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'dark',
                    shadeIntensity: 0.15,
                    inverseColors: false,
                    opacityFrom: 1,
                    opacityTo: 1,
                    stops: [0, 50, 65, 91]
                },
            },
            labels: ['Disk Usage'],
        },
        query: {
            id: 'memoryUsage',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.memory_usage_radial.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                const sum = _.sumBy(result, (payload: any) => {
                    const { value } = payload;
                    const [_, percentage = 0] = value;
                    return +percentage
                })
                return result?.length ? [_.floor((sum / result?.length) * 100)] : [0];
            },
            error() {
                return []
            }
        }
    },
    total_nodes_count: {
        query: {
            id: 'totalNodesCount',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.cluster_total_nodes_count.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                const sum = _.sumBy(result, (payload: any) => {
                    const { value } = payload;
                    const [_, percentage = 0] = value;
                    return +percentage
                })
                return _.floor(sum);
            },
            error() {
                return 0;
            }
        }
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
                query: promql.cluster_running_nodes_count.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                const sum = _.sumBy(result, (payload: any) => {
                    const { value } = payload;
                    const [_, percentage = 0] = value;
                    return +percentage
                })
                return _.floor(sum);
            },
            error() {
                return 0
            }
        }
    },
    totalCPU: {
        query: {
            id: 'totalCpuCores',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.totalCpuCores.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                const sum = _.sumBy(result, (payload: any) => {
                    const { value } = payload;
                    const [_, percentage = 0] = value;
                    return +percentage
                })
                return _.floor(sum);
            },
            error() {
                return 0
            }
        }
    },
    usedMemory: {
        query: {
            id: 'totalCpuCores',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.memory_used.query
            },
            parse: (response: any) => {
                const memory = _.get(response, 'data.result[0].value[1]');
                return prettyBytes(+memory);
            },
            error() {
                return prettyBytes(0);
            }
        }
    },
    totalMemory: {
        query: {
            id: 'totalCpuCores',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.memory_total.query
            },
            parse: (response: any) => {
                const memory = _.get(response, 'data.result[0].value[1]');
                return prettyBytes(+memory);
            },
            error() {
                return prettyBytes(0);
            }
        }
    },
}
