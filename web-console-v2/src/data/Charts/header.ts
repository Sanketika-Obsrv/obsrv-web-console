import defaultConf from './common';
import dayjs from 'dayjs';
import _ from 'lodash';
import promql from '../../constants/Queries';
import endpoints from '../../constants/Enpoints';

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
          show: false,
        },
      },
      grid: {
        ...defaultConf.grid,
        borderColor: 'rgba(246, 246, 246, 1)',
      },
      annotations: {
        yaxis: [
          {
            y: 90,
            y2: 100,
            fillColor: 'rgba(204, 85, 42, 1)',
            label: {
              text: 'Critical',
              style: {
                color: 'black',
              },
            },
          },
          {
            y: 80,
            y2: 90,
            fillColor: 'rgba(250, 214, 171, 1)',
            label: {
              text: 'Warn',
              style: {
                color: 'black',
              },
            },
          },
        ],
      },
      stroke: {
        width: 1.6,
        curve: 'smooth',
      },
      legend: {
        show: false,
      },
      zoom: {
        enabled: false,
      },

      yaxis: {
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: {
          formatter: function (value: number) {
            return ` ${_.round(value, 1)}%`;
          },
        },
      },
      tooltip: {
        theme: 'light',
        x: {
          show: true,
          formatter(timestamp: number) {
            return dayjs.unix(timestamp).format('HH:mm');
          },
        },
      },
      xaxis: {
        type: 'datetime',
        axisTicks: {
          show: false,
        },
        labels: {
          formatter: function (value: any, timestamp: any) {
            return dayjs.unix(timestamp).format('HH:mm');
          },
        },
        tooltip: {
          enabled: false,
        },
      },
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
        step: '30s',
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result');
        return _.map(result, (payload) => ({
          name: _.get(payload, 'metric.instance') || 'Memory Usage',
          data: _.get(payload, 'values'),
        }));
      },
      error() {
        return [];
      },
    },
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
          show: false,
        },
      },
      grid: {
        ...defaultConf.grid,
        borderColor: 'rgba(246, 246, 246, 1)',
      },
      axisBorder: {
        show: true,
        color: 'rgba(246, 246, 246, 1)',
        offsetX: 0,
        offsetY: 0,
      },
      annotations: {
        yaxis: [
          {
            y: 90,
            y2: 100,
            fillColor: 'rgba(204, 85, 42, 1)',
            label: {
              text: 'Critical',
              style: {
                color: 'black',
              },
            },
          },
          {
            y: 80,
            y2: 90,
            fillColor: 'rgba(250, 214, 171, 1)',
            label: {
              text: 'Warn',
              style: {
                color: 'black',
              },
            },
          },
        ],
      },
      stroke: {
        width: 1.6,
        curve: 'smooth',
      },
      legend: {
        show: false,
      },
      zoom: {
        enabled: false,
      },

      yaxis: {
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: {
          formatter: function (value: number) {
            return ` ${_.round(value, 1)}%`;
          },
        },
      },
      tooltip: {
        theme: 'light',
        x: {
          show: true,
          formatter(timestamp: number) {
            return dayjs.unix(timestamp).format('HH:mm');
          },
        },
      },
      xaxis: {
        type: 'datetime',
        tickAmount: 4,
        axisTicks: {
          show: false,
        },
        labels: {
          formatter: function (value: any, timestamp: any) {
            return dayjs.unix(timestamp).format('HH:mm');
          },
        },
        tooltip: {
          enabled: false,
        },
      },
    },

    // show: true,
    // series: [],
    // options: {
    //   show: true,
    //   chart: {
    //     type: 'line',
    //     height: 600,
    //     toolbar: { show: false },
    //   },

    //   xaxis: {
    //     tooltip: {
    //       enabled: false,
    //     },

    //     axisBorder: {
    //       show: true,
    //       color: 'rgba(246, 246, 246, 1)',
    //       offsetX: 0,
    //       offsetY: 0,
    //     },
    //     axisTicks: {
    //       show: false,
    //     },
    //   },

    //   yaxis: {
    //     show: true,

    //     min: 0,
    //     max: 100,
    //     tickAmount: 5,

    //     labels: {
    //       show: true,
    //       formatter: (value: number) => `${value}%`,
    //     },
    //   },
    //   annotations: {
    //     show: true,

    //     yaxis: [
    //       {
    //         show: true,

    //         y: 90,
    //         y2: 100,
    //         fillColor: 'rgba(204, 85, 42, 1)',
    //         label: {
    //           text: 'Critical',
    //           style: {
    //             color: 'black',
    //           },
    //         },
    //       },
    //       {
    //         show: true,
    //         y: 80,
    //         y2: 90,
    //         fillColor: 'rgba(250, 214, 171, 1)',
    //         label: {
    //           text: 'Warn',
    //           style: {
    //             color: 'black',
    //           },
    //         },
    //       },
    //     ],
    //   },
    //   grid: {
    //     show: true,
    //     borderColor: 'rgba(246, 246, 246, 1)',
    //     xaxis: {
    //       lines: {
    //         show: true,
    //       },
    //     },
    //     yaxis: {
    //       lines: {
    //         show: true,
    //       },
    //     },
    //   },

    //   legend: {
    //     show: false,
    //   },
    //   stroke: {
    //     show: true,

    //     curve: 'smooth',
    //     width: 1.6,
    //     colors: ['#056ECE'],
    //   },
    //   fill: {
    //     show: true,

    //     type: 'gradient',
    //     gradient: {
    //       show: true,
    //       shade: 'light',
    //       stops: [0, 100],
    //     },
    //   },
    // },

    query: {
      id: 'nodeCpuTimeseries',
      type: 'api',
      url: endpoints.prometheusReadRange,
      method: 'GET',
      headers: {},
      body: {},
      params: {
        query: promql.node_cpu.query,
        step: '30s',
      },
      parse: (response: any) => {
        const result = _.get(response, 'data.result');
        return _.map(result, (payload) => ({
          name: _.get(payload, 'metric.instance') || 'CPU Usage',
          data: _.get(payload, 'values'),
        }));
      },
      error() {
        return [];
      },
    },
  },
};
