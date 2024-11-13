import { NextFunction, Request, Response } from 'express';
import _ from 'lodash';
import { fetchDataset, generateJsonSchema, fetchDatasetSourceConfig } from '../services/dataset';
import { DatasetStatus, DatasetType } from '../types';

const getDedupeState = (existing_client_state: Record<string, any>) => (dataset: Record<string, any>) => {
    const dedupeConfig = _.get(dataset, 'dedup_config') || {};
    const { drop_duplicates = false, dedup_key } = dedupeConfig;
    const { pages } = existing_client_state || {};
    const existingState = _.get(pages, 'dedupe') || {};
    return {
        "error": false,
        ...existingState,
        "questionSelection": {
            ...(drop_duplicates && {
                "dedupe": [
                    "yes"
                ]
            })
        },
        "optionSelection": {
            ...(drop_duplicates && {
                "dedupeKey": dedup_key
            })
        },
    }
}

const getTimestampState = (existing_client_state: Record<string, any>) => (dataset: Record<string, any>) => {
    const { dataset_config } = dataset;
    const { timestamp_key } = dataset_config;
    return {
        "error": false,
        "indexCol": timestamp_key,
    }
}

const getDataValidationState = (existing_client_state: Record<string, any>) => (dataset: Record<string, any>) => {
    const { validation_config } = dataset;
    const { mode } = validation_config;
    return {
        "error": false,
        "formFieldSelection": mode,
        "value": {},
    }
}

const getDataFormatState = (existing_client_state: Record<string, any>) => (dataset: Record<string, any>) => {
    const extractionConfig = _.get(dataset, 'extraction_config');
    const { is_batch_event = false, extraction_key, batch_id } = extractionConfig;
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

const getDatasetConnectorsConfig = (existing_client_state: Record<string, any>) => (datasetSourceConfigs: Record<string, any>[]) => {
    const connectorTypes = _.uniq(_.map(datasetSourceConfigs, 'connector_type')) || [];
    return {
        error: false,
        formFieldSelection: ["api", ...connectorTypes],
        value: _.reduce(datasetSourceConfigs, (output: Record<string, any>, datasetSourceConfig) => {
            const { id, connector_type, connector_config } = datasetSourceConfig;
            output[connector_type] = { id, connector_type, ...connector_config }
            return output;
        }, {}),
    }
}

const getTransformationState = (existing_client_state: Record<string, any>) => (transformations: Record<string, any>[]) => {
    const { pages, metadata = {} } = existing_client_state || {};
    const schema = _.get(pages, 'columns.state.schema');
    const output = {
        pii: {
            selection: []
        },
        transformation: {
            selection: []
        },
        additionalFields: {
            selection: []
        }
    }

    const getColumnMetadata = (fieldName: string) => {
        return _.find(schema, ['column', fieldName]);
    }

    _.forEach(transformations, transformation => {
        const { id, field_key, transformation_function = {} } = transformation;
        const { type, expr, condition = null } = transformation_function;
        const { section, ...rest } = _.get(transformation, 'metadata') || {};
        const transformation_mode = _.get(transformation, 'mode');

        const metadata = {
            ...rest,
            id,
            isModified: true,
            column: field_key,
            transformation_mode,
            _transformationType: type,
            ...(type === 'jsonata' && {
                transformation: expr,
                _transformationType: 'custom',
                required: false,
            })
        }

        if (section) {
            _.set(output, [section, 'selection'], [..._.get(output, [section, 'selection']), metadata])
        } else {
            const isPartOfSchema = getColumnMetadata(field_key);
            if (isPartOfSchema) {
                _.set(output, ['transformation', 'selection'], [..._.get(output, ['transformation', 'selection']), metadata]);
            } else {
                _.set(output, ['additionalFields', 'selection'], [..._.get(output, ['additionalFields', 'selection']), metadata]);
            }
        }
    })
    return output;
}

const getJsonSchemaState = (existing_client_state: Record<string, any>) => async (dataset: Record<string, any>) => {
    const { pages, metadata = {} } = existing_client_state || {};
    const data = _.get(pages, 'datasetConfiguration.state.data') || [_.get(dataset, ["data_schema"])];
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

const getDataKeyState = (existing_client_state: Record<string, any>) => (dataset: Record<string, any>) => {
    const { dataset_config } = dataset;
    const { data_key } = dataset_config;
    return {
        error: false,
        dataKey: data_key
    }
}

const getDenormState = (existing_client_state: Record<string, any>) => (dataset: Record<string, any>) => {
    const { denorm_config } = dataset;
    const { denorm_fields = [], ...rest } = denorm_config;
    return {
        ...rest,
        values: denorm_fields
    }
}

const getDatasetConfiguration = (dataset: Record<string, any>): Record<string, any> => {
    const { id, name, dataset_id, type, dataset_config, version_key } = dataset;
    return {
        configurations: dataset_config?.configurations,
        dataMappings: dataset_config?.dataMappings,
        mergedEvent: dataset_config?.mergedEvent,
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

const generateDatasetState = async (state: Record<string, any>) => {
    const { dataset, transformations, datasetSourceConfigs } = state;
    const { client_state, type: datasetType } = dataset;
    const { metadata = {}, pages = {} } = client_state || {}
    const jsonSchema = await getJsonSchemaState(client_state)(dataset);
    const datasetConfiguration = getDatasetConfiguration(dataset);
    const transformationsState = getTransformationState(client_state)(transformations);
    const timestamp = getTimestampState(client_state)(dataset);
    const dedupe = getDedupeState(client_state)(dataset);
    const dataSource = getDatasetConnectorsConfig(client_state)(datasetSourceConfigs);
    const dataFormat = getDataFormatState(client_state)(dataset);
    const dataValidation = getDataValidationState(client_state)(dataset);
    const dataKey = getDataKeyState(client_state)(dataset);
    const denorm = getDenormState(client_state)(dataset);
    const isMasterDataset = datasetType === DatasetType.MasterDataset;
    return {
        metadata: {
            ...metadata
        },
        pages: {
            datasetConfiguration,
            ...pages,
            jsonSchema,
            dataSource,
            ...transformationsState,
            dataFormat,
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

export default {
    name: 'dataset:state',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        let { datasetId } = request.params;
        let { status } = request.query;
        datasetId = status === "Live" ? _.split(datasetId, '.', 1)[0] : datasetId
        try {
            const dataset = await fetchDataset({ datasetId, status });
            const payload = {
                data: {
                    "filters": {
                        "dataset_id": _.get(dataset, 'id'),
                        "status": [...(status != DatasetStatus.Live ? [DatasetStatus.Draft, DatasetStatus.Publish] : [DatasetStatus.Live])]
                    }
                },
                config: {}
            }
            const transformations = _.get(dataset, "transformations_config");
            const datasetSourceConfigs = await fetchDatasetSourceConfig(payload);
            const context = { dataset, transformations, datasetSourceConfigs };
            const state = await generateDatasetState(context);
            response.status(200).json(state)
        } catch (error) {
            next(error);
        }
    }
};