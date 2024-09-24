import axios, { AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { error } from './toaster';
import { v4 } from 'uuid';
import { getBaseURL } from './configData';

axiosRetry(axios, { retries: 3 });

axios.defaults.headers.common['Cache-Control'] = 'no-store';
axios.defaults.headers.common['Pragma'] = 'no-store';
const http = axios.create({ baseURL: getBaseURL() });

const request = (config: AxiosRequestConfig) => {
    return axios.request(config);
};

const responseInterceptor = (response: any) => response;

const checkForSessionExpiry = (config: any) => {
    const { navigate, status, dispatch } = config;
    if (status === 401) {
        dispatch(error({ message: 'Unauthorized access !!' }));
        navigate(`/login`);
    }
}

const errorInterceptor = (config: any) => {
    const { navigate, dispatch } = config;
    return (error: any) => {
        const { status } = error?.response;
        checkForSessionExpiry({ navigate, status, dispatch });
        return Promise.reject(error)
    }
}

const addHttpRequestsInterceptor = ({ responseInterceptor, errorInterceptor }: any) => {
    http.interceptors.response.use(responseInterceptor, errorInterceptor)
}

export { http, request, responseInterceptor, errorInterceptor, addHttpRequestsInterceptor };