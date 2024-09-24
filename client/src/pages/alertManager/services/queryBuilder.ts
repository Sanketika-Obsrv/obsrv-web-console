import React from "react";
import _ from 'lodash';
import { getMetricAlias } from "services/alerts";
import { fetchDatasets } from "services/dataset";
import { DatasetStatus } from "types/datasets";

export const queryOperators = [
    {
        label: "greater than (>)",
        value: "gt",
        symbol: ">"
    },
    {
        label: "less than (<)",
        value: "lt",
        symbol: "<"
    },
    {
        label: "within range (within_range)",
        value: "within_range",
        symbol: "within_range"
    },
    {
        label: "outside range (outside_range)",
        value: "outside_range",
        symbol: "outside_range"
    },
];

const getComponents = async () => {
    const requestConfig = { request: {} };
    const response = await getMetricAlias(({ config: requestConfig }))
    return _.get(response, "metrics");
};

export const getMetricsGroupedByComponents = async () => {
    try {
        const components = await getComponents();
        return _.reduce(components, (accumumator, current) => {
            const component = _.get(current, 'component');
            const existing = _.get(accumumator, component) || [];
            return { ...accumumator, [component]: [...existing, current] }
        }, {})
    } catch (error) {
        return {}
    }
}

export const querySeverity = [
    {
        label: "Critical",
        value: "critical"
    },
    {
        label: "Warning",
        value: "warning"
    }
]

export const validateForm = (config: Record<string, any>) => {
    if (!config) return false;
    return _.every(_.values(config), value => value === true);
}