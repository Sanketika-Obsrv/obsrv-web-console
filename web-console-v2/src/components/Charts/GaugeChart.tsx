import React, { useEffect, useState } from 'react';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import styles from './GaugeChart.module.css';
import {
  fetchMetricData,
  fetchMultipleMetrics,
} from '../../services/chartMetrics';

interface GaugeChartProps {
  uuid?: string;
  refresh?: boolean;
  query: any;
  caption: boolean;
  transformer?: (response: any) => any;
  transformer2?: (response: any) => any;

  suffix?: string;
  prefix?: string;
  query2?: any;
}

const GaugeChart: React.FC<GaugeChartProps> = (props) => {
  const [value, setValue] = useState<number>(0);
  const [nodesRunning, setNodesRunning] = useState<string>('NA');
  const [loading, setLoading] = useState<boolean>(true);

  const {
    uuid,
    refresh,
    query,
    transformer,
    transformer2,
    caption,
    suffix = '',
    prefix = '',
    query2,
    ...rest
  } = props;

  const fetchNodesRunning = async (query: any) => {
    try {
      const response = await fetchMultipleMetrics(query, { uuid });
      const transformedLabel =
        (transformer && transformer(response)) || response;
      setNodesRunning(transformedLabel as any);
    } catch (error) {
      //
    }
  };

  const fetchMetric = async (query: any) => {
    setLoading(true);
    try {
      const response = await fetchMetricData(query, { uuid });
      const transformedLabel =
        (transformer2 && transformer2(response)) || response;
      setValue(transformedLabel as any);
    } catch (error) {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetric(query);
    fetchNodesRunning(query2);
  }, [query, uuid, refresh]);

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  const unit = nodesRunning ? ' B' : '%';

  return (
    <Box className={styles.container}>
      <Box
        className={styles.centeredBox}
        sx={{
          clipPath: caption ? 'inset(0 0 20% 0)' : 'inset(0 0 45% 0)',
          top: caption ? '' : '75%',
        }}
      >
        <Typography
          variant="bodyBold"
          fontSize={30}
          component="div"
          sx={{
            zIndex: 2,
            position: 'relative',
            top: caption ? '' : '-1rem',
          }}
        >
          {`${prefix}${value}${suffix}`}
        </Typography>
      </Box>

      <Gauge
        value={value}
        startAngle={-90}
        endAngle={90}
        sx={{
          textAlign: 'center',
          [`& .${gaugeClasses.valueText}`]: {
            fontSize: 40,
            transform: 'translate(0px, 0px)',
            zIndex: 3,
          },
          [`& .${gaugeClasses.valueArc}`]: {
            fill: '#64B656',
          },
        }}
        text={() => ''}
      />

      {nodesRunning && caption && (
        <Typography
          variant="captionMedium"
          color="textSecondary"
          className={styles.nodesText}
        >
          {`${nodesRunning} Nodes Running`}
        </Typography>
      )}
    </Box>
  );
};

export default GaugeChart;