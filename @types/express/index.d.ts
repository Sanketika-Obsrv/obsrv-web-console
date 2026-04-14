import 'express-session';

declare module 'express-session' {
  interface SessionData {
    'keycloak-token': string;
    preferred_username: string;
    passport: { user?: any };
    token: any;
    roles: any;
    userDetails: any;
  }
}

declare global {
  namespace Express {
    interface Request {
      responsePayload: Record<string, any>;
    }
  }
}

export {};

