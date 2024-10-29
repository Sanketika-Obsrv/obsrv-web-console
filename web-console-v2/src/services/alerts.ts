import _ from "lodash";
import { http } from "./http";

//For local
// const ENDPOINTS = {
//     GRAFANA_RULES: "/alertmanager/api/prometheus/grafana/api/v1/rules",
//     SEARCH_ALERTS: "/config/alerts/v1/search",
//     GET_ALERT: "/config/alerts/v1/get",
//     UPDATE_ALERT: "/config/alerts/v1/update",
//     RETIRE_ALERT: "/config/alerts/v1/delete",
//     PUBLISH_ALERT: "/config/alerts/v1/publish",
//     ADD_CUSTOM_ALERTS: "/config/alerts/v1/create",
//     LIST_METRICS_ALIAS: "/config/alerts/v1/metric/alias/search",
//     ADD_SILENCE: "/config/alerts/v1/silence/create",
//     DELETE_SILENCE: "/config/alerts/v1/silence/delete"
// };

// For dev
const ENDPOINTS = {
    GRAFANA_RULES: "/console/alertmanager/api/prometheus/grafana/api/v1/rules",
    SEARCH_ALERTS: "/console/config/alerts/v1/search",
    GET_ALERT: "/console/config/alerts/v1/get",
    UPDATE_ALERT: "/console/config/alerts/v1/update",
    RETIRE_ALERT: "/console/config/alerts/v1/retire",
    PUBLISH_ALERT: "/console/config/alerts/v1/publish",
    ADD_CUSTOM_ALERTS: "/console/config/alerts/v1/create",
    LIST_METRICS_ALIAS: "/console/config/alerts/v1/metric/alias/search",
    ADD_SILENCE: "/console/config/alerts/v1/silence/create",
    DELETE_SILENCE: "/console/config/alerts/v1/silence/delete"
};

const fetchGrafanaRules = ({ rules = [] }) => {
    return http.get(`${ENDPOINTS.GRAFANA_RULES}`).then((response) => _.get(response, 'data.data.groups'));
};

export const fetchFiringAlerts = async ({ groups = [] }) => {
    const alerts = await fetchGrafanaRules({});
    const rules = _.flatten(_.map(alerts, (group) => _.get(group, 'rules') || []));
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

export const transformAlertDescription = (payload: Record<string, any>) => {
    const { description = "", labels = {} } = payload;
    if (!description) return;
    let alertDescription = description;

    _.keys(labels).forEach((key) => {
        const templateVariable = `{{ \\$\\$labels\\.${key} }}`;
        const regex = new RegExp(templateVariable, 'g');
        alertDescription = alertDescription?.replace(regex, labels[key]);
    });
    return alertDescription;
}

export const searchAlert = ({ config }: any) => {
    return http.post(`${ENDPOINTS.SEARCH_ALERTS}`, config).then((response) => _.get(response, 'data.result'));
};


export const addAlert = (payload: any) => {
    return http.post(`${ENDPOINTS.ADD_CUSTOM_ALERTS}`, payload).then((response) => _.get(response, 'data.result'));
};

export const deleteAlert = ({ id }: any) => {
    return http.delete(`${ENDPOINTS.RETIRE_ALERT}/${id}`).then((response) => _.get(response, 'data.result'));
};

export const editAlert = ({ id, data }: any) => {
    return http.patch(`${ENDPOINTS.UPDATE_ALERT}/${id}`, data).then((response) => _.get(response, 'data.result'));
}


export const getAlertDetail = ({ id }: any) => {
    return http.get(`${ENDPOINTS.GET_ALERT}/${id}`).then((response: any) => _.get(response, 'data.result.alerts'));
};

export const publishAlert = ({ id }: any) => {
    return http.get(`${ENDPOINTS.PUBLISH_ALERT}/${id}`).then((response: any) => _.get(response, "data.result"));
};

export const getMetricAlias = ({ config }: any) => {
    return http.post(`${ENDPOINTS.LIST_METRICS_ALIAS}`, config).then((response) => _.get(response, 'data.result'));
}

export const addSilence = (payload: any) => {
    return http.post(`${ENDPOINTS.ADD_SILENCE}`, payload).then((response) => _.get(response, 'data.result'));
}

export const deleteSilence = (silenceId: string) => {
    return http.delete(`${ENDPOINTS.DELETE_SILENCE}/${silenceId}`).then((response) => _.get(response, 'data.result'));
}