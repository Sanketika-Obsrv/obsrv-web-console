import { http } from 'services/http';
import _ from 'lodash';
import endpoints from 'data/apiEndpoints';
import { Dispatch } from '@reduxjs/toolkit';
import { setConfigs } from 'store/reducers/config';

export const fetchSystemSettings = async (dispatch: Dispatch) => {
    try {
        const { data } = await http.get(`${endpoints.fetchConfigData}`);
        if (data) {
            sessionStorage.setItem("systemSettings", JSON.stringify(data));
            dispatch(setConfigs(data))
        }
    } catch (error) {
        console.log(error);
    }
}

export const getConfigValue = (variable: string) => {
    const config: string | any = sessionStorage.getItem('systemSettings');
    return _.get(JSON.parse(config), variable);
};

export const getBaseURL = () => {
    const baseUrl = getConfigValue('BASE_URL') || process.env.REACT_APP_BASE_URL || '';
    return baseUrl;
};
