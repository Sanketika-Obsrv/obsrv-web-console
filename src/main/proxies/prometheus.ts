import { createProxyMiddleware } from 'http-proxy-middleware';
import appConfig from '../../shared/resources/appConfig';
import { onError, onProxyReq, onProxyRes } from '../helpers/proxy';
import promEntities from '../resources/prometheusEntities'

const entity = promEntities.prometheus
const baseURL = appConfig.BASE_URL;

export default {
    path: `${baseURL}/prom`,
    name: 'prometheus',
    handler() {
        return createProxyMiddleware({
            target: appConfig.PROMETHEUS.URL,
            changeOrigin: true,
            pathRewrite: function (path: string, req: any) { return path.replace(`${baseURL}/prom`, '') },
            onProxyReq: onProxyReq({ entity }),
            onProxyRes: onProxyRes({ entity }),
            onError: onError({ entity })
        })
    }
}