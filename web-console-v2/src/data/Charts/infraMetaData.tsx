import React from 'react';
import BasicCard2 from 'components/Cards/BasicCard2/BasicCard2';
import GaugeChart from '../../components/Charts/GaugeChart';
import chartMeta from '../../data/Charts/infra';
import _ from 'lodash';
import AsyncLabel from '../../components/AsyncLabel';
import {
  percentageUsage,
  cpuPercentageUsage,
  totalVsRunningNodes,
  toB,
  toPercentage,
} from '../../services/transformers';
export const getInfraMetaData = (refresh: any) => {
  return [
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
              refresh={refresh}
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
                _.get(chartMeta, 'totalCpuCores.query'),
              ]}
              transformer={cpuPercentageUsage}
              refresh={refresh}
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
              refresh={refresh}
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
              refresh={refresh?.infrastructure}
            />
          }
        />
      ),
    },
  ];
};

