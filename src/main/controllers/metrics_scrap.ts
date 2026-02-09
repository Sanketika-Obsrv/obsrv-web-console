import { NextFunction, Request, Response } from 'express';

import { register } from '../helpers/prometheus'

export default {
    name: 'prometheus:metrics:scrap',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        try {
            response.set('Content-Type', register.contentType);
            const metrics = await register.metrics()
            response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
            response.status(200).send(metrics);
        } catch (error) {
            next(error);
        }
    },
};