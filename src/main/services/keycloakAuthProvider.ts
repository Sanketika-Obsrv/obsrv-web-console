import Keycloak from 'keycloak-connect';
import {authenticated, deauthenticated, keycloakLogout} from './keycloak';
import {Request, Response, NextFunction, RequestHandler} from 'express';
import { BaseAuthProvider } from '../types';

export class KeycloakAuthProvider implements BaseAuthProvider {
    private keycloak: Keycloak.Keycloak;

    constructor(keycloakConfig: Keycloak.KeycloakConfig, sessionStore: any) {
        this.keycloak = new Keycloak({store: sessionStore}, keycloakConfig);
        this.keycloak.authenticated = authenticated;
    }

    init(): RequestHandler[] {
     return this.keycloak.middleware();
    }

    authenticate(): (req: any, res: Response, next: NextFunction) => void {
        const protect = this.keycloak.protect();
        
        return async (req: any, res: Response, next: NextFunction) => {
            protect(req, res, async () => {
                try {
                    if (req.kauth?.grant) {
                        await authenticated(req);
                    }
                    next();
                } catch (error) {
                    next(error);
                }
            });
        };
    }

    async logout(req: Request, res: Response): Promise<void> {
        try {
            await keycloakLogout(req);
            deauthenticated(req);
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).send('Logout failed');
        }
    }
}