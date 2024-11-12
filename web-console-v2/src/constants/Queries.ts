export default {
  cluster_total_nodes_count: {
    query: 'count(kube_node_info)',
  },
  cluster_running_nodes_count: {
    query: 'count(kube_node_status_condition{condition="Ready",status="true"})',
  },
  cpu_percentage: {
    query: 'cluster:node_cpu:ratio_rate5m{cluster=""}',
  },
  memory_percentage: {
    query:
      "1 - sum(:node_memory_MemAvailable_bytes:sum{cluster=''}) / sum(node_memory_MemTotal_bytes{job='node-exporter',cluster=''})",
  },
  totalCpuCores: {
    query: 'count(node_cpu_seconds_total{mode="idle"}) without (cpu,mode)',
  },
  api_failure_percentage: {
    query:
      '((sum_over_time(sum by (job) (node_failed_api_calls)[$interval:30s]) / sum_over_time(sum by (job) (node_total_api_calls{entity="data-out"})[$interval:30s]))*100)',
  },
  node_query_response_time_max: {
    query: 'max_over_time(max by (job) (node_query_response_time)[1134m:5m])',
  },
  node_query_response_time_avg: {
    query: 'avg_over_time(avg by (job) (node_query_response_time)[1134m:5m])',
  },
  node_query_response_time_min: {
    query: 'min_over_time(min by (job) (node_query_response_time)[1134m:5m])',
  },
  deep_storage_total: {
    query: 'sum(s3_objects_size_sum_bytes)',
  },
  backupSuccessRate: {
    query:
      'sum(velero_backup_success_total{schedule=~".*"}) / sum(velero_backup_attempt_total{schedule=~".*"})',
  },
  postgres_backup_files: {
    query: 's3_objects{job="s3-backups", prefix=~"postgresql"}',
  },
  redis_backup_files: {
    query: 'sum(s3_objects{job="s3-backups", prefix=~"denorm-redis"}) + sum(s3_objects{job="s3-backups", prefix=~"dedup-redis"})',
  },

  postgres_last_backup_time: {
    query:
      '(time() - s3_last_modified_object_date{job="s3-backups", prefix=~"postgresql"})',
  },
  cluster_last_backup_time: {
    query:
      'time() - s3_last_modified_object_date{job="s3-common-backups", bucket=~"velero.*"}',
  },
  redis_last_backup_time: {
    query:
      'time() - s3_last_modified_object_date{job="s3-backups", prefix=~"denorm-redis|dedeup-redis"}',
  },
  pv_total_size: {
    query:
      'sum(kubelet_volume_stats_capacity_bytes{persistentvolumeclaim=~".+"})',
  },
  pv_used_size: {
    query: 'sum(kubelet_volume_stats_used_bytes{persistentvolumeclaim=~".+"})',
  },
  backupCount: {
    query: 'velero_backup_total',
  },
  pv_usage_percent: {
    query:
      'sum(kubelet_volume_stats_used_bytes{persistentvolumeclaim=~".+"}) /sum(kubelet_volume_stats_capacity_bytes{persistentvolumeclaim=~".+"}) * 100',
  },
  node_memory: {
    query:
      "(1 - sum(:node_memory_MemAvailable_bytes:sum{cluster=''}) / sum(node_memory_MemTotal_bytes{job='node-exporter',cluster=''})) * 100",
  },
  node_cpu: {
    query: '(cluster:node_cpu:ratio_rate5m{cluster=""}) * 100',
  },
};
