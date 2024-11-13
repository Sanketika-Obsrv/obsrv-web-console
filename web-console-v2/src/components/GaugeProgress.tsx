import React, { useEffect, useState } from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import chartMeta from '../data/Charts/infra';
import _ from 'lodash';
import { fetchMetricData } from '../services/chartMetrics';

const GaugeProgress = () => {
  const metricsMetadata = [
    {
      label: 'CPU Usage',
      metadata: chartMeta.cpu_percentage,
      value: 0,
      colors: {
        primary: [0, 79],
        warning: [80, 90],
        error: [91, 100],
      },
    },
    {
      label: 'Memory Usage',
      metadata: chartMeta.memory_percentage,
      value: 0,
      colors: {
        primary: [0, 79],
        warning: [80, 90],
        error: [91, 100],
      },
    },
    {
      label: 'Disk Usage',
      metadata: chartMeta.pv_usage_percent,
      value: 0,
      colors: {
        primary: [0, 59],
        warning: [60, 79],
        error: [80, 100],
      },
    },
  ];

  const [metrics, setMetrics] = useState(metricsMetadata);

  const getColor = (metric: Record<string, any>, value: number) => {
    if (value === 0) return 'error';
    const { colors } = metric;
    const color = _.findKey(colors, (range) => {
      const [start, end] = range;
      if (value >= start && value <= end) return true;
      return false;
    });

    return color || 'primary';
  };

  const fetchMetrics = async () => {
    try {
      const updatedMetrics = await Promise.all(
        _.map(metrics, (metric) =>
          fetchMetricData(metric.metadata.query as any).then((value: any) => ({
            ...metric,
            value,
          })),
        ),
      );
      setMetrics(updatedMetrics);
    } catch (error) {
      setMetrics(metricsMetadata);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <>
      {metrics.map((metric, index) => (
        <Box key={index} display="flex" alignItems="center" mt={1}>
          <Typography variant="body2" style={{ width: '30%', fontWeight: 500 }}>
            {metric.label}
          </Typography>
          <LinearProgress
            variant="buffer"
            value={metric.value}
            valueBuffer={100}
            color={getColor(metric, metric.value) as any}
            sx={{
              flexGrow: 1,
              marginLeft: 2,
              marginRight: 2,
              height: 6,
              borderRadius: 2,
              backgroundColor: '#f0f0f0',
              [`& .MuiLinearProgress-bar1Buffer`]: {
                backgroundColor: '#FFA726',
                borderRadius: 5,
              },
              [`& .MuiLinearProgress-bar2Buffer`]: {
                backgroundColor: '#FFF3E0',
                borderRadius: 5,
              },
            }}
          />
          <Typography variant="body2" style={{ fontWeight: 600 }}>
            {`${metric.value}%`}
          </Typography>
        </Box>
      ))}
    </>
  );
};

export default GaugeProgress;
