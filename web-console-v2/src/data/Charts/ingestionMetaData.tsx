import React from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { toEvents } from '../../services/transformers';
import _ from 'lodash';
import chartMeta from './ingestion';
import IngestionMetricsCard from 'components/Cards/IngestionMetricCard';
import styles from "./Charts.module.css";

export const getIngestionMetaData = (refresh: any, interval: any) => {
  return [
    {
      id: 'apiHealth',
      chart: (
        <IngestionMetricsCard
          label="Data Received (today)"
          description="This chart shows the total number of events received today"
          icon={
            <AssessmentIcon className={styles.assessmentIcon} />
          }
          query={_.get(chartMeta, 'totalEventsProcessedToday.query')}
          transformer={toEvents}
          refresh={refresh}
          interval={interval}
        />
      ),
    },
    {
      id: 'apiHealth2',
      description:
        "Shows the Http Requests Health. If the API failure percentage is above 1%, then it's UNHEALTHY",
      chart: (
        <IngestionMetricsCard
          label="Data Received (today)"
          description="This chart shows the total number of events received today"
          icon={<AssessmentIcon className={styles.assessmentIcon2} />}
          query={_.get(chartMeta, 'masterTotalEventsProcessedToday.query')}
          transformer={toEvents}
          refresh={refresh}
          interval={interval}
        />
      ),
    },
  ];
}
