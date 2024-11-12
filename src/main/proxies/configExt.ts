import { createProxyMiddleware } from 'http-proxy-middleware';
import appConfig from '../../shared/resources/appConfig';
import { onError, onProxyReq, onProxyRes } from '../helpers/proxy';
import promEntities from '../resources/prometheusEntities'

const entity = promEntities.config;
const baseURL = appConfig.BASE_URL;

export default {
    path: `${baseURL}/configV1`,
    name: 'config_ext',
    handler() {
        return createProxyMiddleware({
            target: appConfig.CONFIG_API_EXT.URL,
            changeOrigin: true,
            pathRewrite: function (path: string, req: any) { return path.replace(`${baseURL}/configV1`, '') },
            onProxyReq: onProxyReq({ entity }),
            onProxyRes: onProxyRes({ entity }),
            onError: onError({ entity })
        })
    }
}