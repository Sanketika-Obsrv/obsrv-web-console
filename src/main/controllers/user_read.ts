import { NextFunction, Request, Response } from 'express';
import _ from 'lodash';
import userService from '../services/oauthUsers';
import { transform } from '../../shared/utils/transformResponse';
import appConfig from '../../shared/resources/appConfig';

const authenticationType = appConfig.AUTHENTICATION_TYPE;

const getUserDetails = function (request: Request) {
    if (authenticationType === 'basic') {
        const token = _.get(request, ['session', 'token']);
        const userName = _.get(request, ['session', 'userDetails', 'user_name']);
        const userDetails = {
            token: token,
            sessionUserName: userName,
        };
        return userDetails;
    } else if (authenticationType === 'keycloak') {
        const keycloakToken = JSON.parse(request?.session['keycloak-token']);
        const access_token = keycloakToken?.access_token;
        const preferred_username = request?.session?.preferred_username;
        const userDetails = {
            token: access_token,
            sessionUserName: preferred_username,
        };
        return userDetails;
    }
};

export default {
    name: 'user:read',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        try {
            const { user_name } = _.get(request, ['params']);
            const sessionUserDetails = getUserDetails(request);
            const sessionUserName = sessionUserDetails?.sessionUserName;
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
                responseData.result.token = sessionUserDetails?.token;
            }
            response.status(200).json(transform(responseData));
        } catch (error) {
            next(error);
        }
    },
};
