import { NextFunction, Request, Response } from "express";
import { fetchDataset, fetchDraftDataset } from "../services/dataset";
import _ from "lodash";
import { getDiff } from "json-difference";

export default {
    name: 'dataset:diff',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        const { datasetId } = request.params;
        try {
            let liveDataset = await fetchDataset({ datasetId });
            if (_.get(liveDataset, "api_version") !== "v2") {
                const liveDatasetsConfigs = await migrateV1Live(liveDataset)
                liveDataset = { ...liveDataset, ...liveDatasetsConfigs }
            }
            const draftDataset = await fetchDraftDataset({ datasetId })
            let additions: any[] = [];
            let deletions: any[] = [];
            let modifications = [];

            //Timestamp key
            const { timestamp_key: draftTS, data_key: draftDataKey } = draftDataset.dataset_config.keys_config;
            const { timestamp_key: liveTS, data_key: liveDataKey } = liveDataset.dataset_config.keys_config;

            if (draftDataset.type !== "master" && draftTS !== liveTS) {
                modifications.push({
                    type: "timestamp",
                    value: {
                        from: liveTS,
                        to: draftTS
                    }
                })
            }

            //Data key
            if (draftDataset.type === "master" && draftDataKey !== liveDataKey) {
                modifications.push({
                    type: "dataKey",
                    value: {
                        from: liveDataKey,
                        to: draftDataKey
                    }
                })
            }

            //Extraction config
            const dataFormatDiff = getDiff(_.get(liveDataset, ['extraction_config']), _.get(draftDataset, ['extraction_config']), { isLodashLike: true })
            const dataFormatEdited = _.get(dataFormatDiff, ['edited']);
            if (!_.isEmpty(_.get(dataFormatDiff, ['edited']))) {
                const dataFormatEditedItems = _.map(dataFormatEdited, (item: any) => {
                    return {
                        "field": item[0],
                        "value": {
                            from: item[1],
                            to: item[2]
                        }
                    }
                })
                modifications.push({
                    type: "dataFormat",
                    items: dataFormatEditedItems
                })
            }

            //Validation config
            const validationDiff = getEdited(liveDataset, draftDataset, 'validation_config', 'validation')
            validationDiff && modifications.push(validationDiff)

            // Dedup config
            const dedupDiff = getEdited(liveDataset, draftDataset, 'dedup_config', 'dedup')
            dedupDiff && draftDataset.type !== "master" && modifications.push(dedupDiff)

            // Denorm config
            const denormChanges = getDenormChanges(liveDataset, draftDataset)
            additions = [...additions, ...denormChanges.additions]
            deletions = [...deletions, ...denormChanges.removed]

            // Transformations config
            const draftTrasformations = _.get(draftDataset, "transformations_config")
            const liveTrasformations = _.get(liveDataset, "transformations_config")
            const transformationChanges = getTransformationChanges(liveTrasformations, draftTrasformations)
            additions = [...additions, ...transformationChanges.additions]
            deletions = [...deletions, ...transformationChanges.deletions]
            modifications = [...modifications, ...transformationChanges.modifications]

            // Data schema
            const draftDatasetSchema = _.get(draftDataset, ['data_schema']);
            const liveDatasetSchema = _.get(liveDataset, ['data_schema'])
            const dataSchemaChanges = getSchemaChanges(liveDatasetSchema, draftDatasetSchema)
            additions = [...additions, ...dataSchemaChanges.additions]
            deletions = [...deletions, ...dataSchemaChanges.deletions]
            modifications = [...modifications, ...dataSchemaChanges.modifications]

            // Connectors config
            const draftDataSources = _.get(draftDataset, "connectors_config")
            const liveDataSources = _.get(liveDataset, "connectors_config")
            const dataSourcesChanges = getDataSourceChanges(liveDataSources, draftDataSources)
            additions = [...additions, ...dataSourcesChanges.additions]
            deletions = [...deletions, ...dataSourcesChanges.deletions]
            modifications = [...modifications, ...dataSourcesChanges.modifications]

            response.status(200).json({
                modifications,
                additions,
                deletions
            })
        } catch (error) {
            next(error);
        }
    }
};

const getEdited = (liveDataset: any, draftDataset: any, key: string, type: string) => {
    const diff = getDiff(_.get(liveDataset, key), _.get(draftDataset, key), { isLodashLike: true })
    const diffEdited = _.get(diff, ['edited']);
    if (!_.isEmpty(diffEdited)) {
        const validationEditedEditedItems = _.map(diffEdited, (item: any) => {
            return {
                "field": item[0],
                "value": {
                    from: item[1],
                    to: item[2]
                }
            }
        })
        return {
            type: type,
            items: validationEditedEditedItems
        }
    }

}

