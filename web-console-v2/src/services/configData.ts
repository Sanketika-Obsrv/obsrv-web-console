import _ from 'lodash';

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
    const baseUrl = getConfigValue('BASE_URL') || process.env.REACT_APP_BASE_URL || '/console';
    return baseUrl;
};
