import React from 'react';
import BasicCard from '../../components/Cards/BasicCard/BasicCard';
import chartMeta from './header';
import _ from 'lodash';
import infraMeta from './infra';
import AnalyticsCard from '../../components/Cards/AnalyticsCard/AnalyticsCard';

export const headerMetaData = [
  {
    chart: <BasicCard />,
  },

  {
    chart: (
      <AnalyticsCard
        title="CPU Usage"
        metaData={chartMeta.node_cpu}
        step="30s"
      />
    ),
  },
  {
    chart: (
      <AnalyticsCard metaData={chartMeta.node_memory} title="Memory Usage" />
    ),
  },
];
