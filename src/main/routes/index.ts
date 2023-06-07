import { IRoute } from '../../shared/types';
import { mountRoutesWithApplication } from '../../shared/utils/routes';
import routeConfig from '../resources/routesConfig';

export const mount = (application: any) => mountRoutesWithApplication(application)(routeConfig as IRoute[]);
