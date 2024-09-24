import * as _ from 'lodash';
import prettyBytes from 'pretty-bytes';
import dayjs from 'dayjs';
import defaultConf from './common';
import promql from 'data/promql';
import endpoints from 'data/apiEndpoints';
import prettyMilliseconds from 'pretty-ms';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export default {
    data_growth_over_time: {
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
            zoom: {
                enabled: false
            },
            stroke: {
                width: 2,
                curve: 'smooth'
            },
            yaxis: {
                labels: {
                    formatter: function (value: number) {
                        return prettyBytes(+value, { minimumFractionDigits: 2 });
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
                tickAmount: 10,
                type: 'datetime',
                labels: {
                    formatter: function (value: any, timestamp: any) {
                        return dayjs.unix(timestamp).format('DD MMM HH:mm');
                    }
                },
                tooltip: {
                    enabled: false
                }
            }
        },
        query: {
            id: 'storageDataGrowthOverTime',
            type: 'api',
            url: endpoints.prometheusReadRange,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.data_usage_growth.query,
                step: '5m'
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                return _.map(result, payload => ({
                    name: _.get(payload, 'metric.job') || "Data Usage Growth",
                    data: _.get(payload, 'values')
                }))
            },
            error() {
                return []
            }
        }
    },
    deep_storage_total: {
        query: {
            id: 'deepStorageTotalSize',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.deep_storage_total.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]');
                if (!result) throw new Error();
                return prettyBytes(+result);
            },
            error() {
                return prettyBytes(0);
            }
        }
    },
    backup_count: {
        query: {
            id: 'backCount',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.backupCount.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result');
                const count = _.sumBy(result, (payload: any) => _.get(payload, 'value[1]'))
                if (!count) throw new Error();
                return _.floor(count);
            },
            error() {
                return 0
            }
        }
    },
    backup_success_rate: {
        query: {
            id: 'backupSuccessRate',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.backupSuccessRate.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]');
                if (!result) throw new Error();
                return _.floor(result * 100);
            },
            error() {
                return 0
            }
        }
    },
    postgres_backup_files: {
        query: {
            id: 'postgresBackupFiles',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.postgres_backup_files.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]');
                if (!result) throw new Error();
                return result;
            },
            error() {
                return 0
            }
        }
    },
    redis_backup_files: {
        query: {
            id: 'redisBackupFiles',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.redis_backup_files.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]');
                if (!result) throw new Error();
                return result;
            },
            error() {
                return 0
            }
        }
    },
    postgres_last_backup_time: {
        query: {
            id: 'postgresLastBackupTime',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.postgres_last_backup_time.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]');
                if (!result) throw new Error();
                return {
                    "value": dayjs(result * 1000).fromNow(),
                    "hoverValue": dayjs(result * 1000).format('YYYY-MM-DD HH:mm:ss')
                }
            },
            error() {
                return prettyMilliseconds(0)
            }
        }
    },
    redis_last_backup_time: {
        query: {
            id: 'redisLastBackupTime',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.redis_last_backup_time.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]');
                if (!result) throw new Error();
                return {
                    "value": dayjs(result * 1000).fromNow(),
                    "hoverValue": dayjs(result * 1000).format('YYYY-MM-DD HH:mm:ss')
                }
            },
            error() {
                return prettyMilliseconds(0)
            }
        }
    },
    pv_total_size: {
        query: {
            id: 'pvTotalSize',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.pv_total_size.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]');
                if (!result) throw new Error();
                return prettyBytes(+result);
            },
            error() {
                return prettyBytes(0)
            }
        }
    },
    pv_used_size: {
        query: {
            id: 'pvUsedSize',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.pv_used_size.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]');
                if (!result) throw new Error();
                return prettyBytes(+result);
            },
            error() {
                return prettyBytes(0)
            }
        }
    },
    pv_usage_percent: {
        query: {
            id: 'pvUsagePercentage',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.pv_usage_percent.query
            },
            parse: (response: any) => {
                const result = _.get(response, 'data.result[0].value[1]');
                if (!result) throw new Error();
                return _.floor(result, 0);
            },
            error() {
                return 0;
            }
        }
    },
    hoursSinceLastBackup: {
        query: {
            id: 'hoursSinceLastBackup',
            type: 'api',
            url: endpoints.prometheusRead,
            method: 'GET',
            headers: {},
            body: {},
            params: {
                query: promql.hoursSinceLastBackup.query
            },
            parse: (response: any) => {
                return _.get(response, 'data.result') || [];
            },
            error() {
                return [];
            }
        }
    }
}
