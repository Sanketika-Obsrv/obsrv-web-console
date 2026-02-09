import { NextFunction, Request, Response } from 'express';
import _ from 'lodash';
import { fetchDataset, fetchDraftDataset } from '../services/dataset';

export default {
    name: 'dataset:exists',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        const datasetId = _.get(request.params, 'datasetId');
        response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        try {
            const liveDataset = await Promise.allSettled([fetchDataset({ datasetId })])
            if (liveDataset[0].status === 'fulfilled') {
                return response.status(200).json(liveDataset[0].value)
            }

            const draftDataset = await Promise.allSettled([fetchDraftDataset({ datasetId })])
            if (draftDataset[0].status === 'fulfilled') {
                return response.status(200).json(draftDataset[0].value)
            }

            if (draftDataset[0].status === 'rejected') {
                const errorData = _.get(draftDataset[0], ['reason', 'response', 'data']);
                return response.status(_.get(draftDataset[0], ['reason', 'status'])).json(errorData)
            }
        } catch (error) {
            next(error);
        }
    }
};