const getDenormChanges = (liveDataset: any, draftDataset: any) => {
    const draftDenormFields = _.get(draftDataset, 'denorm_config.denorm_fields') || [];
    const liveDenormFields = _.get(liveDataset, 'denorm_config.denorm_fields') || [];
    const draftDenorms = _.map(draftDenormFields, fields => {
        const { denorm_key, denorm_out_field } = fields
        return { denorm_key, denorm_out_field }
    })
    const liveDenorms = _.map(liveDenormFields, fields => {
        const { denorm_key, denorm_out_field } = fields
        return { denorm_key, denorm_out_field }
    })
    // addded
    const additions = []
    if (_.size(draftDenorms) >= _.size(liveDenorms)) {
        const addedItems = _.differenceWith(draftDenorms, liveDenorms, _.isEqual)
        if (_.size(addedItems) > 0) {
            additions.push({
                type: 'denorm',
                items: _.map(addedItems, (item) => {
                    return ({
                        name: _.get(item, 'denorm_out_field'),
                        value: _.pick(item, ['denorm_key', 'dataset_id'])
                    })
                })
            })
        }
    }

    const removed = []
    if (_.size(draftDenorms) <= _.size(liveDenorms)) {
        const removedItems = _.differenceWith(liveDenorms, draftDenorms, _.isEqual)
        if (_.size(removedItems) > 0) {
            removed.push({
                type: 'denorm',
                items: _.map(removedItems, (item) => {
                    return ({
                        name: _.get(item, 'denorm_out_field')
                    })
                })
            })
        }
    }

    return { additions, removed }

}

const getTransformationChanges = (liveTranformations: any, draftTransformations: any) => {
    const additions: any[] = [];
    const deletions: any[] = [];
    const modifications: any[] = [];
    const draftTransformationKeys = _.map(draftTransformations, (item) => item?.field_key)
    const liveTransformationKeys = _.map(liveTranformations, (item) => item?.field_key)
    const commonKeys = _.intersection(draftTransformationKeys, liveTransformationKeys);
    const addedKeys = _.difference(draftTransformationKeys, commonKeys)
    const removedKeys = _.difference(liveTransformationKeys, commonKeys)


    if (_.size(addedKeys) > 0) {
        const additionsDiff = _.filter(draftTransformations, (item) => _.includes(addedKeys, item?.field_key));
        const additionItems = _.map(additionsDiff, (addition) => {
            return { name: _.get(addition, 'field_key'), value: _.pick(addition, ['transformation_function', 'mode', 'transformation_function.category']) }
        })
        _.size(additionsDiff) > 0 && additions.push({ type: 'transformations', items: additionItems })
    }
    if (_.size(removedKeys) > 0) {
        const removedDiff = _.filter(liveTranformations, (item) => _.includes(removedKeys, item?.field_key));
        const removedItems = _.map(removedDiff, (removed) => {
            return { name: _.get(removed, 'field_key'), value: _.pick(removed, ['transformation_function.category']) }
        })
        _.size(removedItems) > 0 && deletions.push({ type: 'transformations', items: removedItems })
    }

    const commonTranformations = _.intersectionBy(draftTransformations, liveTranformations, 'field_key')
    if (_.size(commonTranformations) > 0) {
        const commonTranformationsFieldKeys = _.map(commonTranformations, (field: any) => ({ field_key: _.get(field, "field_key"), section: _.get(field, ["transformation_function", "category"]) }))
        const commonDraftTransformations = _.filter(draftTransformations, t => _.includes(_.map(commonTranformationsFieldKeys, "field_key"), t?.field_key))
        const commonLiveTransformations = _.filter(liveTranformations, t => _.includes(_.map(commonTranformationsFieldKeys, "field_key"), t?.field_key))
        _.forEach(commonTranformationsFieldKeys, (key) => {
            const diffs = getDiff(_.find(commonLiveTransformations, { 'field_key': _.get(key, 'field_key') }), _.find(commonDraftTransformations, { 'field_key': _.get(key, "field_key") }), { isLodashLike: true })
            _.forEach(_.get(diffs, 'edited'), (change: any) => {
                if (change[0] === 'mode') {
                    modifications.push({
                        name: _.get(key, 'field_key'),
                        field: 'mode',
                        value: {
                            from: change[1],
                            to: change[2],
                            metadata: {
                                section: _.get(key, 'section')
                            }
                        }
                    })
                }
                if (_.startsWith(change[0], 'transformation_function')) {
                    modifications.push({
                        name: _.get(key, 'field_key'),
                        field: change[0],
                        value: {
                            from: change[1],
                            to: change[2],
                            metadata: {
                                section: _.get(key, 'section')
                            }
                        }
                    })
                }
            })
        })

    }
    const modificationList = _.size(modifications) > 0 ? [{ type: 'transformations', items: modifications }] : []
    return { additions, deletions, modifications: modificationList }

}

