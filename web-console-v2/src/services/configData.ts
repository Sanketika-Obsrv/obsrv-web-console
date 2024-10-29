import _ from 'lodash';
import { http } from './http';


export const fetchSystemSettings = async () => {
    try {
        const { data } = await http.get(`/api/config/data`);    
        if (data) {
            sessionStorage.setItem("systemSettings", JSON.stringify(data));
        }
    } catch (error) {
        console.log(error);
    }
}

export const getConfigValueV1 = (variable: string) => {
    const config: string | any = sessionStorage.getItem('systemSettings');
    return _.get(JSON.parse(config), variable);
};

export const getConfigValue = (variable: string) => {
    const config: string | any = sessionStorage.getItem('configDetails');
    return _.get(JSON.parse(config), variable);
};

export const setVersionKey = (value: string) => {
    const config = JSON.parse(sessionStorage.getItem('configDetails') || '{}');

    _.set(config, 'version_key', value);

    return sessionStorage.setItem('configDetails', JSON.stringify(config));
};

export const getBaseURL = () => {
    const baseUrl = getConfigValueV1('BASE_URL') || process.env.REACT_APP_BASE_URL || '/console';
    return baseUrl;
};
