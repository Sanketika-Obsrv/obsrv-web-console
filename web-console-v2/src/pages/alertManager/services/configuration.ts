import _ from 'lodash';

export const functionalAlertConfig = {
    type: "custom",
    searchQuery: { "request": { "filters": { "context.alertType": "CUSTOM" }, "options": { "order": [['updatedAt', 'DESC']] } } },
    allowedActions: ["publish", "view", "edit", "retire", "back", "refresh", "silence"],
    list: {
        title: "Alert Rules",
        showAddAlertBtn: true,
    },
    edit: {
        editableFields: "*"
    },
    alerts_warning_message: "No Custom alert rules configured. Click on Add Alerts to create a Custom alert rule"
}

export const systemAlertConfig = {
    type: "system",
    searchQuery: { "request": { "filters": { "context.alertType": "SYSTEM" }, "options": { "order": [['updatedAt', 'DESC']] } } },
    allowedActions: ["publish", "view", "edit", "back", "refresh", "silence"],
    list: {
        title: "Alert Rules",
        showAddAlertBtn: false,
    },
    edit: {
        warningMessage: "Some fields may not be editable for system provisioned alerts.",
        editableFields: ["severity"]
    },
    alerts_warning_message: "No System alert rules configured"
}

export const getConfiguration = (alert: Record<string, any>) => {
    const alertType = _.toLower(alert?.context?.alertType || "custom");
    switch (alertType) {
        case 'system': return systemAlertConfig
        case 'custom': return functionalAlertConfig
        default: throw new Error('invalid type')
    }
}