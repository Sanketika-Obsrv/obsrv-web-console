import path from 'path';
import { scrapModules } from '../../shared/utils/fs';
import { IController } from '../../shared/types';
const controllers = scrapModules<IController>(__dirname, path.basename(__filename));
export default controllers;
