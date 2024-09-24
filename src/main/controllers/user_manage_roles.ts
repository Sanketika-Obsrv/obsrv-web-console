import { Response, Request, NextFunction } from 'express';
import userService from '../services/oauthUsers';
import { transform } from '../../shared/utils/transformResponse';
import _ from 'lodash';

const mergeRoles = (currentRoles: any, newConfigs: any) => {
    const rolesToRemove = _.map(_.filter(newConfigs, { action: 'remove' }), 'value');
    const rolesToAdd = _.map(_.filter(newConfigs, { action: 'upsert' }), 'value');
    const conflictRoles = _.intersection(rolesToRemove, rolesToAdd);
    if (conflictRoles.length > 0) {
        throw new Error(`Can not upsert and remove the same role(s) at the same time: ${conflictRoles.join(', ')}`);
    }
    return _.union(_.pullAll(currentRoles, rolesToRemove), rolesToAdd);
};

export default {
    name: 'user:manage:roles',
    handler: () => async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { user_name, roles } = _.get(req, ['body', 'request']);

            const user = await userService.find({ user_name });
            const updatedRoles = mergeRoles(_.get(user, ['roles']), roles);
            const result = await userService.update(
                { user_name },
                {
                    roles: updatedRoles,
                    last_updated_on: new Date().toISOString(),
                },
            );
            res.status(200).json(transform({ id: req.body.id, result: { id: result.id, user_name: result.user_name, roles: result.roles } }));
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
