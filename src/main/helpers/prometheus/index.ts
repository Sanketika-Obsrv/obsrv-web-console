import client from 'prom-client';
import { queryResponseTimeMetric, totalApiCallsMetric, failedApiCallsMetric } from './metrics'
const metrics = [queryResponseTimeMetric, totalApiCallsMetric, failedApiCallsMetric];

const register = new client.Registry();

const configureRegistry = (register: client.Registry) => {
    client.collectDefaultMetrics({ register });
    register.setDefaultLabels({ release: 'monitoring' });
    metrics.forEach(metric => {
        register.registerMetric(metric);
    })
}

const incrementApiCalls = (labels: Record<string, any> = {}) => totalApiCallsMetric.labels(labels).inc();
const setQueryResponseTime = (duration: any, labels: Record<string, any> = {}) => queryResponseTimeMetric.labels(labels).set(duration);
const incrementFailedApiCalls = (labels: Record<string, any>) => failedApiCallsMetric.labels(labels).inc();

//register all the metrics
configureRegistry(register);

export { register, incrementApiCalls, incrementFailedApiCalls, setQueryResponseTime };

