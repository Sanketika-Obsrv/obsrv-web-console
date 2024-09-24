import { NextFunction, Request, Response } from 'express';
import schemas from '../utils/validationSchemas';
import * as _ from 'lodash';
import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true });

export default {
    name: 'validateSchema',
    handler:
        (metadata: Record<string, any> = {}) =>
            (request: Request, response: Response, next: NextFunction) => {
                const { entityName, schema, validateAgainst = 'body' } = metadata;
                const entitySchemas = schemas.get(entityName);
                const schemaObject = _.get(entitySchemas, ['schemas', schema], {}) as Object;

                const errorObj = {
                    status: 400,
                    message: 'Bad Request Error',
                    responseCode: 'BAD_REQUEST',
                    errorCode: 'BAD_REQUEST',
                };

                if (!schemaObject) {
                    return next(errorObj);
                } else {
                    const valid = ajv.validate(schemaObject, request[validateAgainst as keyof Request]);
                    if (!valid) {
                        next({
                            ...errorObj,
                            message: ajv.errorsText() || 'Bad Request Error',
                        });
                    } else {
                        next();
                    }
                }
            },
};
