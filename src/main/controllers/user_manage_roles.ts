import { Response, Request, NextFunction } from 'express';
import userService from '../services/oauthUsers';
import { transform } from '../../shared/utils/transformResponse';
import _ from 'lodash';

const mergeRoles = (currentRoles: any, newConfigs: any, isOwner: boolean) => {
    const rolesToRemove = _.map(_.filter(newConfigs, { action: 'remove' }), 'value');
    const rolesToAdd = _.map(_.filter(newConfigs, { action: 'upsert' }), 'value');
    const conflictRoles = _.intersection(rolesToRemove, rolesToAdd);
    if (conflictRoles.length > 0) {
        throw new Error(`Can not upsert and remove the same role(s) at the same time: ${conflictRoles.join(', ')}`);
    }

    if (!isOwner) {
        if (rolesToAdd.includes('admin') || rolesToRemove.includes('admin')) {
            throw new Error('Only the owner can modify the admin role');
        }
    }

    return _.union(_.pullAll(currentRoles, rolesToRemove), rolesToAdd);
};

export default {
    name: 'user:manage:roles',
    handler: () => async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { user_name, roles } = _.get(req, ['body', 'request']);

            const isOwner = _.get(req, ['session', 'userDetails', 'is_owner']);
            const userId = _.get(req, ['session', 'userDetails', 'id']);
            const user = await userService.find({ user_name });
            const updatedRoles = mergeRoles(_.get(user, ['roles']), roles, isOwner);
            const result = await userService.update(
                { user_name },
                {
                    roles: updatedRoles,
                    last_updated_on: new Date().toISOString(),
                    updated_by: userId,
                },
            );
            res.status(200).json(transform({ id: req.body.id, result: { id: result.id, user_name: result.user_name, roles: result.roles } }));
        } catch (error) {
            if (error === 'user_not_found') {
                const err = new Error('User not found');
                const extendedError = Object.assign(err, { message: error, status: 404, responseCode: 'NOT_FOUND', errorCode: 'NOT_FOUND' });
                next(extendedError);
            } else {
                const e = error as Error;
                if (e.message && (e.message.includes('Only the owner can modify the admin role'))) {
                    return res.status(403).json({ error: e.message });
                }
                next(error);
            }
        }
    },
};
