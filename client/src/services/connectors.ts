import apiEndpoints from "data/apiEndpoints";
import { http } from "./http";
import _ from "lodash";
import { generateRequestBody } from "./utils";
import { versionKeyMap } from "./dataset";

export const verifyConnection = async (connectorInfo: Record<string, any>) => {
    return await http.post(`${apiEndpoints.testConnection}`, connectorInfo.config);
}

const getDatasetId = (state: Record<string, any>) => {
    const datasetId = _.get(state, ['wizard', 'pages', 'datasetConfiguration', 'state', 'masterId']);
    return datasetId;
}

export const saveConnectorDraft = async (payload: any, dataset_id: string) => {
    const { store } = require('store');
    const reduxState = store.getState();
    const wizardState = _.get(reduxState, 'wizard');
    const versionKeyValue = _.get(wizardState, 'pages.datasetConfiguration.state.config.versionKey');
    const requestPayload = {
        connectors_config: [{ value: { ...payload }, action: "upsert" }],
        version_key: _.get(versionKeyMap, ["version_keys", dataset_id]) || versionKeyValue || "",
        dataset_id
    }
    const transformationPayload = generateRequestBody({ request: _.omit(requestPayload, ["published_date"]), apiId: "api.datasets.update" })
    const response = await http.patch(`${apiEndpoints.updateDataset}`, transformationPayload);
    const versionKey = _.get(response, 'data.result.version_key') || ""
    _.set(versionKeyMap, "version_keys", { [dataset_id]: versionKey })
    return response
}

export const deleteConnectorMetadata = async (payload: any) => {
    const { state, type } = payload;
    const datasetId = getDatasetId(state);
    const dataSourceId = `${datasetId}_${type}`
    const config = { connector_id: type, id: dataSourceId }

    await deleteConnector(config, datasetId);
}

export const deleteConnector = async (payload: any, dataset_id: string) => {
    const { store } = require('store');
    const reduxState = store.getState();
    const wizardState = _.get(reduxState, 'wizard');
    const versionKeyValue = _.get(wizardState, 'pages.datasetConfiguration.state.config.versionKey');
    const requestPayload = {
        connectors_config: [{ value: { ...payload }, action: "remove" }],
        version_key: _.get(versionKeyMap, ["version_keys", dataset_id]) || versionKeyValue || "",
        dataset_id
    }
    const transformationPayload = generateRequestBody({ request: _.omit(requestPayload, ["published_date"]), apiId: "api.datasets.update" })
    const response = await http.patch(`${apiEndpoints.updateDataset}`, transformationPayload);
    const versionKey = _.get(response, 'data.result.version_key') || ""
    _.set(versionKeyMap, "version_keys", { [dataset_id]: versionKey })
    return response
}
