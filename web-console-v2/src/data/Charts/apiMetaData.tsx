import React from 'react';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import MetricsCard from '../../components/Cards/MetricsCard/MetricsCard';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import HeightIcon from '@mui/icons-material/Height';
import EastOutlinedIcon from '@mui/icons-material/EastOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import _ from 'lodash';
import chartMeta from '../../data/Charts/infra';
import styles from "./Charts.module.css";

export const getApiMetaData = (refresh: any, interval: any) => {

  return [
    {
      id: 'apiHealth',
      description:
        "Shows the Http Requests Health. If the API failure percentage is above 1%, then it's UNHEALTHY",
      chart: (
        <MetricsCard
          label="Health Status"
          description="Shows the Http Requests Health. If the API failure percentage is above 1%, then it's UNHEALTHY"
          icon={
            <MonitorHeartIcon className={styles.monitorIcon} />
          }
          query={_.get(chartMeta, 'api_health.query')}
          refresh={refresh}
          interval={interval}
        />
      ),
    },
    {
      id: 'apiResponseTime',
      description:
        "Shows the API Response time for today",
      chart: (
        <MetricsCard
          label="Response Time (Avg)"
          description="Shows the API Response time for today"
          icon={
            <>
              <WatchLaterIcon className={styles.watchIcon} />
              <HeightIcon className={styles.watchIcon} />
            </>
          }
          query={_.get(chartMeta, 'node_query_response_time_avg.query')}
          refresh={refresh}
          interval={interval}
        />
      ),
    },
    {
      id: 'apiMaxResponseTime',
      description:
        "Shows the Http Requests Health. If the API failure percentage is above 1%, then it's UNHEALTHY",
      chart: (
        <MetricsCard
          label="Response Time (Max)"
          description="Shows the max API Response time for today"
          icon={
            <span className={styles.apiHealthContainer}>
              <WatchLaterIcon className={styles.watchLaterIcon} />
              <EastOutlinedIcon className={styles.eastOutlineIcon} />
            </span>
          }
          query={_.get(chartMeta, 'node_query_response_time_max.query')}
          refresh={refresh}
          interval={interval}
        />
      ),
    },
    {
      id: 'apiFailurePercentage',
      description:
        "Shows the api failure percentage for today",
      chart: (
        <MetricsCard
          label="API Failure Percentage"
          description="Shows the api failure percentage for today"
          icon={
            <TrendingDownIcon className={styles.tradingDownIcon} />
          }
          query={_.get(chartMeta, 'api_failure_percent.query')}
          refresh={refresh}
          interval={interval}
        />
      ),
    },
  ]
};
