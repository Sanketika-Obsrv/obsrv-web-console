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

const getConfigs = (configs: any, dataset_id: string) => {
    const { connector_config, connector_id, version } = configs
    if (version == "v2") {
        switch (connector_id) {
            case "kafka-connector-1.0.0":
                const { kafkaBrokers, topic } = connector_config
                return {
                    "source_kafka_broker_servers": kafkaBrokers,
                    "source_kafka_topic": topic,
                    "source_kafka_auto_offset_reset": "EARLIEST",
                    "source_kafka_consumer_id": `${dataset_id}_kafka-connector-consumer`,
                    "source_data_format": "json"
                }
            default:
                return connector_config
        }
    }
    else {
        return connector_config
    }
}

export const saveConnectorDraft = async (payload: any, dataset_id: string) => {
    const { store } = require('store');
    const connectorsConfig = getConfigs(payload, dataset_id)
    const connectorsPayload = { ...payload, connector_config: connectorsConfig }
    const reduxState = store.getState();
    const wizardState = _.get(reduxState, 'wizard');
    const versionKeyValue = _.get(wizardState, 'pages.datasetConfiguration.state.config.versionKey');
    const requestPayload = {
        connectors_config: [{ value: { ...connectorsPayload }, action: "upsert" }],
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
