import * as _ from 'lodash';
import { http } from 'services/http';
import { flattenSchema, setAdditionalProperties, updateDenormDerived, updateJSONSchema } from './json-schema';
import apiEndpoints from 'data/apiEndpoints';
import { DatasetStatus, DatasetType } from 'types/datasets';
import { aggregationFunctions, allowedSegmentGranurality } from 'pages/rollup/utils/commonUtils';
import { generateRequestBody } from './utils';
import { fetchDataset, generateDatasetState } from './datasetState';
import moment from 'moment';
import { v4 as uuid } from 'uuid';

export const DEFAULT_TIMESTAMP = {
    indexValue: "obsrv_meta.syncts",
    rootPath: "obsrv_meta",
    label: "syncts",
    path: "obsrv_meta.properties.syncts",
}

const defaultTsObject = [
    {
        "column": DEFAULT_TIMESTAMP.rootPath,
        "type": "object",
        "key": `properties.${DEFAULT_TIMESTAMP.rootPath}`,
        "ref": `properties.${DEFAULT_TIMESTAMP.rootPath}`,
        "isModified": true,
        "required": false,
    },
    {
        "column": DEFAULT_TIMESTAMP.label,
        "type": "integer",
        "key": `properties.${DEFAULT_TIMESTAMP.path}`,
        "ref": `properties.${DEFAULT_TIMESTAMP.path}`,
        "isModified": true,
        "required": false,
    }
]

export const versionKeyMap = {
    version_keys: {}
}

const processDenormConfigurations = async (item: any, masterDatasets: any) => {
    const denormFieldsData: any = [];
    const dataset_id = _.get(item, 'dataset_id');
    const denorm_out_field = _.get(item, 'denorm_out_field');
    const dataset = _.find(masterDatasets, ['dataset_id', dataset_id]);
    const schema = flattenSchema(_.get(dataset, 'data_schema'), denorm_out_field, true, false);
    denormFieldsData.push({
        "column": denorm_out_field,
        "type": "object",
        "key": `properties.${denorm_out_field}`,
        "ref": `properties.${denorm_out_field}`,
        "isModified": true,
        "required": false,
        "arrival_format": "object",
        "data_type": "object",
    });
    denormFieldsData.push(...schema);
    return denormFieldsData;
}

export const formatDenormFields = async (denormFields: any, masterDatasets: any) => {
    if (denormFields.length > 0) {
        const final = _.map(denormFields, (item: any) => {
            return processDenormConfigurations(item, masterDatasets);
        });
        return Promise.all(final).then((data) => _.flatten(data));
    }
    else return [];
}

export const getAllFields = async (datasetId: string, status: string = DatasetStatus.Draft) => {
    return http.get(`${apiEndpoints.getAllFields}/${datasetId}?status=${status}`)
}

const getArrivalFormat = (data_type: string | undefined, dataMappings: Record<string, any>) => {
    let result = null;
    if (data_type) {
        _.forEach(dataMappings, (value, key) => {
            if (_.includes(_.get(value, 'arrival_format'), data_type)) {
                result = key;
            }
        });
    }
    return result;
}


export const formatNewFields = (newFields: Record<string, any>, dataMappings: any) => {
    if (newFields.length > 0) {
        const final = _.map(newFields, (item: any) => {
            const columnKey = _.join(_.map(_.split(_.get(item, "column"), '.'), payload => `properties.${payload}`), '.')
            return {
                ...item,
                "column": item.column,
                "type": _.get(item, 'datatype') || "string",
                "key": columnKey,
                "ref": columnKey,
                "isModified": true,
                "required": false,
                "data_type": _.get(item, 'datatype'),
                ...(dataMappings && { "arrival_format": getArrivalFormat(_.get(item, '_transformedFieldSchemaType'), dataMappings) || _.get(item, 'arrival_format') })
            }
        });
        return final;
    }
    else return [];
}

export const createDraftDataset = async ({ data = {}, config }: any) => {
    const request = generateRequestBody({ request: data, apiId: "api.datasets.create" });
    const response = await http.post(apiEndpoints.saveDatset, request, config);
    const versionKey = _.get(response, 'data.result.version_key') || ""
    const datasetId: any = _.get(response, 'data.result.id')
    _.set(versionKeyMap, "version_keys", { [datasetId]: versionKey })
    return response
}

export const updateLiveDataset = ({ data = {}, config }: any) => {
    return http.patch(apiEndpoints.updateLiveDataset, data, config);
}

