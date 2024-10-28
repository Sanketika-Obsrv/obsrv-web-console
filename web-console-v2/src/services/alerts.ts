import { http } from 'services/http';
import endpoints from 'data/apiEndpoints';
import _ from 'lodash';
import { transformAlertDescription } from './utils';

export const fetchAlerts = ({ config }: any) => {
    return http.get(endpoints.alerts, config).then((response) => _.get(response, 'data.data.groups'));
};

export const fetchFiringAlerts = (groups: Array<Record<string, any>>) => {
    const rules = _.flatten(_.map(groups, (group) => _.get(group, 'rules') || []));
    const firingRules = _.filter(rules, ['state', 'firing']);
    const activeAlerts = _.flatten(_.map(firingRules, (firingRule) => _.get(firingRule, 'alerts') || []));
    const firingAlerts = _.filter(activeAlerts, fields => fields?.state !== "Normal");
    const filteredAlerts = _.map(_.orderBy(firingAlerts, ['activeAt'], ['desc']), (fields: any) => {
        const { labels, annotations } = fields;
        const { description, summary } = annotations;
        const transformedDescription = transformAlertDescription({ description: summary || description, labels })
        return { ...fields, ...(transformedDescription) && { transformedDescription } }
    }) || []
    const uniqFiringAlerts = _.uniqBy(filteredAlerts, field => field?.transformedDescription) || []
    return uniqFiringAlerts;
};

export const addAlert = (payload: any) => {
    return http.post(`${endpoints.addCustomAlerts}`, payload).then((response) => _.get(response, 'data.result'));
};

export const deleteAlert = ({ id }: any) => {
    return http.delete(`${endpoints.retireAlert}/${id}`).then((response) => _.get(response, 'data.result'));
};

export const editAlert = ({ id, data }: any) => {
    return http.patch(`${endpoints.updateAlert}/${id}`, data).then((response) => _.get(response, 'data.result'));
}

export const searchAlert = ({ config }: any) => {
    return http.post(`${endpoints.searchAlerts}`, config).then((response) => _.get(response, 'data.result'));
};

export const getAlertDetail = ({ id }: any) => {
    return http.get(`${endpoints.getAlert}/${id}`).then((response: any) => _.get(response, 'data.result.alerts'));
};

export const publishAlert = ({ id }: any) => {
    return http.get(`${endpoints.publishAlert}/${id}`).then((response: any) => _.get(response, "data.result"));
};

export const getMetricAlias = ({ config }: any) => {
    return http.post(`${endpoints.listMetricsAlias}`, config).then((response) => _.get(response, 'data.result'));
}

export const addSilence = (payload: any) => {
    return http.post(`${endpoints.addSilence}`, payload).then((response) => _.get(response, 'data.result'));
}

export const deleteSilence = (silenceId: string) => {
    return http.delete(`${endpoints.deleteSilence}/${silenceId}`).then((response) => _.get(response, 'data.result'));
}