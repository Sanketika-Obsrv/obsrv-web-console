import _ from "lodash";
import { http } from "./http";

const fetchGrafanaRules = ({ rules = [] }) => {
    return http.get("/alertmanager/api/prometheus/grafana/api/v1/rules").then((response) => _.get(response, 'data.data.groups'));
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
    return http.post("/config/alerts/v1/search", config).then((response) => _.get(response, 'data.result'));
};


export const addAlert = (payload: any) => {
    return http.post(`/config/alerts/v1/create`, payload).then((response) => _.get(response, 'data.result'));
};

export const deleteAlert = ({ id }: any) => {
    return http.delete(`/config/alerts/v1/delete/${id}`).then((response) => _.get(response, 'data.result'));
};

export const editAlert = ({ id, data }: any) => {
    return http.patch(`/config/alerts/v1/update/${id}`, data).then((response) => _.get(response, 'data.result'));
}


export const getAlertDetail = ({ id }: any) => {
    return http.get(`/config/alerts/v1/get/${id}`).then((response: any) => _.get(response, 'data.result.alerts'));
};

export const publishAlert = ({ id }: any) => {
    return http.get(`/config/alerts/v1/publish/${id}`).then((response: any) => _.get(response, "data.result"));
};

export const getMetricAlias = ({ config }: any) => {
    return http.post(`/config/alerts/v1/metric/alias/search`, config).then((response) => _.get(response, 'data.result'));
}

export const addSilence = (payload: any) => {
    return http.post(`/config/alerts/v1/silence/create`, payload).then((response) => _.get(response, 'data.result'));
}

export const deleteSilence = (silenceId: string) => {
    return http.delete(`/config/alerts/v1/silence/delete/${silenceId}`).then((response) => _.get(response, 'data.result'));
}