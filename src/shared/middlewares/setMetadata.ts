import { NextFunction, Request, Response } from 'express';

export default {
  name: 'set:metadata',
  handler:
    (metadata: Record<string, any> = {}) =>
    (request: Request, response: Response, next: NextFunction) => {
      const { id } = metadata;

      request.responsePayload = {};

      if (id) {
        request.responsePayload.id = id;
      }

      next();
    },
};
