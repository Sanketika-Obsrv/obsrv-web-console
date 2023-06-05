import path from 'path';
import { ISchemaValidator } from '../../../shared/types';
import { scrapModules } from '../../../shared/utils/fs';

const controllers = scrapModules<ISchemaValidator>(__dirname, path.basename(__filename));
export default controllers;
