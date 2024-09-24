import { createProxyMiddleware } from 'http-proxy-middleware';
import appConfig from '../../shared/resources/appConfig';
import { onError, onProxyReq, onProxyRes } from '../helpers/proxy';
import promEntities from '../resources/prometheusEntities';

const entity = promEntities.alerts;

export default {
    path: `${appConfig.BASE_URL}/alertmanager`,
    name: 'alertmanager',
    handler() {
        return createProxyMiddleware({
            headers: {
                Authorization: appConfig.GRAFANA.TOKEN,
            },
            target: appConfig.GRAFANA.URL,
            changeOrigin: true,
            pathRewrite: function (path: string, req: any) {
                return path.replace(`${appConfig.BASE_URL}/alertmanager`, '');
            },
            onProxyReq: onProxyReq({ entity }),
            onProxyRes: onProxyRes({ entity }),
            onError: onError({ entity }),
        });
    },
};