export const updateDataset = async ({ data = {}, config }: any) => {
    const { versionKey } = await getVersionKey(data?.dataset_id)
    _.set(data, "version_key", versionKey)
    const request = generateRequestBody({ request: _.omit(data, ["published_date"]), apiId: "api.datasets.update", dataset_id: data?.dataset_id });
    const response = await http.patch(`${apiEndpoints.updateDataset}`, request);
    const version_key = _.get(response, 'data.result.version_key') || ""
    _.set(versionKeyMap, "version_keys", { [data.dataset_id]: version_key })
    return response
}

export const searchDatasets = ({ data = { filters: {} } }: any) => {
    const request = generateRequestBody({ request: data, apiId: "api.datasets.list" })
    return http.post(apiEndpoints.listDatasets, request);
}

export const fetchDatasets = (config: Record<string, any>) => {
    return searchDatasets(config)
        .then(response => _.get(response, 'data.result'))
        .catch(err => ([]));
}

export const searchDatasources = ({ data = { filters: {} }, config }: any) => {
    return http.post(apiEndpoints.listDatasources, data, config);
}

export const fetchDatasources = (config: Record<string, any>) => {
    return searchDatasources(config)
        .then(response => _.get(response, 'data.result'))
        .catch(err => ([]));
}

export const addMetadata = (masterData: Record<string, any>[], key: string, payload: Record<string, any>) => {
    const metadata = _.get(masterData, [key]) || {};
    const defaultMetadata = _.get(masterData, ['default']);
    return { ...payload, ...defaultMetadata, ...metadata };
}

export const prepareConfigurationsBySection = (payload: Record<string, any>[], masterData: Record<string, any>[]) => {
    return _.reduce(payload, (accumulator: Record<string, any>, value) => {
        const { key } = value;
        const valueWithMetadata = addMetadata(masterData, key, value);
        const { section = 'advanced', show = true } = valueWithMetadata;
        if (show) (accumulator[section] || (accumulator[section] = [])).push(valueWithMetadata);
        return accumulator;
    }, {})
}

export const datasetRead = ({ datasetId, config = {} }: any) => {
    return http.get(`${apiEndpoints.readDataset}/${datasetId}`, {
        ...config
    })
}

export const editLiveDataset = ({ datasetId }: any) => {
    return http.get(`${apiEndpoints.readDataset}/${datasetId}?mode=edit`)
}

export const datasetReadWithParams = ({ datasetId, config = {}, params = "" }: any) => {
    return http.get(`${apiEndpoints.readDataset}/${datasetId}?mode=edit&fields=${params}`, {
        ...config
    })
}

export const generateIngestionSpec = ({ data = {}, config }: any) => {
    const { schema, state } = data;
    const datasetId = _.get(state, 'pages.datasetConfiguration.state.config.name');
    const datasetMasterId = _.get(state, ['pages', 'datasetConfiguration', 'state', 'masterId']);
    const payload = {
        schema,
        config: {
            "dataset": `${datasetMasterId || datasetId}_day`,
            "indexCol": _.get(state, 'pages.timestamp.indexCol') || DEFAULT_TIMESTAMP.indexValue,
            "granularitySpec": {
                "segmentGranularity": 'DAY',
                "rollup": false
            },
            "tuningConfig": {
                "maxRowPerSegment": 500000,
                "taskCount": 1
            },
            "ioConfig": {
                "topic": _.get(state, 'pages.datasetConfiguration.state.config.dataset_id'),
                "taskDuration": "PT1H",
            },
        }
    };
    return http.post(apiEndpoints.generateIngestionSpec, payload, config);
}

export const generateDimensionExclusions = (list: any) => {
    const dimensionExclusions = _.chain(list)
        .filter(obj => obj.rollupType && obj.rollupType.includes('ignore'))
        .map(obj => ({ ...obj, key: obj.key.replace(/properties\./g, '') }))
        .map('key')
        .value();
    return dimensionExclusions
}

export const generateMetrics = (list: any[]) => {
    const validTypes = aggregationFunctions;
    const filteredData = list.filter(item => item?.aggregateFunctions);
    const newMetrics: any[] = []
    filteredData.forEach(item => {
        // Check if the object has 'aggregateFunctions' key and it's an array of strings
        if (item.aggregateFunctions && Array.isArray(item.aggregateFunctions)) {
            item.aggregateFunctions.forEach((func: any) => {
                if (typeof func === 'string' && validTypes.includes(func.trim())) {
                    newMetrics.push({
                        type: func.trim(),
                        path: item.column,
                        outputField: `${item.column.replace(/\./g, '_')}_${func.trim()}`,
                    });
                }
            });
        } else {
            // If 'aggregateFunctions' is not present or not an array, create a default payload
            newMetrics.push({
                type: item.type,
                path: item.column,
                outputField: `${item.column.replace(/\./g, '_')}_${item.type}`,
            });
        }
    });
    return newMetrics
};

