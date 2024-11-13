import { NextFunction, Request, Response } from 'express';

import { register } from '../helpers/prometheus'

export default {
    name: 'prometheus:metrics:scrap',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        try {
            response.set('Content-Type', register.contentType);
            const metrics = await register.metrics()
            response.status(200).send(metrics);
        } catch (error) {
            next(error);
        }
    },
};