import React from 'react';
import { Typography } from '@mui/material';
import * as _ from 'lodash';

export const totalVsRunningNodes = (response: any) => {
  const [runningNodes, totalNodes] = response;
  return `${runningNodes} / ${totalNodes}`;
};

export const percentageUsage = (response: any) => {
  const [percentage, nodes] = response;
  return `${percentage} % Usage on ${nodes} Nodes`;
};

export const cpuPercentageUsage = (response: any) => {
  const [percentage, nodes, totalCpu] = response;
  return `${percentage}% Usage on ${nodes} Nodes, ${totalCpu} Cores`;
};

export const toPercentage = (response: any) => {
  if (!response || !Array.isArray(response) || response.length === 0) {
    return '0%';
  }

  const percentage = response[0];
  if (isNaN(percentage) || percentage === null || percentage === undefined) {
    return '0%';
  }

  return `${percentage}%`;
};

export const toB = (response: any) => {
  const [percentage] = response;
  return `${percentage}B`;
};
export const toEvents = (response: any) => {
  return (
    <Typography fontSize="3.025rem" variant="bodyBold">
      {response}{' '}
      <Typography fontSize="1.525rem" variant="bodyBold">
        Events
      </Typography>{' '}
    </Typography>
  );
};

export const backupStatus = (response: any) => {
    const [backupCount, percentage] = response;
    const status = percentage < 100 ? "Unhealthy" : "Healthy";
    return `${backupCount} Successful Backups (${status})`;
}

export const alertsFilterByLabels = (config: any) => {
    const { matchLabels } = config;
    return (alert: Record<string, any>) => {
        const labels = _.get(alert, 'labels') || {};
        if (_.size(matchLabels) === 0) return true;
        return _.every(matchLabels, (labelValue, labelKey) => {
            let doesExists: boolean;
            if (_.isArray(labelValue)) {
                doesExists = _.find(labels, (value, key) => _.includes(labelValue, value) && key === labelKey);
            } else {
                doesExists = _.find(labels, (value, key) => value === labelValue && key === labelKey);
            }
            return doesExists ? true : false;
        })
    }
}

export const pvUsage = (response: any) => {
    const [used, total] = response;
    return `${used} Used / ${total} Total`
}

export const checkHealthStatus = (healthChecks: any) => {
    const allChecksPassed = _.every(healthChecks, check => {
        const [label] = check;
        return _.toLower(label) === "healthy"
    });

    return allChecksPassed ? ["Healthy", "success"] : ["Unhealthy", "error"];
}


