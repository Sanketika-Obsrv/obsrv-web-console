import path from 'path';
import { IMiddleware } from '../types';
import { scrapModules } from '../utils/fs';

const middlewares = scrapModules<IMiddleware>(__dirname, path.basename(__filename));

export default middlewares;
