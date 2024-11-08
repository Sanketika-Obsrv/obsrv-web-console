import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import passport from 'passport';
import appConfig from '../../shared/resources/appConfig';
import { User } from '../types';

const baseURL = appConfig.BASE_URL;
const private_key: string = appConfig.USER_TOKEN_PRIVATE_KEY;

const generateToken = (user: User) => {
    const payload = _.pick(user, ['id', 'user_name', 'email_address', 'roles']);
    return new Promise((resolve, reject) => {
        jwt.sign(payload, private_key, { algorithm: 'RS512' }, (err, token) => {
            if (err) {
                return reject(err);
            }
            resolve(token as string);
        });
    });
};
export default {
    name: 'passportAuthenticateCallback',
    handler: () => (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate('local', (err: Error, user: User) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.redirect(`${baseURL}/login`);
            }
            return req.login(user, (loginErr) => {
                if (loginErr) {
                    return next(loginErr);
                }
                return generateToken(user)
                    .then((token: any) => {
                        req.session.token = token;
                        req.session.roles = _.get(user, ['roles']);
                        req.session.userDetails = _.pick(user, ['id', 'user_name', 'email_address', 'roles']);
                        return res.redirect(baseURL || '/');
                    })
                    .catch((tokenError) => {
                        return next(tokenError);
                    });
            });
        })(req, res, next);
    },
};
