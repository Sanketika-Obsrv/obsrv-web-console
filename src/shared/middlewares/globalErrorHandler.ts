/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import { transform } from '../utils/transformResponse';
import appConfig from '../resources/appConfig';
import { logger } from '../utils/logger';

export default {
    name: 'globalErrorHandler',
    handler: () => (error: any, request: Request, response: Response, next: NextFunction) => {
        const {
            message = error.message || 'Internal Server Error',
            status = error.status || 500,
            responseCode = error.responseCode || 'SERVER_ERROR',
            errorCode = error.errorCode || 'SERVER_ERROR',
        } = error;

        const { id = 'api' } = request.responsePayload || {};
        logger.error(error)
        if (request.url.includes("oauth/v1/login")) {
            return response.redirect(`${appConfig.BASE_URL}/login?err=Invalid Credentials`);
        }
        response.status(status).json(transform({ id, responseCode, params: { err: errorCode, errmsg: message } }));
    },
};
