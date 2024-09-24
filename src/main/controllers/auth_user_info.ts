import { NextFunction, Request, Response } from 'express';

export default {
    name: 'auth:user:info',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        const user = request?.user as any
        const authInfo = request?.authInfo as any
        const data = {
            id: user?.id,
            name: user?.user_name,
            scope: authInfo?.scope,
            email: user?.email_address
        }
        response.json(data);
    },
};