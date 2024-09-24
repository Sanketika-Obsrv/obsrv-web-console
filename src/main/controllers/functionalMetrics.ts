import { NextFunction, Request, Response } from 'express';
import appConfig from '../../shared/resources/appConfig';
import axios from 'axios';
import _ from 'lodash';
import { incrementApiCalls, setQueryResponseTime, incrementFailedApiCalls } from '../helpers/prometheus';
import prometheusEntities from '../resources/prometheusEntities';

const getBaseUrl = (url: string) => {
    if (_.startsWith(url, '/prom')) return appConfig.PROMETHEUS.URL + _.replace(url, '/prom', '')
    else if (_.startsWith(url, '/config')) return appConfig.OBS_API.URL + "/" + _.trimStart(url,"/config")
    else throw new Error('Invalid Url')
}

const getEntity = (endpoint: string) => {
    if (endpoint.includes("prom")) return prometheusEntities.prometheus
    else return prometheusEntities.dataset;
}

export default {
    name: 'metrics',
    handler: () => async (request: Request & { startTime?: number }, response: Response, next: NextFunction) => {
        const { query } = request.body || {};
        let endpoint;
        const startTime = request?.startTime;
        try {
            if (!query) throw new Error('missing query');
            endpoint = query.url;
            if (!endpoint) throw new Error('Invalid Url')
            incrementApiCalls({ entity: getEntity(endpoint), endpoint: _.replace(endpoint, '/prom', '') });
            query.url = getBaseUrl(endpoint)
            const { url, method, headers = {}, body = {}, params = {}, ...rest } = query;
            const apiResponse = await axios.request({ url, method, headers, params, data: body, ...rest })
            const data = _.get(apiResponse, 'data');
            return response.json(data);
        } catch (error: any) {
            endpoint && incrementFailedApiCalls({ entity: getEntity(endpoint), ...(endpoint && { endpoint: _.replace(endpoint, '/prom', '') }) });
            next(error);
        } finally {
            const duration = startTime && (Date.now() - startTime);
            endpoint && duration && setQueryResponseTime(duration, { entity: getEntity(endpoint), ...(endpoint && { endpoint: _.replace(endpoint, '/prom', '') }) });
        }
    }
};