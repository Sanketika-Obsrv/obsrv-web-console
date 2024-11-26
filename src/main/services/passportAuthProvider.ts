import {Request, Response, NextFunction, RequestHandler} from 'express';
import passport from 'passport';
import { BaseAuthProvider } from '../types';

export class PassportAuthProvider implements BaseAuthProvider {
    
    init(): (req: Request, res: Response, next: NextFunction) => void {
        return (req: Request, res: Response, next: NextFunction) => {
            passport.initialize()(req, res, () => {
                passport.session()(req, res, next);
            });
        };
    }

    authenticate(): (req: Request, res: Response, next: NextFunction) => void {
        return passport.authenticate('session');
    }
    async logout(req: Request, res: Response): Promise<void> {
        return new Promise((resolve) => {
            req.logout({ keepSessionInfo: false }, ((error: any) => {
                error && console.log("Error while logout", error)
            }))
            delete req.session.roles;
            delete req.session.userDetails;
            delete req.session.token;
            delete req.session.passport;
            resolve();
        });
    }
}