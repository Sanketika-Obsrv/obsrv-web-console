import * as React from 'react';
import GaugeChart from '../../Charts/GaugeChart';
import GaugeProgress from '../../GaugeProgress';
import chartMeta from '../../../data/Charts/infra';
import { toPercentage, totalVsRunningNodes } from '../../../services/transformers';
import _ from 'lodash';
import { Box, Paper } from '@mui/material';
import styles from "./BasicCard.module.css"

const BasicCard = () => {
  return (
    <Paper
      elevation={0}
      className={styles.mainCard}
    >
      <Box>
        <GaugeChart
          isHeaderData={true}
          caption={true}
          query={_.get(chartMeta, 'cpu_percentage').query}
          query2={[
            _.get(chartMeta, 'total_running_nodes_count.query'),
            _.get(chartMeta, 'total_nodes_count.query'),
          ]}
          transformer={totalVsRunningNodes}
          transformer2={toPercentage}
        />

        <GaugeProgress />
      </Box>
    </Paper>
  );
};

export default BasicCard;
