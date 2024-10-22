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

export const getStorageMetaData = (refresh: any) => {
  return [
    {
      id: 'storageUtilization',
      description:
        "This shows the storage usage percentage",
      chart: (
        <StorageMetricsCard
          description="This chart shows the storage usage percentage"
          label="Storage Utilization"
          icon={
            <MonitorHeartIcon className={styles.monitorIcon} />
          }
          query={_.get(chartMeta, 'pv_usage_percent.query')}
          refresh={refresh}
        />
      ),
    },
    {
      id: 'storageTotalUsedSize',
      description:
        "This shows the total used storage size",
      chart: (
        <StorageMetricsCard
          label="Used Storage Size"
          description="This chart shows the total used storage size"
          icon={
            <>
              <WatchLaterIcon className={styles.watchIcon} />
              <HeightIcon className={styles.watchIcon} />
            </>
          }
          query={_.get(chartMeta, 'pv_used_size.query')}
          refresh={refresh}
        />
      ),
    },
    {
      id: 'storageTotalSize',
      description:
        "This shows the total storage size",
      chart: (
        <StorageMetricsCard
          label="Total Storage Size"
          description="This chart shows the total storage size"
          icon={
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <WatchLaterIcon className={styles.watchLaterIcon} />
              <EastOutlinedIcon className={styles.eastOutlineIcon} />
            </span>
          }
          query={_.get(chartMeta, 'pv_total_size.query')}
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
      id: 'storagePostgresBackupFiles',
      description:
        "This shows total number of backup files for postgres",
      chart: (
        <StorageMetricsCard
          label="Total Postgres Backup Files"
          description="This chart shows total number of backup files for postgres"
          icon={<TrendingDownIcon className={styles.tradingDownIcon} />}
          query={_.get(chartMeta, 'postgres_backup_files.query')}
          refresh={refresh}
        />
      ),
    },
    {
      id: 'storageRedisBackupFiles',
      description:
        "This shows total number of backup files for redis",
      chart: (
        <StorageMetricsCard
          label="Total Redis Backup Files"
          description="This chart shows total number of backup files for redis"
          icon={<TrendingDownIcon className={styles.tradingDownIcon} />}
          query={_.get(chartMeta, 'redis_backup_files.query')}
          refresh={refresh}
        />
      ),
    },
    {
      id: 'storagaePostgresHoursSinceLastBackup',
      description:
        "This shows hours since last backup for postgres",
      chart: (
        <StorageMetricsCard
          label="Time Since Last Backup (Postgres)"
          description="This chart shows hours since last backup for postgres"
          icon={<TrendingDownIcon className={styles.tradingDownIcon} />}
          query={_.get(chartMeta, 'postgres_last_backup_time.query')}
          refresh={refresh}
        />
      ),
    },
    {
      id: 'storagaeRedisHoursSinceLastBackup',
      description:
        "This shows hours since last backup for redis",
      chart: (
        <StorageMetricsCard
          label="Time Since Last Backup (Redis)"
          description="This chart shows hours since last backup for redis"
          icon={<TrendingDownIcon className={styles.tradingDownIcon} />}
          query={_.get(chartMeta, 'redis_last_backup_time.query')}
          refresh={refresh}
        />
      ),
    },
  ];
}
