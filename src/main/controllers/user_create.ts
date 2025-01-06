import { Request, Response, NextFunction } from 'express';
import { transform } from '../../shared/utils/transformResponse';
import _ from 'lodash';
import appConfig from '../../shared/resources/appConfig';
import { userCreateWithKeycloak } from '../services/keycloak';
import { userCreateAsBasic } from '../services/basic';

const authenticationType = appConfig.AUTHENTICATION_TYPE;

export default {
    name: 'user:create',
    handler: () => async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userRequest = _.get(req, ['body', 'request']);
            const isOwner = _.get(req, ['session', 'userDetails', 'is_owner']);

            if (!isOwner && userRequest?.roles?.includes('admin')) {
                return res.status(403).json({
                    error: 'Only an owner can assign the admin role'
                });
            }

            userRequest.user_name = userRequest.user_name.trim().replace(/\s+/g, '_');
            if (authenticationType === 'keycloak') {
                const keycloakToken = JSON.parse(req?.session['keycloak-token']);
                const access_token = keycloakToken.access_token;
                const result = await userCreateWithKeycloak(access_token, userRequest);
                res.status(200).json(transform({ id: req.body.id, result: { id: result.id, user_name: result.user_name, email_address: result.email_address } }));
            } else if (authenticationType === 'basic') {
                const result = await userCreateAsBasic(userRequest);
                res.status(200).json(transform({ id: req.body.id, result: { id: result.id, user_name: result.user_name, email_address: result.email_address } }));
            }
        } catch (error) {
            next(error);
        }
    },
};
