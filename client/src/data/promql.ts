export default {
    "cluster_running_nodes_count": {
        "query": 'count(kube_node_status_condition{condition="Ready",status="true"})'
    },
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
    "instance_memory": {
        "query": "(1 - sum(:node_memory_MemAvailable_bytes:sum{cluster=''}) / sum(node_memory_MemTotal_bytes{job='node-exporter',cluster=''})) * 100"
    },
    "instance_cpu": {
        "query": '(cluster:node_cpu:ratio_rate5m{cluster=""}) * 100'
    },
    "pv_usage_percent": {
        "query": 'sum(kubelet_volume_stats_used_bytes{persistentvolumeclaim=~\".+\"}) /sum(kubelet_volume_stats_capacity_bytes{persistentvolumeclaim=~\".+\"}) * 100'
    },
    "totalCpuCores": {
        "query": 'count(node_cpu_seconds_total{mode="idle"}) without (cpu,mode)'
    },
    "memory_used": {
        "query": "sum(node_memory_MemTotal_bytes{job='node-exporter', cluster=\"\"}) - sum(:node_memory_MemAvailable_bytes:sum{cluster=''})"
    },
    "memory_total": {
        "query": "sum(node_memory_MemTotal_bytes{job='node-exporter', cluster=\"\"})"
    },
    "cpu_usage_radial": {
        "query": "cluster:node_cpu:ratio_rate5m{cluster=''}"
    },
    "memory_usage_radial": {
        "query": "1 - sum(:node_memory_MemAvailable_bytes:sum{cluster=''}) / sum(node_memory_MemTotal_bytes{job='node-exporter',cluster=''})"
    },
    "cluster_total_nodes_count": {
        "query": "count(kube_node_info)"
    },
    "pv_total_size": {
        "query": 'sum(kubelet_volume_stats_capacity_bytes{persistentvolumeclaim=~".+"})'
    },
    "pv_used_size": {
        "query": 'sum(kubelet_volume_stats_used_bytes{persistentvolumeclaim=~".+"})'
    },
}
