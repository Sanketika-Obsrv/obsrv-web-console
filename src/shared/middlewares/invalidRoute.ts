import { NextFunction, Request, Response } from 'express';
import createError from 'http-errors';

export default {
  name: 'invalidRoute',
  handler: () => (request: Request, response: Response, next: NextFunction) => {
    next(new createError.NotFound());
  },
};
