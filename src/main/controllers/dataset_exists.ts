import { NextFunction, Request, Response } from "express";
import { fetchDataset, fetchDraftDataset } from "../services/dataset";
import _ from "lodash";
import { getDiff } from "json-difference";

export default {
    name: 'dataset:exists',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        const { datasetId } = request.params;
        try {
            const liveDataset = await Promise.allSettled([fetchDataset({ datasetId })]) 
            if(liveDataset[0].status == 'fulfilled') {
                return response.status(200).json(liveDataset[0].value)
            }
            
            const draftDataset = await Promise.allSettled([fetchDraftDataset({ datasetId })]) 
            if(draftDataset[0].status == 'fulfilled') {
                return response.status(200).json(draftDataset[0].value)
            }

            if(draftDataset[0].status == 'rejected') { 
                return response.status(_.get(draftDataset[0], ['reason', 'status'])).json(_.get(draftDataset[0], ['reason', 'response', 'data']))
            }
            
            
        } catch (error) {
            next(error);
        }
    }
};
