import { NextFunction, Request, Response } from 'express';

export default {
    name: 'auth:logout',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        request.logout({ keepSessionInfo: false }, ((error: any) => {
            error && console.log("Error while logout", error)
        }))
        response.status(200).json({ "status": "successful" })
    },
};