export const generateRollupIngestionSpec = async (list: any, schema: any, datasetId: any, maskedDataSourceName: any, granularity: any, config = {}, filterRollup = {}) => {
    const jsonSchema = _.get(schema, 'jsonSchema');
    const timestampCol = _.get(schema, 'timestamp.indexCol') || DEFAULT_TIMESTAMP.indexValue;
    let updatedColumns = _.get(schema, 'columns.state.schema', []);
    const transformedFields = _.get(schema, 'transformation.selection', []);
    let newField: any = _.get(schema, 'additionalFields.selection') || [];
    updatedColumns = _.map(updatedColumns, (item) => {
        const transformedData = _.find(transformedFields, { column: item.column });
        if (transformedData) {
            return {
                ...item,
                type: _.get(transformedData, '_transformedFieldSchemaType') || "string",
                ...transformedData,
            };
        }
        return item;
    });
    newField = formatNewFields(newField, null);
    let ingestionPayload = { schema: [...flattenSchema(_.get(schema, 'jsonSchema.schema')), ...newField] };
    if (timestampCol === DEFAULT_TIMESTAMP.indexValue)
        ingestionPayload = { schema: [...flattenSchema(_.get(schema, 'jsonSchema.schema')), ...defaultTsObject, ...newField] };

    const updatedIngestionPayload = _.get(updateJSONSchema(jsonSchema, ingestionPayload), 'schema');

    const payload = {
        schema: updatedIngestionPayload,
        config: {
            "dataset": maskedDataSourceName || `${datasetId}_day`,
            "indexCol": _.get(schema, "timestamp.indexCol"),
            "granularitySpec": {
                "rollup": true,
                "segmentGranularity": allowedSegmentGranurality.includes(granularity) ? 'day' : granularity,
                "queryGranularity": granularity,
            },
            "tuningConfig": {
                "maxRowPerSegment": 500000,
                "taskCount": 1
            },
            "ioConfig": {
                "topic": datasetId,
                "taskDuration": "PT1H",
            },
            "rollup": {
                "dimensionExclusions": generateDimensionExclusions(list),
                "metrics": generateMetrics(list)
            }
        }
    };

    const modifiedPayload = !_.isEmpty(filterRollup) ?
        {
            ...payload,
            config: { ...payload.config, transformSpec: filterRollup }
        } : payload

    return http.post(apiEndpoints.generateIngestionSpec, modifiedPayload, config);
}


export const publishDataset = async (state: Record<string, any>, storeState: any, master: any, masterDatasets: any) => {
    const dataset_id = _.get(state, 'pages.datasetConfiguration.state.config.dataset_id')
    const { status } = await getVersionKey(dataset_id)
    if (status === DatasetStatus.Draft) {
        const transitionRequest = generateRequestBody({ request: { dataset_id, status: "ReadyToPublish" }, apiId: "api.datasets.status-transition" })
        await http.post(`${apiEndpoints.statusTransition}`, transitionRequest);
    }
}

export const sendEvents = (datasetId: string | undefined, payload: any) => {
    const request = {
        "id": "api.data.in",
        "ver": "v2",
        "ts": moment().format(),
        "params": {
            "msgid": uuid()
        },
        "data": _.get(payload, ["data", "event"])
    }
    return http.post(`${apiEndpoints.sendEvents}/${datasetId}`, request, {});
}

export const getUploadUrls = async (files: any) => {
    const payload = {
        files: _.map(files, 'path'),
        access: "write"
    };
    const request = generateRequestBody({ request: payload, apiId: "api.files.generate-url" })
    return http.post(`${apiEndpoints.generateURL}`, request);
}

export const uploadToUrl = async (url: string, file: any) => {
    const formData = new FormData();
    formData.append('Content-Type', _.get(file, 'type'));
    formData.append('file', file);
    return http.put(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data', "x-ms-blob-type": "BlockBlob" },
    });
}


export const getDatasetState = async (datasetId: string, status: string = DatasetStatus.Draft, createAction = false) => {
    const dataset = await fetchDataset(datasetId, status);
    return await generateDatasetState(dataset, createAction);
}



export const deleteDataset = async ({ id }: any) => {
    const request = generateRequestBody({ apiId: "api.datasets.status-transition", request: { dataset_id: id, status: "Delete" } })
    const response = await http.post(`${apiEndpoints.statusTransition}`, request);
    return _.get(response, "data.result");
}

