import { NextFunction, Request, Response } from 'express';
import Ajv from 'ajv';

export default {
    name: 'logRequestStartTime',
    handler:
        (metadata: Record<string, any> = {}) =>
            (request: Request & { startTime?: number }, response: Response, next: NextFunction) => {
                const startTime = Date.now();
                request.startTime = startTime;
                next();
            }
};
