import path from 'path';

import { IMiddleware } from '../../shared/types';
import { scrapModules } from '../../shared/utils/fs';

const middlewares = scrapModules<IMiddleware>(__dirname, path.basename(__filename));

export default middlewares;
