import { NextFunction, Request, Response } from 'express';

export default {
    name: 'setContext',
    handler: (apiId: string) => (req: Request, res: Response, next: NextFunction) => {
        (req as any).id = apiId;
        next();
    },
};
