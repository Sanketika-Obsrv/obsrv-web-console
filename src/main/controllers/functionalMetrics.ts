import { NextFunction, Request, Response } from 'express';
import appConfig from '../../shared/resources/appConfig';
import axios from 'axios';
import _ from 'lodash';

const getBaseUrl = (url: string) => {
    if (_.startsWith(url, '/prom')) return appConfig.PROMETHEUS.URL + _.replace(url, '/prom', '')
    else throw new Error('Invalid Url')
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
            query.url = getBaseUrl(endpoint)
            const { url, method, headers = {}, body = {}, params = {}, ...rest } = query;
            const apiResponse = await axios.request({ url, method, headers, params, data: body, ...rest })
            const data = _.get(apiResponse, 'data');
            return response.json(data);
        } catch (error: any) {
            next(error);
        }
    }
};
