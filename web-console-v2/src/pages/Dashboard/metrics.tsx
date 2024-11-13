/* eslint-disable */
import { CloudServerOutlined, BarChartOutlined, DotChartOutlined, ApiOutlined, DatabaseOutlined, SettingOutlined, PartitionOutlined } from "@ant-design/icons";
import * as _ from 'lodash';
import ApexChart from "sections/dashboard/analytics/apex";
import chartMeta from 'data/chartsComponents';
// import AlertsMessages from "components/cardsComponent/statistics/Alerts";
import ApexWithFilters from "sections/dashboard/analytics/ChartFilters";
import filters from 'data/chartFilters';
import { totalVsRunningNodes, percentageUsage, cpuPercentageUsage, alertsFilterByLabels, pvUsage, checkHealthStatus, toPercentage } from 'services/transformers';
import BasicCard2 from "components/Cards/BasicCard2/BasicCard2";
import GaugeChart from "components/Charts/GaugeChart";
import AsyncLabel from "components/AsyncLabel";
import MetricsCard from "components/Cards/MetricsCard/MetricsCard";
import IngestionCharts from "sections/dashboard/analytics/IngestionCharts";
import HoursSinceLastBackup from "sections/widgets/HoursSinceLastBackup";
import StorageMetricsCard from "components/Cards/StorageMetricCard";
import DatasetMetricsCard from "components/Cards/DatasetMetricsCard/DatasetMetricsCard";

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
            id: 'infraNodeRunningStatus',
            description: 'Nodes Running Status',
            chart: (
              <BasicCard2
                description="Nodes Running Status"
                header="Nodes Status"
                content={
                  <AsyncLabel
                    query={[
                      _.get(chartMeta, 'total_running_nodes_count.query'),
                      _.get(chartMeta, 'total_nodes_count.query'),
                    ]}
                    transformer={totalVsRunningNodes}
                  />
                }
                footer="Nodes Running"
              />
            ),
          },
          {
            id: 'infraCpuUsage',
            description: 'Current CPU Usage Percent',
            chart: (
              <BasicCard2
                description="Current CPU Usage Percent"
                header="CPU Usage"
                content={
                  <GaugeChart
                    caption={false}
                    query={_.get(chartMeta, 'cpu_percentage.query')}
                    transformer2={toPercentage}
                  />
                }
                footer={
                  <AsyncLabel
                    query={[
                      _.get(chartMeta, 'cpu_percentage.query'),
                      _.get(chartMeta, 'total_running_nodes_count.query'),
                      _.get(chartMeta, 'totalCPU.query'),
                    ]}
                    transformer={cpuPercentageUsage}
                  />
                }
              />
            ),
          },
          {
            id: 'infraMemoryUsage',
            description: 'Current Memory Usage Percent',
            chart: (
              <BasicCard2
                description="Current Memory Usage Percent"
                header="Memory Usage"
                content={
                  <GaugeChart
                    caption={false}
                    query={_.get(chartMeta, 'memory_percentage.query')}
                    transformer2={toPercentage}
                  />
                }
                footer={
                  <AsyncLabel
                    query={[
                      _.get(chartMeta, 'memory_percentage.query'),
                      _.get(chartMeta, 'total_running_nodes_count.query'),
                    ]}
                    transformer={percentageUsage}
                  />
                }
              />
            ),
          },
          {
            id: 'infraDiskUsage',
            description: 'Current Disk Usage Percent',
            chart: (
              <BasicCard2
                description="Current Disk Usage Percent"
                header="Disk Usage"
                content={
                  <GaugeChart
                    caption={false}
                    query={_.get(chartMeta, 'pv_usage_percent.query')}
                    transformer2={toPercentage}
                  />
                }
                footer={
                  <AsyncLabel
                    query={[
                      _.get(chartMeta, 'pv_usage_percent.query'),
                      _.get(chartMeta, 'total_running_nodes_count.query'),
                    ]}
                    transformer={percentageUsage}
                  />
                }
              />
            ),
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
      // large: {
      //   size: {
      //     xs: 12,
      //     sm: 12,
      //     md: 12,
      //     lg: 12
      //   },
      //   metadata: [
      //     {
      //       id: 'infraAlerts',
      //       description: "This table shows the currently active infrastructure alerts within the cluster",
      //       chart: <ApexWithFilters title="Incidents/Alerts" filters={[..._.get(filters, 'variant1')]} id="alertsInfra">
      //         {/* <AlertsMessages predicate={alertsFilterByLabels({ matchLabels: { component: "obsrv", type: ["infra", "Infrastructure", "infrastructure"] } })} /> */}
      //       </ApexWithFilters>
      //     }
      //   ]
      // }
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
          lg: 4
        },
        groups: [
          {
            title: "Data In",
            metadata: [
              {
                id: "apiHealth",
                description: "Shows the Http Requests Health. If the API failure percentage is above 1%, then it's Unhealthy",
                chart: (<MetricsCard label="Api health" query={_.get(chartMeta, 'api_health_data_in.query')} />)
              },
              {
                id: "apiResponseTime",
                description: "Shows the API Response time for today",
                chart: <MetricsCard label="Api Response Time" query={_.get(chartMeta, 'node_query_response_time_avg_data_in.query')} />
              },
              {
                id: "apiMaxResponseTime",
                description: "Shows the max API Response time for today",
                chart: <MetricsCard label="Api Response Time (Max)" query={_.get(chartMeta, 'node_query_response_time_max_data_in.query')} />
              },
              {
                id: "apiFailurePercentage",
                description: "Shows the api failure percentage for today",
                chart: <MetricsCard label="Api Failure Percentage" query={_.get(chartMeta, 'api_failure_percent_data_in.query')} suffix="%" />
              },
              {
                id: "apiFiftyPercentile",
                description: "Shows the 50th percentile for API response time",
                chart: <MetricsCard label="50th Percentile API Response Time" query={_.get(chartMeta, 'fifty_percentile_query_response_time_data_in.query')} />
              },
              {
                id: "apiSixtyPercentile",
                description: "Shows the 60th percentile for API response time",
                chart: <MetricsCard label="60th Percentile API Response Time" query={_.get(chartMeta, 'sixty_percentile_query_response_time_data_in.query')} />
              },
              {
                id: "apiSeventyPercentile",
                description: "Shows the 70th percentile for API response time",
                chart: <MetricsCard label="70th Percentile API Response Time" query={_.get(chartMeta, 'seventy_percentile_query_response_time_data_in.query')} />
              },
              {
                id: "apiNintyPercentile",
                description: "Shows the 90th percentile for API response time",
                chart: <MetricsCard label="90th Percentile API Response Time" query={_.get(chartMeta, 'ninty_percentile_query_response_time_data_in.query')} />
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
                description: "Shows the Http Requests Health. If the API failure percentage is above 1%, then it's Unhealthy",
                chart: <MetricsCard label="Api Health" query={_.get(chartMeta, 'api_health_data_out.query')} />
              },
              {
                id: "apiResponseTime",
                description: "Shows the API Response time for today",
                chart: <MetricsCard label="Api Response Time" query={_.get(chartMeta, 'node_query_response_time_avg_data_out.query')} />
              },
              {
                id: "apiMaxResponseTime",
                description: "Shows the max API Response time for today",
                chart: <MetricsCard label="Api Response Time (Max)" query={_.get(chartMeta, 'node_query_response_time_max_data_out.query')} />
              },
              {
                id: "apiFailurePercentage",
                description: "Shows the api failure percentage for today",
                chart: <MetricsCard label="Api Failure Percentage" query={_.get(chartMeta, 'api_failure_percent_data_out.query')} suffix="%" />
              },
              {
                id: "apiFiftyPercentile",
                description: "Shows the 50th percentile for API response time",
                chart: <MetricsCard label="50th Percentile API Response Time" query={_.get(chartMeta, 'fifty_percentile_query_response_time_data_out.query')} />
              },
              {
                id: "apiSixtyPercentile",
                description: "Shows the 60th percentile for API response time",
                chart: <MetricsCard label="60th Percentile API Response Time" query={_.get(chartMeta, 'sixty_percentile_query_response_time_data_out.query')} />
              },
              {
                id: "apiSeventyPercentile",
                description: "Shows the 70th percentile for API response time",
                chart: <MetricsCard label="70th Percentile API Response Time" query={_.get(chartMeta, 'seventy_percentile_query_response_time_data_out.query')} />
              },
              {
                id: "apiNintyPercentile",
                description: "Shows the 90th percentile for API response time",
                chart: <MetricsCard label="90th Percentile API Response Time" query={_.get(chartMeta, 'ninty_percentile_query_response_time_data_out.query')} />
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
      // large: {
      //   size: {
      //     xs: 12,
      //     sm: 12,
      //     md: 12,
      //     lg: 12
      //   },
      //   metadata: [
      //     {
      //       id: "apiAlerts",
      //       chart: <ApexWithFilters title="Incidents/Alerts" filters={[..._.get(filters, 'variant1')]} id="alertsApi">
      //         {/* <AlertsMessages predicate={alertsFilterByLabels({ matchLabels: { component: "obsrv", type: "api" } })} /> */}
      //       </ApexWithFilters>
      //     }
      //   ]
      // }
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
                chart: <MetricsCard label="Data Received (Today)" query={_.get(chartMeta, 'totalEventsProcessedToday.query')} suffix="Events" />
              },
            ],
          },
          {
            title: "Master Datasets ",
            metadata: [
              {
                id: "masterIngestionTotalEvents",
                description: "This chart shows the total number of events received today",
                chart: <MetricsCard label="Data Received (Today)" query={_.get(chartMeta, 'masterTotalEventsProcessedToday.query')} suffix="Events" />
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
          // {
          //     id: "ingestionAlerts",
          //     chart: <ApexWithFilters title="Incidents/Alerts" filters={[..._.get(filters, 'variant1')]} id="alertsIngestion">
          //         {/* <AlertsMessages interval={1440} predicate={alertsFilterByLabels({ matchLabels: { component: "obsrv", type: "ingestion" } })} /> */}
          //     </ApexWithFilters>
          // }
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
          lg: 4
        },
        groups: [
          {
            title: "Datasets ",
            metadata: [
              {
                id: "processingAvgTime",
                description: "This chart shows the average data processing time for today",
                chart: <MetricsCard label="Processing Time (Avg)" query={_.get(chartMeta, 'avgProcessingTime.query')} />
              },
              {
                id: "processingMinTime",
                description: "This chart shows the minimum data processing time for today",
                chart: <MetricsCard label="Processing Time (Min)" query={_.get(chartMeta, 'minProcessingTime.query')} />
              },
              {
                id: "processingMaxTime",
                description: "This chart shows the maximum data processing time for today",
                chart: <MetricsCard label="Processing Time (Max)" query={_.get(chartMeta, 'maxProcessingTime.query')} />
              },
            ],
          },
          {
            title: "Master Datasets",
            metadata: [
              {
                id: "processingMasterAvgTime",
                description: "This chart shows the average processing time for master data today",
                chart: <MetricsCard label="Processing Time (Avg)" query={_.get(chartMeta, 'masterAvgProcessingTime.query')} />
              },
              {
                id: "processingMasterMinTime",
                description: "This chart shows the minimum processing time for master data today",
                chart: <MetricsCard label="Processing Time (Min)" query={_.get(chartMeta, 'masterMinProcessingTime.query')} />
              },
              {
                id: "processingMasterMaxTime",
                description: "This chart shows the maximum processing time for master data today",
                chart: <MetricsCard label="Processing Time (Max)" query={_.get(chartMeta, 'masterMaxProcessingTime.query')} />
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
          // {
          //     id: "processingAlerts",
          //     chart: <ApexWithFilters title="Incidents/Alerts" filters={[..._.get(filters, 'variant1')]} id="alertsProcessing">
          //         {/* <AlertsMessages predicate={alertsFilterByLabels({ matchLabels: { component: "obsrv", type: "processing" } })} /> */}
          //     </ApexWithFilters>
          // }
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
          md: 3,
          lg: 3
        },
        metadata: [
        ]
      },
      small: {
        size: {
          xs: 12,
          sm: 6,
          md: 3,
          lg: 3
        },
        metadata: [
          {
            id: "storageTotalSize",
            description: "This chart shows the total storage size",
            chart: <StorageMetricsCard label="Used Storage Size" query={_.get(chartMeta, 'pv_used_size.query')} query2={_.get(chartMeta, 'pv_total_size.query')} query3={_.get(chartMeta, 'pv_usage_percent.query')} />
          },
          {
            id: "storageBackupCount",
            description: "This chart shows the count of cluster backup",
            chart: <StorageMetricsCard label="Success Cluster Backups Count" query={_.get(chartMeta, 'backup_count.query')} />
          },
          {
            id: "storageDeepStorageSize",
            description: "This chart shows the total size of deep storage.",
            chart: <StorageMetricsCard label="Deep Storage" query={_.get(chartMeta, 'deep_storage_total.query')} />
          },
          {
            id: "lastBackupCluster",
            description: "This chart shows the time since last cluster backup",
            chart: <StorageMetricsCard label="Time since last cluster backup" query={_.get(chartMeta, 'cluster_last_backup_time.query')} />
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
          // {
          //   id: "storageBackupTable",
          //   chart: <ApexWithFilters title="Hours Since Last Backup" id="hoursSinceLastBackup">
          //     <HoursSinceLastBackup />
          //   </ApexWithFilters>
          // },
          // {
          //     id: "storageAlerts",
          //     chart: <ApexWithFilters title="Incidents/Alerts" filters={[..._.get(filters, 'variant1')]} id="alertsStorage">
          //         {/* <AlertsMessages predicate={alertsFilterByLabels({ matchLabels: { component: "obsrv", type: "storage" } })} /> */}
          //     </ApexWithFilters>
          // }
        ]
      }
    }
  },
  {
    id: "individualDataset",
    primaryLabel: "Dataset",
    secondaryLabel: "Metrics",
    description: "This page shows the metrics of datasets processing. With this information you can monitor the processing time and throughput of the events.",
    color: 'main',
    charts: {
      xs: {
        size: {
          xs: 12,
          sm: 6,
          md: 4,
          lg: 4
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
        groups: [
          {
            title: "Dataset Status",
            metadata: [
              {
                id: "Status",
                description: "Status",
                chart: <DatasetMetricsCard label="Status" queryType={'status'} />
              },
              {
                id: "Last Synced Time",
                description: "Last Synced Time",
                chart: <DatasetMetricsCard label="Last Synced Time" queryType={'last_synced_time'} />
              }
            ]
          },
          {
            title: "Today",
            metadata: [
              {
                id: "Total Events Processed",
                description: "Total Events Processed",
                chart: <DatasetMetricsCard label="Total Events Processed" queryType={'total_events_processed'} interval={'today'} isApexChart={false}/>
              },
              {
                id: "Min Processing Time",
                description: "Min Processing Time",
                chart: <DatasetMetricsCard label="Min Processing Time" queryType={'min_processing_time'} interval={'today'} isApexChart={false}/>
              },
              {
                id: "Average Processing Time",
                description: "Average Processing Time",
                chart: <DatasetMetricsCard label="Average Processing Time" queryType={'average_processing_time'} interval={'today'} isApexChart={false}/>
              },
              {
                id: "Max Processing Time",
                description: "Max Processing Time",
                chart: <DatasetMetricsCard label="Max Processing Time" queryType={'max_processing_time'} interval={'today'} isApexChart={false}/>
              },
              {
                id: "Total Duplicate Batches",
                description: "Total Duplicate Batches",
                chart: <DatasetMetricsCard label="Total Duplicate Batches" queryType={'total_duplicate_batches'} interval={'today'} isApexChart={false}/>
              },
              {
                id: "Total Duplicate Events",
                description: "Total Duplicate Events",
                chart: <DatasetMetricsCard label="Total Duplicate Events" queryType={'total_duplicate_events'} interval={'today'} isApexChart={false}/>
              },
              {
                id: "Total Failed Events",
                description: "Total Failed Events",
                chart: <DatasetMetricsCard label="Total Failed Events" queryType={'total_failed_events'} interval={'today'} isApexChart={false}/>
              },
            ]
          },
          {
            title: "Yesterday",
            metadata: [
              {
                id: "Total Events Processed",
                description: "Total Events Processed",
                chart: <DatasetMetricsCard label="Total Events Processed" queryType={'total_events_processed'} interval={'yesterday'} isApexChart={false}/>
              },
              {
                id: "Min Processing Time",
                description: "Min Processing Time",
                chart: <DatasetMetricsCard label="Min Processing Time" queryType={'min_processing_time'} interval={'yesterday'} isApexChart={false}/>
              },
              {
                id: "Average Processing Time",
                description: "Average Processing Time",
                chart: <DatasetMetricsCard label="Average Processing Time" queryType={'average_processing_time'} interval={'yesterday'} isApexChart={false}/>
              },
              {
                id: "Max Processing Time",
                description: "Max Processing Time",
                chart: <DatasetMetricsCard label="Max Processing Time" queryType={'max_processing_time'} interval={'yesterday'} isApexChart={false}/>
              },
              {
                id: "Total Duplicate Batches",
                description: "Total Duplicate Batches",
                chart: <DatasetMetricsCard label="Total Duplicate Batches" queryType={'total_duplicate_batches'} interval={'yesterday'} isApexChart={false}/>
              },
              {
                id: "Total Duplicate Events",
                description: "Total Duplicate Events",
                chart: <DatasetMetricsCard label="Total Duplicate Events" queryType={'total_duplicate_events'} interval={'yesterday'} isApexChart={false}/>
              },
              {
                id: "Total Failed Events",
                description: "Total Failed Events",
                chart: <DatasetMetricsCard label="Total Failed Events" queryType={'total_failed_events'} interval={'yesterday'} isApexChart={false}/>
              },
            ]
          }
        ],
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
            id: "Total Events Processed",
            description: "This is a graphical representation of the total events processed by the dataset",
            chart: <DatasetMetricsCard label="Total Events Processed" queryType={'total_events_processed_apex_charts'} isApexChart={true}/>
          },
          {
            id: "Events Processing Time (ms)",
            chart: <DatasetMetricsCard label="Events Processing Time (ms)" queryType={'events_processing_time_apex_charts'} isApexChart={true}/>
          }
        ]
      },
    }
  }
]
