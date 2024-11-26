import * as _ from "lodash";
import { DatasetType } from "types/datasets";
import moment from "moment";
import { v4 as uuid } from 'uuid';
import { http } from "./http";
import apiEndpoints from "constants/Endpoints";
type Payload = Record<string, any>;

export const generateJsonSchema = (payload: Payload) => {
    const transitionRequest = generateRequestBody({ request: payload?.data, apiId: "api.datasets.dataschema" })
    return http.post(`${apiEndpoints.generateJsonSchema}`, transitionRequest)
        .then(transform);
}

export const generateRequestBody = (configs: Record<string, any>) => {
    const { apiId, request } = configs;
    return {
        "id": apiId,
        "ver": "v2",
        "ts": moment().format(),
        "params": {
            "msgid": uuid()
        },
        "request": request
    }
}

const getDedupeState = (dataset: Record<string, any>, createAction?: boolean) => {
    const dedupeConfig = _.get(dataset, 'dedup_config') || {};
    const { drop_duplicates = false, dedup_key } = dedupeConfig;
    return {
        "error": false,
        "questionSelection": {
            ...(drop_duplicates && !createAction && {
                "dedupe": [
                    "yes"
                ]
            })
        },
        "optionSelection": {
            ...(drop_duplicates && !createAction && {
                "dedupeKey": dedup_key
            })
        },
    }
}

const getTimestampState = (dataset: Record<string, any>) => {
    const { dataset_config } = dataset;
    const timestamp_key = _.get(dataset_config, "keys_config.timestamp_key") || _.get(dataset_config, "timestamp_key");
    return {
        "error": false,
        "indexCol": timestamp_key,
    }
}

const getDataValidationState = (dataset: Record<string, any>) => {
    const { validation_config } = dataset;
    const { mode } = validation_config;
    return {
        "error": false,
        "formFieldSelection": mode || "Strict",
        "value": {},
    }
}

const getDataFormatState = (dataset: Record<string, any>) => {
    const extractionConfig = _.get(dataset, 'extraction_config');
    const { is_batch_event = false, extraction_key } = extractionConfig;
    const batch_id = extractionConfig.dedup_config.dedup_key || extractionConfig.batch_id
    return {
        "error": false,
        "formFieldSelection": [
            "no",
            ...(is_batch_event ? ["yes"] : [])
        ],
        "value": {
            ...(is_batch_event && {
                "type": "yes",
                "extractionKey": extraction_key,
                "batchId": batch_id
            })
        },
    }
}

const omitFields = (obj: any) => {
    const fieldsToOmit = ['source_kafka_auto_offset_reset', 'source_kafka_consumer_id', 'source_data_format'];
    return Object.keys(obj)
        .filter(key => !fieldsToOmit.includes(key))
        .reduce((newObj: any, key) => {
            newObj[key] = obj[key];
            return newObj;
        }, {});
}

const getDatasetConnectorsConfig = (datasetSourceConfigs: Record<string, any>[]) => {
    const connectorTypes = _.uniq(_.map(datasetSourceConfigs, 'connector_type')) || [];
    const connectorIds = _.uniq(_.map(datasetSourceConfigs, 'connector_id'))
    const connector_types = _.compact(_.concat(connectorTypes, connectorIds));
    return {
        error: false,
        formFieldSelection: ["api", ...connector_types],
        value: _.reduce(datasetSourceConfigs, (output: Record<string, any>, datasetSourceConfig) => {
            if (datasetSourceConfig.connector_type) {
                const { id, connector_type, connector_config } = datasetSourceConfig;
                const connectorConfigs = omitFields(connector_config)
                output[connector_type] = { id, connector_type, ...connectorConfigs }
                return output;
            }
            else {
                const { id, connector_id, connector_config } = datasetSourceConfig;
                const connectorConfigs = omitFields(connector_config)
                output[connector_id] = { id, connector_type: connector_id, ...connectorConfigs }
                return output;
            }
        }, {}),
    }
}

