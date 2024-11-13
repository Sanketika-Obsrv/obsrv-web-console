import { NextFunction, Request, Response } from 'express';
import _ from 'lodash';
import { transform } from '../../shared/utils/transformResponse';

enum roles {
    Admin = 'admin',
}
export enum permissions {
    CreateUser = 'api.user.create',
    ReadUser = 'api.user.read',
    UpdateUser = 'api.user.update',
    UserStatus = 'api.user.status',
    UserRoles = 'api.user.roles',
    UserList = 'api.user.list',
}
interface AccessControl {
    [key: string]: string[];
}
const accessControl: AccessControl = {
    [roles.Admin]: [permissions.CreateUser, permissions.UserStatus, permissions.UserRoles, permissions.UserList],
};

export default {
    name: 'authorization',
    handler: () => (req: Request, res: Response, next: NextFunction) => {
        try {
            const userRoles = _.get(req, ['session', 'roles']);
            const action = (req as any).id;
            const hasAccess = userRoles.some((role: string) => accessControl[role] && accessControl[role].includes(action));
            if (hasAccess) {
                next();
            } else {
                res.status(403).json(
                    transform({
                        params: {
                            err: 'FORBIDDEN',
                            errmsg: 'Access denied',
                        },
                    }),
                );
            }
        } catch (error) {
            next(error);
        }
    },
};
