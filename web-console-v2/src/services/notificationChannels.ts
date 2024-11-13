import { http } from 'services/http';
import _ from 'lodash';

//For local
const ENDPOINTS = {
    GET_ALERT_CHANNELS: "/config/alerts/v1/notifications/get",
    SEARCH_CHANNELS: "/config/alerts/v1/notifications/search",
    ADD_ALERT_CHANNEL: "/config/alerts/v1/notifications/create",
    UPDATE_ALERT_CHANNEL: "/config/alerts/v1/notifications/update",
    DELETE_ALERT_CHANNEL: "/config/alerts/v1/notifications/delete",
    PUBLISH_ALERT: "/config/alerts/v1/notifications/publish",
    TEST_ALERT_CHANNEL: "/config/alerts/v1/notifications/test"
};

// For dev
// const ENDPOINTS = {
//     GET_ALERT_CHANNELS: "/console/config/alerts/v1/notifications/get",
//     SEARCH_CHANNELS: "/console/config/alerts/v1/notifications/search",
//     ADD_ALERT_CHANNEL: "/console/config/alerts/v1/notifications/create",
//     UPDATE_ALERT_CHANNEL: "/console/config/alerts/v1/notifications/update",
//     DELETE_ALERT_CHANNEL: "/console/config/alerts/v1/notifications/delete",
//     PUBLISH_ALERT: "/console/config/alerts/v1/notifications/publish",
//     TEST_ALERT_CHANNEL: "/console/config/alerts/v1/notifications/test"
// };

export const fetchChannels = ({ data, config = {} }: any) => {
    return http.post(ENDPOINTS.SEARCH_CHANNELS, data, config)
        .then(response => response.data);
}

export const createChannel = ({ data, config = {} }: any) => {
    return http.post(ENDPOINTS.ADD_ALERT_CHANNEL, data, config);
}

export const updateChannel = ({ id, data, config = {} }: any) => {
    const url = `${ENDPOINTS.UPDATE_ALERT_CHANNEL}/${id}`;
    return http.patch(url, data, config);
}

export const getChannel = ({ id, config = {} }: any) => {
    const url = `${ENDPOINTS.GET_ALERT_CHANNELS}/${id}`;
    return http.get(url, config)
        .then(response => response.data);
}

export const publishChannel = ({ id, config = {} }: any) => {
    const url = `${ENDPOINTS.PUBLISH_ALERT}/${id}`;
    return http.get(url, config);
}

export const testChannel = ({ data, config = {} }: any) => {
    const url = `${ENDPOINTS.TEST_ALERT_CHANNEL}`;
    return http.post(url, data, config);
}

export const retireChannel = ({ id, config = {} }: any) => {
    const url = `${ENDPOINTS.DELETE_ALERT_CHANNEL}/${id}`;
    return http.delete(url, config);
}