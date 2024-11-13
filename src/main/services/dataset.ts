import axios from 'axios';
import _ from 'lodash';
import appConfig from '../../shared/resources/appConfig'
import { fieldsByStatus } from '../controllers/dataset_diff';
type Payload = Record<string, any>;

const datasetServiceHttpInstance = axios.create({ baseURL: appConfig.OBS_API.URL});

const transform = (response: any) => _.get(response, 'data.result')

export const generateJsonSchema = (payload: Payload) => {
    const { data, config } = payload;
    return datasetServiceHttpInstance.post("/dataset/v1/dataschema", data, config)
    .then(transform);
}

export const fetchDataset = (payload: Payload) => {
    const { datasetId } = payload;
    return datasetServiceHttpInstance.get(`/v2/datasets/read/${datasetId}?fields=${fieldsByStatus.default}`)
        .then(transform)
}

export const fetchDraftDataset = (payload: Payload) => {
    const { datasetId } = payload;
    return datasetServiceHttpInstance.get(`/v2/datasets/read/${datasetId}?mode=edit&fields=${fieldsByStatus.Draft}`)
        .then(transform)
}

export const fetchDatasetRecord = (datasetId: string, status: string) => {
    const draftFields = ["data_schema", "denorm_config", "transformations_config"];
    const liveFields = ["data_schema", "denorm_config"]
    const draftUrl = `/v2/datasets/read/${datasetId}?mode=edit&fields=${draftFields}`;
    const liveUrl = `/v2/datasets/read/${datasetId}?fields=${liveFields}`;
    const url = status === "Draft" || status === "ReadyToPublish" ? draftUrl : liveUrl;
    return datasetServiceHttpInstance.get(url).then(transform);
};

export const fetchDatasetSourceConfig = (payload: Payload) => {
    const { data, config } = payload;
    return datasetServiceHttpInstance.post("/datasets/v1/source/config/list", data, config)
    .then(transform)
}

export const fetchDataSources = (payload: Payload) => {
    const { data, config } = payload;
    return datasetServiceHttpInstance.post("/datasources/v1/list", data, config)
    .then(transform)
}