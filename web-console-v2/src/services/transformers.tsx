import React from 'react';
import { Typography } from '@mui/material';

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
