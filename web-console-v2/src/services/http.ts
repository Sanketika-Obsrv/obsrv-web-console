import axios from 'axios';
import { getSystemSetting } from './configData';

axios.defaults.headers.common['Cache-Control'] = 'no-store';
axios.defaults.headers.common['Pragma'] = 'no-store';
const http = axios.create({ baseURL: '/console'});

const responseInterceptor = (response: any) => response;

const checkForSessionExpiry = (config: any) => {
    const { navigate, status } = config;
    if (status === 401) {
        if (getSystemSetting("AUTHENTICATION_TYPE") !== 'basic') {
            window.location.href = '/console/logout';
        } else {
            navigate(`/login`);
        }
    }
}

const errorInterceptor = (config: any) => {
    const { navigate } = config;
    return (error: any) => {
        const status = error?.response?.status;
        checkForSessionExpiry({ navigate, status });
        return Promise.reject(error)
    }
}

const addHttpRequestsInterceptor = ({ responseInterceptor, errorInterceptor }: any) => {
    http.interceptors.response.use(responseInterceptor, errorInterceptor)
}

export { http, responseInterceptor, errorInterceptor, addHttpRequestsInterceptor };
