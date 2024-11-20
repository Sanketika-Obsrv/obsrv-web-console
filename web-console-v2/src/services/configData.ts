import _ from 'lodash';
import { http } from './http';
import { storeLocalStorageItem, fetchLocalStorageItem } from 'utils/localStorage';


export const fetchSystemSettings = async () => {
    try {
        const { data } = await http.get(`/api/config/data`);    
        if (data) {
            storeLocalStorageItem("systemSettings", data);
        }
    } catch (error) {
        console.log(error);
    }
}

export const getConfigValueV1 = (variable: string) => {
    const config: string | any = fetchLocalStorageItem('systemSettings');
    return _.get(config, variable);
};

export const getConfigValue = (variable: string) => {
    const config: string | any = fetchLocalStorageItem('configDetails');
    return _.get(config, variable);
};

export const setVersionKey = (value: string) => {
    const config = fetchLocalStorageItem('configDetails') || {};

    _.set(config, 'version_key', value);

    return storeLocalStorageItem('configDetails', config);
};

export const getBaseURL = () => {
    const baseUrl = getConfigValueV1('BASE_URL') || process.env.REACT_APP_BASE_URL || '/console';
    return baseUrl;
};
