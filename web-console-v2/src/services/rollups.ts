import { aggregationFunctions, allowedSegmentGranurality } from "./commonUtils";
import { formatNewFields } from "./dataset";
import { http } from "./http";
import { flattenSchemaV1, updateJSONSchema } from "./json-schema";
import _ from "lodash";

// const ENDPOINTS = {
//     INGESTION_SPEC: "/console/configV1/dataset/v1/ingestionspec",
//     SAVE_DATASOURCE: "/console/configV1/datasources/v1/update",
//     DELETE_DATASOURCE: "/console/configV1/datasources/v1/delete",
//     LIST_DATASOURCE: "/console/configV1/datasources/v1/list",
// };

//USE THESE ROUTES FOR LOCAL TESTING

const ENDPOINTS = {
    INGESTION_SPEC: "/configV1/dataset/v1/ingestionspec",
    SAVE_DATASOURCE: "/configV1/datasources/v1/update",
    DELETE_DATASOURCE: "/configV1/datasources/v1/delete",
    LIST_DATASOURCE: "/configV1/datasources/v1/list",
};


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

const DEFAULT_TS_SCHEMA = {
    "obsrv_meta": {
        arrival_format: "object", data_type: "object", isRequired: false, key: DEFAULT_TIMESTAMP.rootPath, resolved: true, type: "object",
        properties: {
            "syncts": {
                "arrival_format": "text",
                "data_type": "date-time",
                "isRequired": false,
                "key": DEFAULT_TIMESTAMP.label,
                "resolved": false,
                "type": "string"
            }
        }
    }
}

export const generateRollupIngestionSpec = async (list: any, schema: any, datasetId: any, maskedDataSourceName: any, granularity: any, config = {}, filterRollup = {}) => {
    const jsonSchema = _.get(schema, 'data_schema');
    const trasformations = _.get(schema, 'transformations_config');
    const tsValues = _.get(schema, ["dataset_config", "keys_config", "timestamp_key"])
    const timestampCol = tsValues || DEFAULT_TIMESTAMP.indexValue;
    let updatedColumns = flattenSchemaV1(jsonSchema)
    const transformedFields = _.filter(trasformations, field => _.get(field, "metadata.section") === "transform") || []
    let newField: any = _.filter(trasformations, field => _.get(field, "metadata.section") === "derived") || []
    updatedColumns = _.map(updatedColumns, (item) => {
        const transformedData = _.find(transformedFields, { column: item.column });
        if (transformedData) {
            return {
                ...item,
                type: _.get(transformedData, 'metadata._transformedFieldSchemaType') || "string",
                ...transformedData,
            };
        }
        return item;
    });
    newField = formatNewFields(newField, null);
    let ingestionPayload = { schema: [...flattenSchemaV1(jsonSchema), ...newField] };
    if (timestampCol === DEFAULT_TIMESTAMP.indexValue)
        ingestionPayload = { schema: [...flattenSchemaV1(jsonSchema), ...defaultTsObject, ...newField] };

    if (timestampCol === DEFAULT_TIMESTAMP.indexValue) {
        jsonSchema.properties = {
            ..._.get(jsonSchema, "properties"), ...DEFAULT_TS_SCHEMA
        }
    }
    const updatedIngestionPayload = _.get(updateJSONSchema({ schema: _.get(jsonSchema, "properties") }, ingestionPayload), 'schema');

    const payload = {
        schema: { type: "object", properties: updatedIngestionPayload },
        config: {
            "dataset": maskedDataSourceName || `${datasetId}_day`,
            "indexCol": timestampCol,
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

    return http.post(ENDPOINTS.INGESTION_SPEC, modifiedPayload, config);
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


export const saveRollupDatasource = (config: any, maskedDataSourceName: any, ingestionSpec: any, state: any, granularity: string, rollupValue: any) => {
    const datasetId = _.get(state, 'dataset_id');
    const datasource = maskedDataSourceName || `${datasetId}_day`
    const payload = {
        "ingestion_spec": ingestionSpec,
        "datasource": datasource,
        "datasource_ref": datasource,
        "dataset_id": datasetId,
        "metadata": {
            "aggregated": true,
            "granularity": granularity,
            "name": datasource,
            "value": rollupValue,
        }
    };
    return http.patch(ENDPOINTS.SAVE_DATASOURCE, payload, config);
}

export const fetchDatasources = (config: Record<string, any>) => {
    return searchDatasources(config)
        .then(response => _.get(response, 'data.result'))
        .catch(err => ([]));
}


export const deleteDraftRollupDatasources = (datasetId: any, status: any) => {
    return http.delete(`${ENDPOINTS.DELETE_DATASOURCE}/${datasetId}?status="${status}"`);
}

export const searchDatasources = ({ data = { filters: {} }, config }: any) => {
    return http.post(ENDPOINTS.LIST_DATASOURCE, data, config);
}