import { Request, Response, NextFunction } from 'express';
import userService from '../services/oauthUsers';
import { v4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { transform } from '../../shared/utils/transformResponse';
import _ from 'lodash';

export default {
    name: 'user:create',
    handler: () => async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userRequest = _.get(req, ['body', 'request']);
            userRequest.user_name = userRequest.user_name.trim().replace(/\s+/g, '_');
            const { password } = userRequest;
            userRequest.password = await bcrypt.hash(password, 12);
            if (userRequest.mobile_number) {
                const { country_code, number } = userRequest.mobile_number;
                userRequest.mobile_number = `${String(country_code).trim()}_${String(number).trim()}`;
            }
            const userIdentifier = { id: v4(), created_on: new Date().toISOString() };
            const userInfo = { ...userRequest, ...userIdentifier };
            const result = await userService.save(userInfo);
            res.status(200).json(transform({ id: req.body.id, result: { id: result.id, user_name: result.user_name, email_address: result.email_address } }));
        } catch (error) {
            next(error);
        }
    },
};
