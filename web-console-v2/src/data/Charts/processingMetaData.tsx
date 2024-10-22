import React from 'react';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import HeightIcon from '@mui/icons-material/Height';
import EastOutlinedIcon from '@mui/icons-material/EastOutlined';
import _ from 'lodash';
import chartMeta from '../../data/Charts/processing';
import ProcessingMetricsCard from 'components/Cards/ProcessingMetricCard';
import styles from "./Charts.module.css"

export const getProcessingMetaData = (refresh: any) => {

  return [
    {
      chart: (
        <ProcessingMetricsCard
          label="Processing time (Avg)"
          description="This chart shows the average data processing time for today"
          icon={
            <MonitorHeartIcon className={styles.monitorIcon} />
          }
          query={_.get(chartMeta, 'avgProcessingTime.query')}
          refresh={refresh}
        />
      ),
    },
    {
      chart: (
        <ProcessingMetricsCard
          label="Processing Time (min)"
          description="This chart shows the minimum data processing time for today"
          icon={
            <>
              <WatchLaterIcon className={styles.watchIcon} />
              <HeightIcon className={styles.watchIcon} />
            </>
          }
          query={_.get(chartMeta, 'minProcessingTime.query')}
          refresh={refresh}
        />
      ),
    },
    {
      chart: (
        <ProcessingMetricsCard
          label="Processing Time (Max)"
          description="This chart shows the minimum data processing time for today"
          icon={
            <span className={styles.apiHealthContainer}>
              <WatchLaterIcon className={styles.watchLaterIcon} />
              <EastOutlinedIcon className={styles.eastOutlineIcon} />
            </span>
          }
          query={_.get(chartMeta, 'maxProcessingTime.query')}
          refresh={refresh}
        />
      ),
    },
  ];
}

export const getMasterProcessingMetaData = (refresh: any) => {
  return [
    {
      chart: (
        <ProcessingMetricsCard
          label="Processing time (Avg)"
          description="This chart shows the average processing time for master data today"
          icon={
            <MonitorHeartIcon className={styles.monitorIcon} />
          }
          query={_.get(chartMeta, 'masterAvgProcessingTime.query')}
          refresh={refresh}
        />
      ),
    },
    {
      chart: (
        <ProcessingMetricsCard
          label="Processing time (Min)"
          description="This chart shows the minimum processing time for master data today"
          icon={
            <>
              <WatchLaterIcon className={styles.watchIcon} />
              <HeightIcon className={styles.watchIcon} />
            </>
          }
          query={_.get(chartMeta, 'masterMinProcessingTime.query')}
          refresh={refresh}
        />
      ),
    },
    {
      chart: (
        <ProcessingMetricsCard
          label="Processing Time (Max)"
          description="This chart shows the maximum processing time for master data today"
          icon={
            <span className={styles.apiHealthContainer}>
              <WatchLaterIcon className={styles.watchLaterIcon} />
              <EastOutlinedIcon className={styles.eastOutlineIcon} />
            </span>
          }
          query={_.get(chartMeta, 'masterMaxProcessingTime.query')}
          refresh={refresh}
        />
      ),
    },
  ];
}