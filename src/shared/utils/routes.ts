import { IRoute } from '../types';

export const mountRoutesWithApplication = (application: any) => (config: IRoute[]) => {
  const logger = application.get('logger');

  const helperFn = (routesConfig: IRoute[], prefix = '/api') => {
    for (const routeConfig of routesConfig) {
      const { path, method, routes, middlewares } = routeConfig;

      const routePath = `${prefix}/${path.trim()}`;

      if (routes && routes.length) helperFn(routes, routePath);

      if (method && middlewares && middlewares.length) {
        application[method.toLowerCase()](routePath, ...middlewares);

        logger.log({
          level: 'info',
          message: `route mounted, method: ${method}, path: ${routePath}`,
        });
      }
    }
  };

  helperFn(config);
};