const getTransformationState = (dataset: any) => {
    const { data_schema, transformations_config } = dataset || {};
    const schema = _.get(data_schema, 'properties');
    const output = {
        pii: {
            selection: [] as Array<any>
        },
        transform: {
            selection: [] as Array<any>
        },
        derived: {
            selection: [] as Array<any>
        }
    }

    const getColumnMetadata = (fieldName: string) => {
        return _.find(schema, ['column', fieldName]);
    }

    _.forEach(transformations_config, transformation => {
        const { id, field_key, transformation_function = {} } = transformation;
        const { type, expr, datatype, category } = transformation_function;
        const transformation_mode = _.get(transformation, 'mode');

        const metadata = {
            isModified: true,
            column: field_key,
            transformation_mode,
            datatype,
            _transformationType: type,
            ...(type === 'jsonata' && {
                transformation: expr,
                _transformationType: 'custom',
                required: false,
            })
        }

        if (category) {
            _.set(output, [category, 'selection'], [..._.get(output, [category, 'selection']), metadata])
        }
        else {
            const isPartOfSchema = getColumnMetadata(field_key);
            if (isPartOfSchema) {
                _.set(output, ['transform', 'selection'], [..._.get(output, ['transform', 'selection']), metadata]);
            } else {
                _.set(output, ['derived', 'selection'], [..._.get(output, ['derived', 'selection']), metadata]);
            }
        }
    })
    return output || [];
}

const getJsonSchemaState = async (dataset: Record<string, any>) => {
    const data = [_.get(dataset, ["data_schema"])];
    const { name } = dataset;
    const payload = {
        data: {
            config: { dataset: name },
            data
        },
        config: {}
    }
    return generateJsonSchema(payload);
}

const getDataKeyState = (dataset: Record<string, any>) => {
    const { dataset_config } = dataset;
    const dataKey = dataset_config?.keys_config?.data_key || _.get(dataset_config, "data_key")
    return {
        error: !dataKey,
        dataKey
    }
}

const getDenormState = (dataset: Record<string, any>) => {
    const { denorm_config } = dataset;
    const { denorm_fields = [], ...rest } = denorm_config;
    return {
        ...rest,
        values: denorm_fields
    }
}

const getDatasetConfiguration = (dataset: Record<string, any>): Record<string, any> => {
    const { id, name, dataset_id, type, version_key } = dataset;
    return {
        state: {
            config: {
                name, dataset_id,
                versionKey: version_key
            },
            datasetType: type,
            masterId: id
        }
    }
}

const getSampleData = (dataset: Record<string, any>) => {
    const { sample_data } = dataset;
    return sample_data
}

export const generateDatasetState = async (state: Record<string, any>, createAction?: boolean) => {
    const dataset = state;
    const { type } = dataset;
    const jsonSchema = await getJsonSchemaState(dataset);
    const datasetConfiguration = getDatasetConfiguration(dataset);
    const transformationsState = getTransformationState(dataset);
    const timestamp = getTimestampState(dataset);
    const dedupe = getDedupeState(dataset, createAction);
    const dataSource = getDatasetConnectorsConfig(dataset?.connectors_config);
    const dataFormat = getDataFormatState(dataset);
    const dataValidation = getDataValidationState(dataset);
    const dataKey = getDataKeyState(dataset);
    const denorm = getDenormState(dataset);
    const sample_data = getSampleData(dataset);
    const isMasterDataset = type === DatasetType.MasterDataset;
    const status = dataset?.status
    return {
        pages: {
            datasetConfiguration,
            jsonSchema,
            dataSource,
            ...transformationsState,
            dataFormat,
            sample_data,
            status,
            ...(!isMasterDataset && {
                denorm,
                dedupe,
                timestamp,
                dataValidation,
            }),
            ...(isMasterDataset && {
                dataKey
            })
        }
    }
}

const transform = (response: any) => _.get(response, 'data.result')

const fieldsByStatus: { [key: string]: string } = {
    Draft: 'name,type,id,dataset_id,version,validation_config,extraction_config,dedup_config,data_schema,denorm_config,router_config,dataset_config,tags,status,created_by,updated_by,created_date,updated_date,version_key,api_version,entry_topic,transformations_config,connectors_config,sample_data',
    default: 'name,type,id,dataset_id,version,validation_config,extraction_config,dedup_config,data_schema,denorm_config,router_config,dataset_config,tags,status,created_by,updated_by,created_date,updated_date,api_version,entry_topic,sample_data'
};

export const fetchDataset = (datasetId: string, status: string) => {
    const fields = fieldsByStatus[status] || fieldsByStatus.default;
    const params = status === 'Draft' ? `mode=edit&fields=${fields}` : `fields=${fields}`;
    const url = `${apiEndpoints.readDataset}/${datasetId}?${params}`;
    return http.get(url).then(transform);
};