import { Request, Response, NextFunction } from 'express';
import userService from '../services/oauthUsers';
import bcrypt from 'bcryptjs';
import { transform } from '../../shared/utils/transformResponse';
import _ from 'lodash';

export default {
    name: 'user:update',
    handler: () => async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { user_name, ...updateInfo } = _.get(req, ['body', 'request']);
            const sessionUserName = _.get(req, ['session', 'userDetails', 'user_name']);
            if (user_name !== sessionUserName) {
                res.status(403).json(
                    transform({
                        responseCode: 'FORBIDDEN',
                        params: {
                            err: 'FORBIDDEN',
                            errmsg: 'Access denied',
                        },
                    }),
                );
            }
            if (_.isEmpty(updateInfo)) {
                return res.status(400).json({ error: 'Atleast one field is required to update' });
            }

            const user = await userService.find({ user_name });

            if (updateInfo.password) {
                updateInfo.password = await bcrypt.hash(updateInfo.password, 12);
            }
            const result = await userService.update(
                { user_name },
                {
                    ...updateInfo,
                    last_updated_on: new Date().toISOString(),
                },
            );
            res.status(200).json(transform({ id: req.body.id, result: { id: result.id, user_name: result.user_name } }));
        } catch (error) {
            next(error);
        }
    },
};
