const Prometheus = require('prom-client');

// Create a new Prometheus Gauge for query response time
const queryResponseTimeMetric = new Prometheus.Gauge({
    name: 'node_query_response_time',
    help: 'The average response time for database queries',
    labelNames: ['entity', 'endpoint']
});

// Create a new Prometheus Counter for total API calls
const totalApiCallsMetric = new Prometheus.Counter({
    name: 'node_total_api_calls',
    help: 'The total number of API calls made',
    labelNames: ['entity', 'endpoint']
});

// Create a new Prometheus Counter for failed API calls
const failedApiCallsMetric = new Prometheus.Counter({
    name: 'node_failed_api_calls',
    help: 'The total number of Failed API calls made',
    labelNames: ['entity', 'endpoint']
});

export {
    queryResponseTimeMetric,
    totalApiCallsMetric,
    failedApiCallsMetric
}