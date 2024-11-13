import { NextFunction, Request, Response } from 'express';
import Ajv from 'ajv';
import { ensureLoggedInMiddleware } from '../helpers/oauth';
const ajv = new Ajv({ allErrors: true });

export default {
    name: 'auth',
    handler:
        (metadata: Record<string, any> = {}) =>
            (request: Request, response: Response, next: NextFunction) => {

                if (request.path.includes("/api/oauth")) {
                    return next();
                }
               return ensureLoggedInMiddleware(request, response, next)  
            },
};
