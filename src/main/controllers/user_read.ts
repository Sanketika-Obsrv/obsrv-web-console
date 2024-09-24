import { NextFunction, Request, Response } from 'express';
import _ from 'lodash';
import userService from '../services/oauthUsers';
import { transform } from '../../shared/utils/transformResponse';

export default {
    name: 'user:read',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { user_name } = _.get(request, ['params']);
            const sessionUserName = _.get(request, ['session', 'userDetails', 'user_name']);
            if (user_name !== sessionUserName) {
                response.status(403).json(
                    transform({
                        params: {
                            err: 'FORBIDDEN',
                            errmsg: 'Access denied',
                        },
                        responseCode: 'FORBIDDEN',
                    }),
                );
            }
            const user = await userService.find({ user_name });
            const { password, ...userInfo } = user;
            const responseData = {
                id: 'api.user.read',
                result: userInfo,
            };
            const { fields } = _.get(request, ['query']);
            const includeToken = _.toLower(_.toString(fields)) === 'user_token';
            if (includeToken) {
                responseData.result.token = _.get(request, ['session', 'token']);
            }
            response.status(200).json(transform(responseData));
        } catch (error) {
            next(error);
        }
    },
};
