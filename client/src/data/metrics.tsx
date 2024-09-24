import { CloudServerOutlined, BarChartOutlined, DotChartOutlined, ApiOutlined, DatabaseOutlined, SettingOutlined, PartitionOutlined } from "@ant-design/icons";
import * as _ from 'lodash';
import ApexChart from "sections/dashboard/analytics/apex";
import chartMeta from 'data/charts';
import ReportCard from "components/cards/statistics/ReportCard";
import AnalyticsDataCard from "components/cards/statistics/AnalyticsDataCard";
import AlertsMessages from "components/cards/statistics/Alerts";
import GaugeChart from "sections/dashboard/analytics/guageChart";
import ApexWithFilters from "sections/dashboard/analytics/ChartFilters";
import filters from 'data/chartFilters';
import AsyncLabel from "components/cards/statistics/AsyncLabel";
import { totalVsRunningNodes, percentageUsage, cpuPercentageUsage, alertsFilterByLabels, pvUsage, checkHealthStatus } from 'services/transformers';
import IngestionCharts from "sections/dashboard/analytics/IngestionCharts";
import HoursSinceLastBackup from "sections/widgets/HoursSinceLastBackup";

export const metricsMetadata = [
    {
        id: "overallInfra",
        primaryLabel: "Infrastructure",
        secondaryLabel: "Metrics",
        description: "This page shows the essential metrics of your cluster. With this information, you can easily monitor the health of your cluster and make informed decisions about scaling and resource allocation.",
        icon: DotChartOutlined,
        menuIcon: CloudServerOutlined,
        links: {
            grafana: {
                link: "d/efa86fd1d0c121a26444b636a3f509a8/kubernetes-compute-resources-cluster?orgId=1&refresh=10s"
            }
        },
        color: 'main',
        charts: {
            small: {
                size: {
                    xs: 12,
                    sm: 6,
                    md: 4,
                    lg: 3
                },
                metadata: [
                    {
                        id: "infraNodeRunningStatus",
                        description: "Nodes Running Status",
                        chart: <AnalyticsDataCard title="Nodes Status" tasks={[
                            <AsyncLabel align="center" variant="h3" fontSize={'8vh'} query={[_.get(chartMeta, 'total_running_nodes_count.query'), _.get(chartMeta, 'total_nodes_count.query')]} transformer={totalVsRunningNodes}></AsyncLabel>,
                            <AsyncLabel align="center" verticalAlign="flex-end" variant="body2" color="secondary" suffix='Nodes Running' />
                        ]}>
                        </AnalyticsDataCard>
                    },
                    {
                        id: "infraCpuUsge",
                        description: "Current CPU Usage Percent",
                        chart: <AnalyticsDataCard title="CPU Usage" tasks={[
                            <GaugeChart query={_.get(chartMeta, 'cpu_usage_radial.query')} />,
                            <AsyncLabel align="center" variant="body2" color="secondary" query={[_.get(chartMeta, 'cpu_usage_radial.query'), _.get(chartMeta, 'total_running_nodes_count.query'), _.get(chartMeta, 'totalCPU.query')]} transformer={cpuPercentageUsage}></AsyncLabel>
                        ]}>
                        </AnalyticsDataCard>
                    },
                    {
                        id: "infraMemoryUsage",
                        description: "Current Memory Usage Percent",
                        chart: <AnalyticsDataCard title="Memory Usage" tasks={[
                            <GaugeChart query={_.get(chartMeta, 'memory_usage_radial.query')} />,
                            <AsyncLabel align="center" variant="body2" color="textSecondary" query={[_.get(chartMeta, 'memory_usage_radial.query'), _.get(chartMeta, 'total_running_nodes_count.query')]} transformer={percentageUsage}></AsyncLabel>,
                            <AsyncLabel align="center" variant="body2" color="textSecondary" query={[_.get(chartMeta, 'usedMemory.query'), _.get(chartMeta, 'totalMemory.query')]} transformer={pvUsage} />
                        ]}>
                        </AnalyticsDataCard>
                    },
                    {
                        id: "infraDiskUsage",
                        description: "Current Disk Usage Percent",
                        chart: <AnalyticsDataCard title="Disk Usage" tasks={[
                            <GaugeChart arcsLength={[60, 20, 20]} query={_.get(chartMeta, 'pv_usage_percent.query')} />,
                            <AsyncLabel align="center" variant="body2" color="textSecondary" query={[_.get(chartMeta, 'pv_usage_percent.query'), _.get(chartMeta, 'total_running_nodes_count.query')]} transformer={percentageUsage} />,
                            <AsyncLabel align="center" variant="body2" color="textSecondary" query={[_.get(chartMeta, 'pv_used_size.query'), _.get(chartMeta, 'pv_total_size.query')]} transformer={pvUsage} />
                        ]}>
                        </AnalyticsDataCard>
                    },
                ]
            },
            medium: {
                size: {
                    xs: 12,
                    sm: 6,
                    md: 6,
                    lg: 6
                },
                metadata: [
                    {
                        id: 'infraCpuUsageTimeseries',
                        description: "This chart typically displays the percentage of a computer's central processing unit (CPU) that is currently being utilized. The chart may show a live update of the CPU usage over time, or display a historical record of usage over a specified period.",
                        chart: <ApexWithFilters title="CPU Usage" filters={_.get(filters, 'default')} id="cpuUsage">
                            <ApexChart metadata={_.get(chartMeta, 'instance_cpu')} interval={1440}></ApexChart>
                        </ApexWithFilters>
                    },
                    {
                        id: 'infraMemoryUsageTimeseries',
                        description: "This chart is a graphical representation of the amount of memory being used by a computer system at a given time. The chart typically displays the amount of memory usage as a percentage of the total available memory, with the horizontal axis representing time and the vertical axis representing memory usage percentage",
                        chart: <ApexWithFilters title="Memory Usage" filters={_.get(filters, 'default')} id="memoryUsage">
                            <ApexChart metadata={_.get(chartMeta, 'instance_memory')} interval={1440}></ApexChart>
                        </ApexWithFilters>
                    },
                    {
                        id: 'infraDiskUsageTimeseries',
                        description: "This is a graphical representation of the amount of disk space being used across a cluster",
                        chart: <ApexWithFilters title="Disk Usage" filters={_.get(filters, 'default')} id="diskUsage">
                            <ApexChart metadata={_.get(chartMeta, 'instance_disk')} interval={1440}></ApexChart>
                        </ApexWithFilters>
                    }
                ]
            },
            large: {
                size: {
                    xs: 12,
                    sm: 12,
                    md: 12,
                    lg: 12
                },
                metadata: [
                    {
                        id: 'infraAlerts',
                        description: "This table shows the currently active infrastructure alerts within the cluster",
                        chart: <ApexWithFilters title="Incidents/Alerts" filters={[..._.get(filters, 'variant1')]} id="alertsInfra">
                            <AlertsMessages predicate={alertsFilterByLabels({ matchLabels: { component: "obsrv", type: ["infra", "Infrastructure", "infrastructure"] } })} />
                        </ApexWithFilters>
                    }
                ]
            }
        }
    },
    {
        id: "api",
        primaryLabel: "API",
        secondaryLabel: "Metrics",
        description: "This page shows the metrics of http requests. Here you'll find real-time data on our API performance, including the number of requests received, the average response time, failed api calls etc. With this information, you can easily track how your API is performing, identify any bottlenecks or issues, and make data-driven decisions to optimize your API's performance",
        icon: DotChartOutlined,
        menuIcon: ApiOutlined,
        color: 'main',
        health: {
            query: [_.get(chartMeta, 'api_health_data_in.query'), _.get(chartMeta, 'api_health_data_out.query')],
            transformer: checkHealthStatus
        },
        links: {
            grafana: {
                link: "d/mini-dashboard/minio-dashboard?orgId=1"
            }
        },
        charts: {
            small: {
                size: {
                    xs: 12,
                    sm: 6,
                    md: 4,
                    lg: 3
                },
                groups: [
                    {
                        title: "Data In",
                        metadata: [
                            {
                                id: "apiHealth",
                                description: "Shows the Http Requests Health. If the API failure percentage is above 1%, then it's UNHEALTHY",
                                chart: <ReportCard primary="0" secondary="Health Status" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'api_health_data_in.query')} />
                            },
                            {
                                id: "apiResponseTime",
                                description: "Shows the API Response time for today",
                                chart: <ReportCard primary="0" secondary="Response Time (Avg)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'node_query_response_time_avg_data_in.query')} />
                            },
                            {
                                id: "apiMaxResponseTime",
                                description: "Shows the max API Response time for today",
                                chart: <ReportCard primary="0" secondary="Response Time (Max)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'node_query_response_time_max_data_in.query')} />
                            },
                            {
                                id: "apiFailurePercentage",
                                description: "Shows the api failure percentage for today",
                                chart: <ReportCard primary="0" secondary="Api Failure Percentage" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'api_failure_percent_data_in.query')} suffix="%" />
                            },
                            {
                                id: "apiFiftyPercentile",
                                description: "Shows the 50th percentile for API response time",
                                chart: <ReportCard primary="0" secondary="50th Percentile API Response Time" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'fifty_percentile_query_response_time_data_in.query')} />
                            },
                            {
                                id: "apiSixtyPercentile",
                                description: "Shows the 60th percentile for API response time",
                                chart: <ReportCard primary="0" secondary="60th Percentile API Response Time" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'sixty_percentile_query_response_time_data_in.query')} />
                            },
                            {
                                id: "apiSeventyPercentile",
                                description: "Shows the 70th percentile for API response time",
                                chart: <ReportCard primary="0" secondary="70th Percentile API Response Time" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'seventy_percentile_query_response_time_data_in.query')} />
                            },
                            {
                                id: "apiNintyPercentile",
                                description: "Shows the 90th percentile for API response time",
                                chart: <ReportCard primary="0" secondary="90th Percentile API Response Time" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'ninty_percentile_query_response_time_data_in.query')} />
                            },
                            {
                                id: "apiResponseTimeTimeseries",
                                description: "This chart shows the average API response time of http calls within the cluster",
                                chart: <ApexWithFilters title="API Response Time" filters={_.get(filters, 'default')} id="queryResponseTime">
                                    <ApexChart metadata={_.get(chartMeta, 'node_query_response_avg_timeseries_data_in')} interval={1440}></ApexChart>
                                </ApexWithFilters>,
                                size: {
                                    xs: 12,
                                    sm: 6,
                                    md: 6,
                                    lg: 6
                                },
                            },
                            {
                                id: "apiTotalHttpCallsTimeseries",
                                description: "This chart shows the total number of API calls within the cluster",
                                chart: <ApexWithFilters title="Number of API Calls (Per 5 Minute)" filters={_.get(filters, 'default')} id="numApiCalls">
                                    <ApexChart metadata={_.get(chartMeta, 'node_total_api_call_data_in')} interval={1440}></ApexChart>
                                </ApexWithFilters>,
                                size: {
                                    xs: 12,
                                    sm: 6,
                                    md: 6,
                                    lg: 6
                                },
                            },
                            {
                                id: "apiTotalFailedHttpCallsTimeseries",
                                description: "This chart shows the total number of failed api calls within the cluster",
                                chart: <ApexWithFilters title="Number of Failed API Calls (Per 5 Minute)" filters={_.get(filters, 'default')} id="numFailedApiCalls">
                                    <ApexChart metadata={_.get(chartMeta, 'node_total_failed_api_call_data_in')} interval={1440}></ApexChart>
                                </ApexWithFilters>,
                                size: {
                                    xs: 12,
                                    sm: 6,
                                    md: 6,
                                    lg: 6
                                },
                            }
                        ]
                    },
                    {
                        title: "Data Out /Query",
                        metadata: [
                            {
                                id: "apiHealth",
                                description: "Shows the Http Requests Health. If the API failure percentage is above 1%, then it's UNHEALTHY",
                                chart: <ReportCard primary="0" secondary="Health Status" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'api_health_data_out.query')} />
                            },
                            {
                                id: "apiResponseTime",
                                description: "Shows the API Response time for today",
                                chart: <ReportCard primary="0" secondary="Response Time (Avg)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'node_query_response_time_avg_data_out.query')} />
                            },
                            {
                                id: "apiMaxResponseTime",
                                description: "Shows the max API Response time for today",
                                chart: <ReportCard primary="0" secondary="Response Time (Max)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'node_query_response_time_max_data_out.query')} />
                            },
                            {
                                id: "apiFailurePercentage",
                                description: "Shows the api failure percentage for today",
                                chart: <ReportCard primary="0" secondary="Api Failure Percentage" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'api_failure_percent_data_out.query')} suffix="%" />
                            },
                            {
                                id: "apiFiftyPercentile",
                                description: "Shows the 50th percentile for API response time",
                                chart: <ReportCard primary="0" secondary="50th Percentile API Response Time" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'fifty_percentile_query_response_time_data_out.query')} />
                            },
                            {
                                id: "apiSixtyPercentile",
                                description: "Shows the 60th percentile for API response time",
                                chart: <ReportCard primary="0" secondary="60th Percentile API Response Time" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'sixty_percentile_query_response_time_data_out.query')} />
                            },
                            {
                                id: "apiSeventyPercentile",
                                description: "Shows the 70th percentile for API response time",
                                chart: <ReportCard primary="0" secondary="70th Percentile API Response Time" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'seventy_percentile_query_response_time_data_out.query')} />
                            },
                            {
                                id: "apiNintyPercentile",
                                description: "Shows the 90th percentile for API response time",
                                chart: <ReportCard primary="0" secondary="90th Percentile API Response Time" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'ninty_percentile_query_response_time_data_out.query')} />
                            },
                            {
                                id: "apiResponseTimeTimeseries",
                                description: "This chart shows the average API response time of http calls within the cluster",
                                chart: <ApexWithFilters title="API Response Time" filters={_.get(filters, 'default')} id="queryResponseTime">
                                    <ApexChart metadata={_.get(chartMeta, 'node_query_response_avg_timeseries_data_out')} interval={1440}></ApexChart>
                                </ApexWithFilters>,
                                size: {
                                    xs: 12,
                                    sm: 6,
                                    md: 6,
                                    lg: 6
                                },
                            },
                            {
                                id: "apiTotalHttpCallsTimeseries",
                                description: "This chart shows the total number of API calls within the cluster",
                                chart: <ApexWithFilters title="Number of API Calls (Per 5 Minute)" filters={_.get(filters, 'default')} id="numApiCalls">
                                    <ApexChart metadata={_.get(chartMeta, 'node_total_api_call_data_out')} interval={1440}></ApexChart>
                                </ApexWithFilters>,
                                size: {
                                    xs: 12,
                                    sm: 6,
                                    md: 6,
                                    lg: 6
                                },
                            },
                            {
                                id: "apiTotalFailedHttpCallsTimeseries",
                                description: "This chart shows the total number of failed api calls within the cluster",
                                chart: <ApexWithFilters title="Number of Failed API Calls" filters={_.get(filters, 'default')} id="numFailedApiCalls">
                                    <ApexChart metadata={_.get(chartMeta, 'node_total_failed_api_call_data_out')} interval={1440}></ApexChart>
                                </ApexWithFilters>,
                                size: {
                                    xs: 12,
                                    sm: 6,
                                    md: 6,
                                    lg: 6
                                },
                            }
                        ]
                    }
                ]
            },
            large: {
                size: {
                    xs: 12,
                    sm: 12,
                    md: 12,
                    lg: 12
                },
                metadata: [
                    {
                        id: "apiAlerts",
                        chart: <ApexWithFilters title="Incidents/Alerts" filters={[..._.get(filters, 'variant1')]} id="alertsApi">
                            <AlertsMessages predicate={alertsFilterByLabels({ matchLabels: { component: "obsrv", type: "api" } })} />
                        </ApexWithFilters>
                    }
                ]
            }
        }
    },
    {
        id: "ingestion",
        primaryLabel: "Ingestion",
        secondaryLabel: "Metrics",
        description: "This page shows the metrics related to data ingestion. With this information you can monitor the count of events ingested in real time.",
        icon: DotChartOutlined,
        menuIcon: PartitionOutlined,
        rotate: 180,
        color: 'main',
        health: {
            query: _.get(chartMeta, 'druid_health_status.query')
        },
        charts: {
            small: {
                size: {
                    xs: 12,
                    sm: 6,
                    md: 4,
                    lg: 4
                },
                groups: [
                    {
                        title: "Datasets ",
                        metadata: [
                            {
                                id: "ingestionTotalEvents",
                                description: "This chart shows the total number of events received today",
                                chart: <ReportCard primary="0" secondary="Data Received (Today)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'totalEventsProcessedToday.query')} suffix="Events" />
                            },
                        ],
                    },
                    {
                        title: "Master Datasets ",
                        metadata: [
                            {
                                id: "masterIngestionTotalEvents",
                                description: "This chart shows the total number of events received today",
                                chart: <ReportCard primary="0" secondary="Data Received (Today)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'masterTotalEventsProcessedToday.query')} suffix="Events" />
                            },
                        ],
                    },
                ],
                metadata: [],
            },
            medium: {
                size: {
                    xs: 12,
                    sm: 12,
                    md: 6,
                    lg: 6,
                },
                metadata: [
                    {
                        id: "ingestionTotalEventsAllDatasets",
                        description: "This chart shows the total number of events received within the cluster. It shows the cumulative count of all the datasets",
                        chart: <ApexWithFilters title="Total Data Received (All Datasets)" filters={_.get(filters, 'variant1')} id="totalEventsAllDatasets">
                            <ApexChart height="400" metadata={_.get(chartMeta, 'totalEventsProcessedTimeSeries')} interval={1440}></ApexChart>
                        </ApexWithFilters>
                    },
                    {
                        id: "ingestionTotalEventsAllMasterDatasets",
                        description: "This chart shows the total number of events received within the cluster. It shows the cumulative count of all the master datasets",
                        chart: <ApexWithFilters title="Total Data Received (All Master Datasets)" filters={_.get(filters, 'variant1')} id="totalEventsAllMasterDatasets">
                            <ApexChart height="400" metadata={_.get(chartMeta, 'masterTotalEventsProcessedTimeSeries')} interval={1440}></ApexChart>
                        </ApexWithFilters>
                    }
                ]
            },
            large: {
                size: {
                    xs: 12,
                    sm: 12,
                    md: 12,
                    lg: 12
                },
                metadata: [
                    {
                        id: "ingestionTotalDataReceivedPerDataset",
                        noItem: true,
                        chart: <IngestionCharts title="Total Data Received " chartName="totalEventsProcessedTimeSeriesPerDataset" size={{ xs: 12, sm: 6, md: 6, lg: 6 }} />
                    },
                    {
                        id: "ingestionTotalDataReceivedPerMasterDataset",
                        noItem: true,
                        chart: <IngestionCharts title="Total Data Received " chartName="totalEventsProcessedTimeSeriesPerMasterDataset" size={{ xs: 12, sm: 6, md: 6, lg: 6 }} master={true} />
                    },
                    {
                        id: "ingestionAlerts",
                        chart: <ApexWithFilters title="Incidents/Alerts" filters={[..._.get(filters, 'variant1')]} id="alertsIngestion">
                            <AlertsMessages interval={1440} predicate={alertsFilterByLabels({ matchLabels: { component: "obsrv", type: "ingestion" } })} />
                        </ApexWithFilters>
                    }
                ]
            }
        }
    },
    {
        id: "processing",
        primaryLabel: "Processing",
        secondaryLabel: "Metrics",
        description: "This page shows the metrics of datasets processing. With this information you can monitor the processing time and throughput of the events.",
        icon: DotChartOutlined,
        menuIcon: SettingOutlined,
        color: 'main',
        health: {
            query: _.get(chartMeta, 'druid_health_status.query')
        },
        charts: {
            small: {
                size: {
                    xs: 12,
                    sm: 6,
                    md: 4,
                    lg: 3
                },
                groups: [
                    {
                        title: "Datasets ",
                        metadata: [
                            {
                                id: "processingAvgTime",
                                description: "This chart shows the average data processing time for today",
                                chart: <ReportCard primary="0" secondary="Processing Time (Avg)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'avgProcessingTime.query')} />
                            },
                            {
                                id: "processingMinTime",
                                description: "This chart shows the minimum data processing time for today",
                                chart: <ReportCard primary="0" secondary="Processing Time (Min)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'minProcessingTime.query')} />
                            },
                            {
                                id: "processingMaxTime",
                                description: "This chart shows the maximum data processing time for today",
                                chart: <ReportCard primary="0" secondary="Processing Time (Max)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'maxProcessingTime.query')} />
                            },
                        ],
                    },
                    {
                        title: "Master Datasets",
                        metadata: [
                            {
                                id: "processingMasterAvgTime",
                                description: "This chart shows the average processing time for master data today",
                                chart: <ReportCard primary="0" secondary="Processing Time (Avg)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'masterAvgProcessingTime.query')} />
                            },
                            {
                                id: "processingMasterMinTime",
                                description: "This chart shows the minimum processing time for master data today",
                                chart: <ReportCard primary="0" secondary="Processing Time (Min)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'masterMinProcessingTime.query')} />
                            },
                            {
                                id: "processingMasterMaxTime",
                                description: "This chart shows the maximum processing time for master data today",
                                chart: <ReportCard primary="0" secondary="Processing Time (Max)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'masterMaxProcessingTime.query')} />
                            },
                        ],
                    },
                ],
                metadata: [],
            },
            medium: {
                size: {
                    xs: 12,
                    sm: 12,
                    md: 6,
                    lg: 6,
                },
                metadata: [
                    {
                        id: "processingAvgTimeTimeseries",
                        description: "This chart shows the average processing time for all the datasets",
                        chart: <ApexWithFilters title="Processing Time (All Datasets)" filters={_.get(filters, 'variant1')} id="processingTimeAllDatasets">
                            <ApexChart height="400" metadata={_.get(chartMeta, 'minProcessingTimeSeries')} interval={1440}></ApexChart>
                        </ApexWithFilters>
                    },
                    {
                        id: "masterProcessingAvgTimeTimeseries",
                        description: "This chart shows the average processing time for all the master datasets",
                        chart: <ApexWithFilters title="Processing Time (All Master Datasets)" filters={_.get(filters, 'variant1')} id="masterProcessingTimeAllDatasets">
                            <ApexChart height="400" metadata={_.get(chartMeta, 'masterMinProcessingTimeSeries')} interval={1440}></ApexChart>
                        </ApexWithFilters>
                    },
                ]
            },
            large: {
                size: {
                    xs: 12,
                    sm: 12,
                    md: 12,
                    lg: 12
                },
                metadata: [
                    {
                        id: "processingAvgTimePerDatasetTimeseries",
                        noItem: true,
                        chart: <IngestionCharts title="Procesing Time" chartName="minProcessingTimeSeriesPerDataset" size={{ xs: 12, sm: 6, md: 6, lg: 6 }} />
                    },
                    {
                        id: "processingAvgTimePerMasterDatasetTimeseries",
                        noItem: true,
                        chart: <IngestionCharts title="Procesing Time" chartName="minProcessingTimeSeriesPerMasterDataset" size={{ xs: 12, sm: 6, md: 6, lg: 6 }} master={true} />
                    },
                    {
                        id: "processingAlerts",
                        chart: <ApexWithFilters title="Incidents/Alerts" filters={[..._.get(filters, 'variant1')]} id="alertsProcessing">
                            <AlertsMessages predicate={alertsFilterByLabels({ matchLabels: { component: "obsrv", type: "processing" } })} />
                        </ApexWithFilters>
                    }
                ]
            }
        }
    },
    {
        id: "storage",
        primaryLabel: "Storage",
        secondaryLabel: "Metrics",
        description: "This page shows the metrics of storage",
        icon: DotChartOutlined,
        menuIcon: DatabaseOutlined,
        links: {
            grafana: {
                link: "d/EbXSjT24k/velero?orgId=1"
            }
        },
        color: 'main',
        charts: {
            xs: {
                size: {
                    xs: 12,
                    sm: 6,
                    md: 4,
                    lg: 3
                },
                metadata: [
                ]
            },
            small: {
                size: {
                    xs: 12,
                    sm: 6,
                    md: 4,
                    lg: 4
                },
                metadata: [
                    {
                        id: "storageUtilization",
                        description: "This chart shows the storage usage percentage",
                        chart: <ReportCard primary="0" secondary="Storage Utilization" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'pv_usage_percent.query')} suffix="%" />
                    },
                    {
                        id: "storageTotalUsedSize",
                        description: "This chart shows the total used storage size",
                        chart: <ReportCard primary="0" secondary="Used Storage Size" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'pv_used_size.query')} />
                    },
                    {
                        id: "storageTotalSize",
                        description: "This chart shows the total storage size",
                        chart: <ReportCard primary="0" secondary="Total Storage Size" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'pv_total_size.query')} />
                    },
                    {
                        id: "storageBackupCount",
                        description: "This chart shows the count of cluster backup",
                        chart: <ReportCard primary="0" secondary="Success Cluster Backups Count" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'backup_count.query')} />
                    },
                    {
                        id: "storageDeepStorageSize",
                        description: "This chart shows the total size of deep storage.",
                        chart: <ReportCard primary="0" secondary="Deep Storage" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'deep_storage_total.query')} />
                    },
                    {
                        id: "storagePostgresBackupFiles",
                        description: "This chart shows total number of backup files for postgres",
                        chart: <ReportCard primary="0" secondary="Total Postgres Backup Files" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'postgres_backup_files.query')} />
                    },
                    {
                        id: "storageRedisBackupFiles",
                        description: "This chart shows total number of backup files for redis",
                        chart: <ReportCard primary="0" secondary="Total Redis Backup Files" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'redis_backup_files.query')} />
                    },
                    {
                        id: "storagaePostgresHoursSinceLastBackup",
                        description: "This chart shows hours since last backup for postgres",
                        chart: <ReportCard primary="0" secondary="Time Since Last Backup (Postgres)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'postgres_last_backup_time.query')} />
                    },
                    {
                        id: "storagaeRedisHoursSinceLastBackup",
                        description: "This chart shows hours since last backup for redis",
                        chart: <ReportCard primary="0" secondary="Time Since Last Backup (Redis)" iconPrimary={BarChartOutlined} query={_.get(chartMeta, 'redis_last_backup_time.query')} />
                    }
                ]
            },
            medium: {
                size: {
                    xs: 12,
                    sm: 6,
                    md: 6,
                    lg: 6
                },
                metadata: [
                    {
                        id: "storageUtilizationTimeseries",
                        description: "This is a graphical representation of the amount of disk space being used across a cluster",
                        chart: <ApexWithFilters title="Disk Usage" filters={_.get(filters, 'default')} id="diskUsage">
                            <ApexChart metadata={_.get(chartMeta, 'instance_disk')} interval={1440}></ApexChart>
                        </ApexWithFilters>
                    },
                    {
                        id: "storageDeepStorageDataGrowth",
                        chart: <ApexWithFilters title="Deep Storage Usage Growth" filters={_.get(filters, 'default')} id="deepStorageDataGrowth">
                            <ApexChart metadata={_.get(chartMeta, 'data_growth_over_time')} interval={1440}></ApexChart>
                        </ApexWithFilters>
                    }
                ]
            },
            large: {
                size: {
                    xs: 12,
                    sm: 12,
                    md: 12,
                    lg: 12
                },
                metadata: [
                    {
                        id: "storageBackupTable",
                        chart: <ApexWithFilters title="Hours Since Last Backup" id="hoursSinceLastBackup">
                            <HoursSinceLastBackup />
                        </ApexWithFilters>
                    },
                    {
                        id: "storageAlerts",
                        chart: <ApexWithFilters title="Incidents/Alerts" filters={[..._.get(filters, 'variant1')]} id="alertsStorage">
                            <AlertsMessages predicate={alertsFilterByLabels({ matchLabels: { component: "obsrv", type: "storage" } })} />
                        </ApexWithFilters>
                    }
                ]
            }
        }
    }
]