const getSchemaChanges = (liveDatasetSchema: any, draftDatasetSchema: any) => {
    const additions: any[] = [];
    const deletions: any[] = [];
    const modifications: any[] = [];
    const draftDatasetSchemaFlatten = flattenSchema(new Map(Object.entries(draftDatasetSchema)))
    const liveDatasetSchemaFlatten = flattenSchema(new Map(Object.entries(liveDatasetSchema)))
    const draftDatasetSchemaFlattenProps = _.map(draftDatasetSchemaFlatten, (item) => item?.property)
    const liveDatasetSchemaFlattenProps = _.map(liveDatasetSchemaFlatten, (item) => item?.property)
    // additions
    const commonProps = _.intersection(draftDatasetSchemaFlattenProps, liveDatasetSchemaFlattenProps)
    const addedProps = _.difference(draftDatasetSchemaFlattenProps, commonProps)
    const removedProps = _.difference(liveDatasetSchemaFlattenProps, commonProps)

    if (_.size(addedProps) > 0) {
        const addtionItems: any[] = [];
        _.forEach(addedProps, (prop) => {
            const item = _.find(draftDatasetSchemaFlatten, (item) => item?.property == prop)
            addtionItems.push(
                {
                    name: prop,
                    value: _.pick(item, ['arrivalFormat', 'dataType', 'absolutePath', 'isRequired'])
                }
            )
        })
        additions.push({ type: 'dataSchema', items: addtionItems })
    }
    if (_.size(removedProps) > 0) {
        const removedItems: any[] = [];
        _.forEach(removedProps, (prop) => {
            const item = _.find(liveDatasetSchemaFlatten, (item) => item?.property == prop)
            removedItems.push(
                {
                    name: _.get(item, 'property')
                }
            )
        })
        deletions.push({ type: 'dataSchema', items: removedItems })
    }
    const liveDataSetCommonSchema = _.filter(liveDatasetSchemaFlatten, (item) => _.includes(commonProps, item?.property))
    const draftDataSetCommonSchema = _.filter(draftDatasetSchemaFlatten, (item) => _.includes(commonProps, item?.property))
    const diff = getDiff(liveDataSetCommonSchema, draftDataSetCommonSchema, { isLodashLike: true })
    const modifiedItems: any[] = [];
    _.forEach(diff.edited, (item, key) => {
        const schemaIndex = _.split(item[0], '.')[0];
        const name = _.split(item[0], '.')[1];
        modifiedItems.push({
            field: _.get(_.get(liveDatasetSchemaFlatten, schemaIndex), 'property'),
            name: name,
            value: {
                from: item[1],
                to: item[2]
            }
        }
        )
    })
    if (_.size(modifiedItems) > 0) {
        modifications.push({
            type: 'dataSchema',
            items: modifiedItems
        })
    }

    return { additions, deletions, modifications }
}

const getDataSourceChanges = (liveDataSources: any, draftDataSources: any) => {
    const additions: any[] = [];
    const deletions: any[] = [];
    const modifications: any[] = [];
    const draftDataSourceIds = _.map(draftDataSources, (source) => source?.id)
    const liveDataSourceIds = _.map(liveDataSources, (source) => source?.id)

    const commonIds = _.intersection(liveDataSourceIds, draftDataSourceIds)
    const addedIds = _.difference(draftDataSourceIds, commonIds)
    const removedIds = _.difference(liveDataSourceIds, commonIds)
    if (_.size(addedIds) > 0) {
        const dataSourceAdditions = _.filter(draftDataSources, (item) => _.includes(addedIds, item.id))
        const additionItems = _.map(dataSourceAdditions, (addition) => {
            return {
                name: _.get(addition, 'connector_id'),
                value: _.pick(addition, ['connector_config'])
            }
        })
        _.size(additionItems) > 0 && additions.push({ type: 'dataSource', items: additionItems })
    }

    if (_.size(removedIds) > 0) {
        const dataSourceDeletions = _.filter(liveDataSources, (item) => _.includes(removedIds, item.id))
        const deletionItems = _.map(dataSourceDeletions, (deletion) => {
            return {
                name: _.get(deletion, 'connector_id')
            }
        })
        _.size(deletionItems) > 0 && deletions.push({ type: 'dataSource', items: deletionItems })
    }

    const modifiedItems: any[] = [];
    const commonDataSources = _.intersectionBy(draftDataSources, liveDataSources, 'connector_type')
    if (_.size(commonDataSources) > 0) {
        const commonSourceIds = _.map(commonDataSources, (source) => (_.get(source, 'id')))
        _.forEach(commonSourceIds, (id) => {
            const draftDataSource = _.find(draftDataSources, (source) => _.get(source, 'id') == id)
            const liveDataSource = _.find(liveDataSources, (source) => _.get(source, 'id') == id)
            const diffs = getDiff(_.omit(_.get(liveDataSource, 'connector_config'), 'authenticationMechanism'),
                _.omit(_.get(draftDataSource, 'connector_config'), 'authenticationMechanism'), { isLodashLike: true })
            _.forEach(diffs.edited, (edited) => {
                modifiedItems.push({
                    name: _.get(draftDataSource, 'connector_id'),
                    field: edited[0],
                    value: {
                        from: edited[1],
                        to: edited[2]
                    }
                })
            })
        })
    }
    if (_.size(modifiedItems) > 0) {
        modifications.push(
            {
                type: 'dataSource',
                items: modifiedItems
            }
        )
    }
    return { additions, deletions, modifications }
}

