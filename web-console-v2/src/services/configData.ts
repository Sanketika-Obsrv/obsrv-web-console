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

export const getSystemSetting = (variable: string) => {
    const config: string | any = fetchLocalStorageItem('systemSettings');
    return _.get(config, variable);
};

export const setVersionKey = (value: string) => {
    if(!value) {
        return;
    }
    return storeLocalStorageItem('version_key', value);
};

export const getBaseURL = () => {
    const baseUrl = getSystemSetting('BASE_URL') || process.env.REACT_APP_BASE_URL || '/console';
    return baseUrl;
};