export const retireLiveDataset = async ({ id }: any) => {
    const request = generateRequestBody({ apiId: "api.datasets.status-transition", request: { dataset_id: id, status: "Retire" } })
    const response = await http.post(`${apiEndpoints.statusTransition}`, request);
    return _.get(response, "data.result");
}

export const getNonDeletedRows = (data: Record<string, any>[]) => {
    return _.filter(data || [], payload => {
        const isDeleted = _.get(payload, 'isDeleted') || false;
        return !isDeleted;
    })
}

export const exportDataset = async (dataset_id: string, status: string) => {
    const response = await http.get(`${apiEndpoints.datasetExport}/${dataset_id}?status=${status}`)
    return response;
}

export const importDataset = async (dataset: any, config: Record<string, any>, overwrite: boolean) => {
    const { dataset_id, name } = config;
    const apiVersion = _.get(dataset, "api_version")
    const payload = { id: dataset_id, dataset_id, name }
    let updatedDataset: Record<string, any> = {}
    if (apiVersion === "v2") {
        updatedDataset = { ...dataset, ...payload }
    }
    else {
        updatedDataset = dataset;
        let v1Metadata = _.get(dataset, "data.metadata")
        v1Metadata = { ...v1Metadata, ...payload }
        _.set(updatedDataset, "data.metadata", v1Metadata)
    }
    const request = generateRequestBody({ apiId: "api.datasets.import", request: _.omit(updatedDataset, ["properties", "required"]) })
    const response = await http.post(`${apiEndpoints.importDataset}?overwrite=${overwrite}`, request)
    return response;
}

export const updateDatasetStatus = async (id: string, dataset_id: string, status: string) => {
    const payload = {
        id,
        dataset_id,
        status,
    }
    return http.patch(apiEndpoints.updateDataset, payload, {})
}

export const createDraftversion = async ({ selection, navigateToPath, rollupRedirect }: any) => {
    try {
        const datasetResponse = await editLiveDataset({ datasetId: selection });
        sessionStorage.setItem(`${selection}_activePage`, "0");
        if (rollupRedirect) {
            const transitionRequest = generateRequestBody({ request: { dataset_id: datasetResponse?.data?.result?.dataset_id, status: "ReadyToPublish" }, apiId: "api.datasets.status-transition" })
            await http.post(`${apiEndpoints.statusTransition}`, transitionRequest);
            navigateToPath(`/datasets/management/${datasetResponse?.data?.result?.dataset_id}?status=${DatasetStatus.ReadyToPublish}`)
            return;
        }
        navigateToPath(`/datasets/edit/${datasetResponse?.data?.result?.dataset_id}?master=${_.get(datasetResponse, 'data.result.type') === DatasetType.MasterDataset}&status=${DatasetStatus.Draft}&page=0`)
        _.set(versionKeyMap, "version_keys", { [selection]: _.get(datasetResponse, "data.result.version_key") })
        return;
    }
    catch (err) {
        showAlert("Faild to create draft version", "error");
    }
}

export const fetchDatasetDiff = (datasetId: string) => {
    return http.get(`${apiEndpoints.datasetDiff}/${datasetId}`)
        .then(response => response?.data)
}



export const getVersionKey = async (datasetId: string) => {
    const datasetRecord = await datasetReadWithParams({ datasetId, params: "status,version_key" })
    return { versionKey: _.get(datasetRecord, ["data", "result", "version_key"]), status: _.get(datasetRecord, ["data", "result", "status"]) }
}

export const getDraftTagsPayload = (configs: Record<string, any>) => {
    const { tags, tagsData } = configs
    const tagPayload: any[] = []
    const removedTags = _.difference(tags, tagsData)
    const addedTags = _.difference(tagsData, tags)
    if (_.size(removedTags)) {
        removedTags.forEach(tag => {
            tagPayload.push({ value: tag, action: "remove" });
        });
    }
    if (_.size(addedTags)) {
        addedTags.forEach(tag => {
            tagPayload.push({ value: tag, action: "upsert" });
        });
    }
    return tagPayload
}

export const setVersionKey = (config: Record<string, any>) => {
    const { datasets } = config
    const existingVersionKeys = _.keys(versionKeyMap.version_keys)
    let versionKeyList = {}
    _.forEach(datasets, list => {
        const datasetId = _.get(list, "id")
        if (!_.includes(existingVersionKeys, datasetId)) {
            versionKeyList = { ...versionKeyList, [datasetId]: _.get(list, "version_key") }
        }
    })
    const resultantKeys = { ...versionKeyMap.version_keys, ...versionKeyList }
    _.set(versionKeyList, "version_keys", resultantKeys)
}

function showAlert(arg0: string, arg1: string) {
    throw new Error('Function not implemented.');
}
