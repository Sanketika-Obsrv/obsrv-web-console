import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import passport from 'passport';
import appConfig from '../../shared/resources/appConfig';
import { User } from '../types';
import { logger } from '../../shared/utils/logger';

const baseURL = appConfig.BASE_URL;
const private_key: string = appConfig.USER_TOKEN_PRIVATE_KEY;
const expiresIn = appConfig.USER_TOKEN_EXPIRY;

const generateToken = (user: User) => {
    const payload = _.pick(user, ['id', 'user_name', 'email_address', 'roles', 'is_owner']);
    return new Promise((resolve, reject) => {
        jwt.sign(payload, private_key, { algorithm: 'RS256', expiresIn: expiresIn }, (err, token) => {
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
                logger.error("err:", err)
                return next(err);
            }
            if (!user) {
                return res.redirect(`${baseURL}/login`);
            }
            return req.login(user, (loginErr) => {
                if (loginErr) {
                    logger.error("loginErr: ", loginErr)
                    return next(loginErr);
                }
                return generateToken(user)
                    .then((token: any) => {
                        req.session.token = token;
                        req.session.roles = _.get(user, ['roles']);
                        req.session.userDetails = _.pick(user, ['id', 'user_name', 'email_address', 'roles', 'is_owner']);
                        return res.redirect(baseURL || '/');
                    })
                    .catch((tokenError) => {
                        logger.error("tokenError: ", tokenError)
                        return next(tokenError);
                    });
            });
        })(req, res, next);
    },
};
