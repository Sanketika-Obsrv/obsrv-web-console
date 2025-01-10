import { Response, Request, NextFunction } from 'express';
import userService from '../services/oauthUsers';
import { transform } from '../../shared/utils/transformResponse';
import _ from 'lodash';

export default {
    name: 'user:manage:status',
    handler: () => async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { user_name, status } = _.get(req, ['body', 'request']);
            const isOwner = _.get(req, ['session', 'userDetails', 'is_owner']);
            const userId = _.get(req, ['session', 'userDetails', 'id']);

            const user = await userService.find({ user_name });

            const hasAdminRole = user?.roles.includes('admin');

            if (hasAdminRole && !isOwner) {
                return res.status(403).json({
                    error: 'Only the owner can change the status of an admin user'
                });
            }

            const result = await userService.update(
                { user_name },
                {
                    status: status,
                    last_updated_on: new Date().toISOString(),
                    updated_by: userId,
                },
            );
            res.status(200).json(transform({ id: req.body.id, result: { id: result.id, user_name: result.user_name, status: result.status } }));
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
