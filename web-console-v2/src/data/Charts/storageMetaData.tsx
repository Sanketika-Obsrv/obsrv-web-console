import React from 'react';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import HeightIcon from '@mui/icons-material/Height';
import EastOutlinedIcon from '@mui/icons-material/EastOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import _ from 'lodash';
import chartMeta from '../../data/Charts/storage';
import StorageMetricsCard from 'components/Cards/StorageMetricCard';
import styles from "./Charts.module.css";
import { DatabaseOutlined } from '@ant-design/icons';
import { fontSize } from '@mui/system';

export const getStorageMetaData = (refresh: any) => {
  return [
    {
      id: 'storageTotalUsedSize',
      description:
        "This shows the total used storage size",
      chart: (
        <StorageMetricsCard
          label="Used Storage Size"
          description="This chart shows the total used storage size"
          icon={<DatabaseOutlined className={styles.tradingDownIcon} />}
          query={_.get(chartMeta, 'pv_used_size.query')}
          query2={_.get(chartMeta, 'pv_total_size.query')}
          query3={_.get(chartMeta, 'pv_usage_percent.query')}
          refresh={refresh}
        />
      ),
    },
    {
      id: 'storageBackupCount',
      description:
        "This shows the count of cluster backup",
      chart: (
        <StorageMetricsCard
          label="Success Cluster Backups Count"
          description="This chart shows the count of cluster backup"
          icon={<TrendingDownIcon className={styles.tradingDownIcon} />}
          query={_.get(chartMeta, 'backup_count.query')}
          refresh={refresh}
        />
      ),
    },
    {
      id: 'storageDeepStorageSize',
      description:
        "This shows the total size of deep storage",
      chart: (
        <StorageMetricsCard
          label="Deep Storage"
          description="This chart shows the total size of deep storage."
          icon={<TrendingDownIcon className={styles.tradingDownIcon} />}
          query={_.get(chartMeta, 'deep_storage_total.query')}
          refresh={refresh}
        />
      ),
    },
    {
      id: 'lastBackupCluster',
      description:
        "Time since last cluster backup",
      chart: (
        <StorageMetricsCard
          label="Time since last cluster backup"
          description="This chart shows the time since last cluster backup"
          icon={<span style={{ display: 'flex', flexDirection: 'column' }}>
            <WatchLaterIcon className={styles.watchLaterIcon} />
            <EastOutlinedIcon className={styles.eastOutlineIcon} />
          </span>}
          query={_.get(chartMeta, 'cluster_last_backup_time.query')}
          refresh={refresh}
        />
      ),
    },
  ];
}