const flattenSchema = (sample: Map<string, any>): any[] => {
    let array = new Array();
    const recursive = (data: any, path: string, requiredProps: string[], schemaPath: string) => {
        _.map(data, (value, key) => {
            let isMultipleTypes = '';
            if (_.has(value, 'anyOf')) isMultipleTypes = 'anyOf';
            if (_.has(value, 'oneOf')) isMultipleTypes = 'oneOf';
            if (_.isPlainObject(value) && (_.has(value, 'properties'))) {
                array.push(_flattenSchema(key, value.type, _.includes(requiredProps, key), `${path}.${key}`, `${schemaPath}.properties.${key}`, value['format'], value?.arrival_format, value?.data_type))
                recursive(value['properties'], `${path}.${key}`, value['required'], `${schemaPath}.properties.${key}`);
            } else if (_.isPlainObject(value)) {
                if (value.type === 'array') {
                    array.push(_flattenSchema(key, value.type, _.includes(requiredProps, key), `${path}.${key}`, `${schemaPath}.properties.${key}`, value['format'], value?.arrival_format, value?.data_type))
                    if (_.has(value, 'items') && _.has(value["items"], 'properties')) {
                        recursive(value["items"]['properties'], `${path}.${key}[*]`, value["items"]['required'], `${schemaPath}.properties.${key}.items`);
                    }
                } else if (isMultipleTypes != '') {
                    array.push(_flattenSchema(key, value[isMultipleTypes][0].type, _.includes(requiredProps, key), `${path}.${key}`, `${schemaPath}.properties.${key}`, value['format'], value?.arrival_format, value?.data_type))
                    array.push(_flattenSchema(key, value[isMultipleTypes][1].type, _.includes(requiredProps, key), `${path}.${key}`, `${schemaPath}.properties.${key}`, value['format'], value?.arrival_format, value?.data_type))
                } else {
                    array.push(_flattenSchema(key, value.type, _.includes(requiredProps, key), `${path}.${key}`, `${schemaPath}.properties.${key}`, value['format'], value?.arrival_format, value?.data_type))
                }
            }
        })
    }
    recursive(sample.get("properties"), "$", sample.get("required"), "$")
    return array
}

const _flattenSchema = (expr: string, objType: string, isRequired: boolean, path: string, schemaPath: string, format: string, arrivalFormat: string, dataType: string) => {
    return <any>{ "property": expr, "type": objType, "isRequired": isRequired, "path": path, "absolutePath": schemaPath, "format": format, arrivalFormat, dataType }
}

export const fieldsByStatus: { [key: string]: string } = {
    Draft: 'name,type,id,dataset_id,version,validation_config,extraction_config,dedup_config,data_schema,denorm_config,router_config,dataset_config,tags,status,created_by,updated_by,created_date,updated_date,version_key,api_version,entry_topic,transformations_config,connectors_config,sample_data',
    default: 'name,type,id,dataset_id,version,validation_config,extraction_config,dedup_config,data_schema,denorm_config,router_config,dataset_config,tags,status,created_by,updated_by,created_date,updated_date,api_version,entry_topic,sample_data'
};

const migrateV1Live = async (liveDatasets: Record<string, any>) => {
    const dataset_config: any = _.get(liveDatasets, "dataset_config");
    const type = _.get(liveDatasets, "type")
    let datasets: any = {}
    datasets["dataset_config"] = {
        indexing_config: { olap_store_enabled: true, lakehouse_enabled: false, cache_enabled: (_.get(liveDatasets, "type") === "master") },
        keys_config: { ...(type == "master" && { data_key: dataset_config.data_key }), timestamp_key: dataset_config.timestamp_key },
        cache_config: { redis_db_host: dataset_config.redis_db_host, redis_db_port: dataset_config.redis_db_port, redis_db: dataset_config.redis_db }
    }
    return datasets;
}