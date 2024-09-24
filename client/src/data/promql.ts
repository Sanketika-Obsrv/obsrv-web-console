export default {
    "node_memory": {
        "query": "(1 - sum(:node_memory_MemAvailable_bytes:sum{cluster=''}) / sum(node_memory_MemTotal_bytes{job='node-exporter',cluster=''})) * 100"
    },
    "node_cpu": {
        "query": '(cluster:node_cpu:ratio_rate5m{cluster=""}) * 100'
    },
    "cpu_percentage": {
        "query": 'cluster:node_cpu:ratio_rate5m{cluster=""}'
    },
    "memory_percentage": {
        "query": "1 - sum(:node_memory_MemAvailable_bytes:sum{cluster=''}) / sum(node_memory_MemTotal_bytes{job='node-exporter',cluster=''})"
    },
    "nodes_percentage": {
        "query": "100 * (count(up == 1) by (instance) / count(up) by (instance))"
    },
    "druid_health_status": {
        "query": "druid_health_status"
    },
    "instance_memory": {
        "query": "(1 - sum(:node_memory_MemAvailable_bytes:sum{cluster=''}) / sum(node_memory_MemTotal_bytes{job='node-exporter',cluster=''})) * 100"
    },
    "instance_cpu": {
        "query": '(cluster:node_cpu:ratio_rate5m{cluster=""}) * 100'
    },
    "instance_disk": {
        "query": "(sum(kubelet_volume_stats_used_bytes)/ sum(kubelet_volume_stats_capacity_bytes))* 100"
    },
    "cpu_usage_radial": {
        "query": "cluster:node_cpu:ratio_rate5m{cluster=''}"
    },
    "memory_usage_radial": {
        "query": "1 - sum(:node_memory_MemAvailable_bytes:sum{cluster=''}) / sum(node_memory_MemTotal_bytes{job='node-exporter',cluster=''})"
    },
    "memory_used": {
        "query": "sum(node_memory_MemTotal_bytes{job='node-exporter', cluster=\"\"}) - sum(:node_memory_MemAvailable_bytes:sum{cluster=''})"
    },
    "memory_total": {
        "query": "sum(node_memory_MemTotal_bytes{job='node-exporter', cluster=\"\"})"
    },
    "cluster_total_nodes_count": {
        "query": "count(kube_node_info)"
    },
    "cluster_running_nodes_count": {
        "query": 'count(kube_node_status_condition{condition="Ready",status="true"})'
    },
    "totalCpuCores": {
        "query": 'count(node_cpu_seconds_total{mode="idle"}) without (cpu,mode)'
    },
    "node_total_api_call_data_out": {
        "query": 'sum by (exported_endpoint)(increase(node_total_api_calls{entity="data-out"}[5m]))'
    },
    "node_total_api_call_data_in": {
        "query": 'sum by (exported_endpoint)(increase(node_total_api_calls{entity="data-in"}[5m]))'
    },
    "node_total_failed_api_call_data_out": {
        "query": 'sum by (exported_endpoint)(increase(node_failed_api_calls{entity="data-out"}[5m]))'
    },
    "node_total_failed_api_call_data_in": {
        "query": 'sum by (exported_endpoint)(increase(node_failed_api_calls{entity="data-in"}[5m]))'
    },
    "node_query_response_time_max_data_out": {
        "query": "max_over_time(max by (job) (node_query_response_time{entity='data-out'})[$interval:5m])"
    },
    "node_query_response_time_max_data_in": {
        "query": "max_over_time(max by (job) (node_query_response_time{entity='data-in'})[$interval:5m])"
    },
    "node_query_response_time_avg_data_out": {
        "query": "avg_over_time(avg by (job) (node_query_response_time{entity='data-out'})[$interval:5m])"
    },
    "node_query_response_time_avg_data_in": {
        "query": "avg_over_time(avg by (job) (node_query_response_time{entity='data-in'})[$interval:5m])"
    },
    "node_query_response_time_avg_timeseries_data_out": {
        "query": 'sum by (exported_endpoint) (node_query_response_time{entity="data-out"})'
    },
    "node_query_response_time_avg_timeseries_data_in": {
        "query": 'sum by (exported_endpoint) (node_query_response_time{entity="data-in"})'
    },
    "data_usage_growth": {
        "query": 'sum by (job) (s3_objects_size_sum_bytes)'
    },
    "deep_storage_total": {
        "query": 'sum(s3_objects_size_sum_bytes)'
    },
    "api_failure_percentage_data_out": {
        "query": '((sum_over_time(sum by (job) (node_failed_api_calls{entity="data-out"})[$interval:30s]) / sum_over_time(sum by (job) (node_total_api_calls{entity="data-out"})[$interval:30s]))*100)'
    },
    "api_failure_percentage_data_in": {
        "query": '((sum_over_time(sum by (job) (node_failed_api_calls{entity="data-in"})[$interval:30s]) / sum_over_time(sum by (job) (node_total_api_calls{entity="data-in"})[$interval:30s]))*100)'
    },
    "backupCount": {
        "query": "velero_backup_total"
    },
    "backupSuccessRate": {
        "query": 'sum(velero_backup_success_total{schedule=~".*"}) / sum(velero_backup_attempt_total{schedule=~".*"})'
    },
    "apiThroughput": {
        "query": 'sum_over_time(sum by (job) (node_total_api_calls{})[$interval:$res]) / avg_over_time(avg by (job) (node_query_response_time{})[$interval:$res])'
    },
    "postgres_backup_files": {
        "query": 's3_objects{job="s3-backups", prefix=~"postgresql"}'
    },
    "redis_backup_files": {
        "query": 's3_objects{job="s3-backups", prefix=~"redis"}'
    },
    "postgres_last_backup_time": {
        "query": '(time() - s3_last_modified_object_date{job="s3-backups", prefix=~"postgresql"})'
    },
    "redis_last_backup_time": {
        "query": '(time() - s3_last_modified_object_date{job="s3-backups", prefix=~"redis"})'
    },
    "ninty_percentile_query_response_time_data_out": {
        "query": 'quantile(0.9, max_over_time(node_query_response_time{entity="data-out"}[$interval]))'
    },
    "seventy_percentile_query_response_time_data_out": {
        "query": 'quantile(0.7, max_over_time(node_query_response_time{entity="data-out"}[$interval]))'
    },
    "fifty_percentile_query_response_time_interval_data_out": {
        "query": 'quantile(0.5, max_over_time(node_query_response_time{entity="data-out"}[$interval]))'
    },
    "sixty_percentile_query_response_time_interval_data_out": {
        "query": 'quantile(0.6, max_over_time(node_query_response_time{entity="data-out"}[$interval]))'
    },
    "ninty_percentile_query_response_time_data_in": {
        "query": 'quantile(0.9, max_over_time(node_query_response_time{entity="data-in"}[$interval]))'
    },
    "seventy_percentile_query_response_time_data_in": {
        "query": 'quantile(0.7, max_over_time(node_query_response_time{entity="data-in"}[$interval]))'
    },
    "fifty_percentile_query_response_time_interval_data_in": {
        "query": 'quantile(0.5, max_over_time(node_query_response_time{entity="data-in"}[$interval]))'
    },
    "sixty_percentile_query_response_time_interval_data_in": {
        "query": 'quantile(0.6, max_over_time(node_query_response_time{entity="data-in"}[$interval]))'
    },
    "pv_total_size": {
        "query": 'sum(kubelet_volume_stats_capacity_bytes{persistentvolumeclaim=~".+"})'
    },
    "pv_used_size": {
        "query": 'sum(kubelet_volume_stats_used_bytes{persistentvolumeclaim=~".+"})'
    },
    "pv_usage_percent": {
        "query": 'sum(kubelet_volume_stats_used_bytes{persistentvolumeclaim=~\".+\"}) /sum(kubelet_volume_stats_capacity_bytes{persistentvolumeclaim=~\".+\"}) * 100'
    },
    "flink_dataset_duplicate_batches": {
        "query": 'sum(sum_over_time(flink_taskmanager_job_task_operator_ExtractorJob_$dataset_extractor_duplicate_count[1d]))'
    },
    "flink_dataset_duplicate_events": {
        "query": 'sum(sum_over_time(flink_taskmanager_job_task_operator_PipelinePreprocessorJob_$dataset_dedup_failed_count[1d]))'
    },
    "flink_dataset_failed_events": {
        "query": `sum(sum_over_time(flink_taskmanager_job_task_operator_PipelinePreprocessorJob_$dataset_dedup_failed_count[1d])) +
        sum(sum_over_time(flink_taskmanager_job_task_operator_PipelinePreprocessorJob_$dataset_validator_failed_count[1d])) +
        sum(sum_over_time(flink_taskmanager_job_task_operator_ExtractorJob_$dataset_extractor_failed_count[1d])) +
        sum(sum_over_time(flink_taskmanager_job_task_operator_ExtractorJob_$dataset_extractor_duplicate_count[1d])) +
        sum(sum_over_time(flink_taskmanager_job_task_operator_TransformerJob_$dataset_transform_failed_count[1d])) +
        sum(sum_over_time(flink_taskmanager_job_task_operator_DruidRouterJob_$dataset_failed_event_count[1d]))`
    },
    "flink_master_dataset_failed_events": {
        "query": `sum(sum_over_time(flink_taskmanager_job_task_operator_PipelinePreprocessorJob_$dataset_dedup_failed_count[1d])) +
        sum(sum_over_time(flink_taskmanager_job_task_operator_PipelinePreprocessorJob_$dataset_validator_failed_count[1d])) +
        sum(sum_over_time(flink_taskmanager_job_task_operator_ExtractorJob_$dataset_extractor_failed_count[1d])) +
        sum(sum_over_time(flink_taskmanager_job_task_operator_ExtractorJob_$dataset_extractor_duplicate_count[1d])) +
        sum(sum_over_time(flink_taskmanager_job_task_operator_TransformerJob_$dataset_transform_failed_count[1d]))`
    },
    "hoursSinceLastBackup": {
        "query": 'velero_backup_last_successful_timestamp'
    },
    "jdbc_processed_events": {
        "query": 'sum(sum_over_time(jdbcconnectorjob_processed_event_count{datasetId=$dataset}[1d]))'
    },
    "jdbc_processed_events_chart": {
        "query": 'sum(jdbcconnectorjob_processed_event_count{datasetId=$dataset})'
    },
    "jdbc_avg_processing_time": {
        "query": 'avg_over_time(jdbcconnectorjob_processing_time_in_ms{datasetId=$dataset}[1d])'
    },
    "jdbc_failed_events": {
        "query": 'sum(sum_over_time(jdbcconnectorjob_failure_count{datasetId=$dataset}[1d]))'
    },
    "jdbc_failed_events_chart": {
        "query": 'sum(jdbcconnectorjob_failure_count{datasetId=$dataset})'
    },
    "object_objects_discovered": {
        "query": "sum(sum_over_time(objectdiscoveryjob_num_new_objects{datasetId=$dataset}[1d]))"
    },
    "objects_discovered_chart": {
        "query": "sum(objectdiscoveryjob_num_new_objects{datasetId=$dataset})"
    },
    "event_processed": {
        "query": "sum(sum_over_time(objectprocessorjob_num_events{datasetId=$dataset}[1d]))"
    },
    "event_processed_chart": {
        "query": "sum(sum_over_time(objectprocessorjob_num_events{datasetId=$dataset}[1d]))"
    },
    "objects_processed": {
        "query": "sum(sum_over_time(objectprocessorjob_num_object_processed{datasetId=$dataset}[1d]))"
    },
    "objects_processed_chart": {
        "query": "sum(sum_over_time(objectprocessorjob_num_object_processed{datasetId=$dataset}[1d]))"
    },
    "object_cloud_auth_failure": {
        "query": "sum(sum_over_time(objectdiscoveryjob_cloud_authentication_failure{datasetId=$dataset}[1d]))"
    },
    "object_processing_failure": {
        "query": "sum(sum_over_time(objectprocessorjob_num_object_failed{datasetId=$dataset}[1d]))"
    },
    "object_processing_time": {
        "query": "avg_over_time(objectprocessorjob_object_processing_time_in_ms{datasetId=$dataset}[1d])"
    },
    "object_processed_size": {
        "query": "avg(sum_over_time(objectprocessorjob_object_size_in_kb{datasetId=$dataset}[1d]))"
    },
    "num_api_calls": {
        "query": "sum(sum_over_time(objectdiscoveryjob_num_api_calls{datasetId=$dataset}[1d])) + sum(sum_over_time(objectprocessorjob_num_api_calls{datasetId=$dataset}[1d]))"
    }
}