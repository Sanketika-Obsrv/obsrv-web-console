import _ from "lodash";
import { http } from "./http";
import endpoints from 'data/apiEndpoints';

//For local
// const ENDPOINTS = {
//     GRAFANA_RULES: "/alertmanager/api/prometheus/grafana/api/v1/rules"
// };

// For dev
const ENDPOINTS = {
    GRAFANA_RULES: "/console/alertmanager/api/prometheus/grafana/api/v1/rules"
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
    return http.post(`${endpoints.searchAlerts}`, config).then((response) => _.get(response, 'data.result'));
};