import { NextFunction, Request, Response } from 'express';
import _ from 'lodash';
import userService from '../services/oauthUsers';
import { transform } from '../../shared/utils/transformResponse';

export default {
    name: 'user:list',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        try {
            const apiId = _.get(request, ['body', 'id']);
            const sanitizedId = typeof apiId === 'string' ? apiId.replace(/[^\w.-]/g, '') : apiId;
            const user = _.get(request, ['body', 'request']);
            const result = await userService.findAll(user);

            const usersList = result.map((user: any) => {
                const { password, provider, mobile_number, ...sanitizedUser } = user;
                return sanitizedUser;
            });

            const responseData = { data: usersList, count: _.size(usersList) };
            response.status(200).json(transform({ id: sanitizedId, result: responseData }));
        } catch (error) {
            if (error === 'user_not_found') {
                const err = new Error('User not found');
                const extendedError = Object.assign(err, { message: error, status: 404, responseCode: 'NOT_FOUND', errorCode: 'NOT_FOUND' });
                next(extendedError);
            } else {
                next(error);
            }
        }
    },
};