import { createProxyMiddleware } from 'http-proxy-middleware';
import appConfig from '../../shared/resources/appConfig';
import promEntities from '../resources/prometheusEntities'
import { onError, onProxyReq, onProxyRes } from '../helpers/proxy';

const entity = promEntities.system;
const baseURL = appConfig.BASE_URL;

export default {
    path: `${baseURL}/system`,
    name: 'system',
    handler() {
        return createProxyMiddleware({
            target: appConfig.SYSTEM_API.URL,
            changeOrigin: true,
            pathRewrite: function (path: string, req: any) { return path.replace(baseURL, '') },
            onProxyReq: onProxyReq({ entity }),
            onProxyRes: onProxyRes({ entity }),
            onError: onError({ entity })
        })
    }
}