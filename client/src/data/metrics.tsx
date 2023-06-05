import { CloudServerOutlined, DotChartOutlined, } from "@ant-design/icons";
import * as _ from 'lodash';
import ApexChart from "sections/dashboard/analytics/apex";
import chartMeta from 'data/charts';
import AnalyticsDataCard from "components/cards/statistics/AnalyticsDataCard";
import GaugeChart from "sections/dashboard/analytics/guageChart";
import ApexWithFilters from "sections/dashboard/analytics/ChartFilters";
import filters from 'data/chartFilters';
import AsyncLabel from "components/cards/statistics/AsyncLabel";
import { totalVsRunningNodes, percentageUsage, cpuPercentageUsage, pvUsage, } from 'services/transformers';

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
        }
    },
]
