import { http } from 'services/http';
import endpoints from 'data/apiEndpoints';
import _ from 'lodash';

export const fetchChannels = ({ data, config = {} }: any) => {
    return http.post(endpoints.searchNotificationChannels, data, config)
        .then(response => response.data);
}

export const createChannel = ({ data, config = {} }: any) => {
    return http.post(endpoints.createNotificationChannel, data, config);
}

export const updateChannel = ({ id, data, config = {} }: any) => {
    const url = `${endpoints.updateNotificationChannel}/${id}`;
    return http.patch(url, data, config);
}

export const getChannel = ({ id, config = {} }: any) => {
    const url = `${endpoints.readNotificationChannel}/${id}`;
    return http.get(url, config)
        .then(response => response.data);
}

export const publishChannel = ({ id, config = {} }: any) => {
    const url = `${endpoints.publishNotificationChannel}/${id}`;
    return http.get(url, config);
}

export const testChannel = ({ data, config = {} }: any) => {
    const url = `${endpoints.testNotificationChannel}`;
    return http.post(url, data, config);
}

export const retireChannel = ({ id, config = {} }: any) => {
    const url = `${endpoints.deleteNotificationChannel}/${id}`;
    return http.delete(url, config);
}