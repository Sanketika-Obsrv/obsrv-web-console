import * as _ from "lodash";
import { fetchDatasetRecord } from "../services/dataset";

export const flattenSchema = (schema: Record<string, any>, fixedPrefix?: string | undefined, modified?: boolean, rollup: boolean = false) => {
    const flattend = flatten(schema, rollup);
    if (fixedPrefix)
        return _.map(flattend, (value, key) => {
            const { key: propertyKey, ref } = value;
            let keySplit = _.split(propertyKey, '.');
            let refSplit = _.split(ref, '.');
            keySplit.splice(1, 0, fixedPrefix, 'properties');
            refSplit.splice(1, 0, fixedPrefix, 'properties');
            const data = {
                column: `${fixedPrefix}.${key}`,
                ...value,
                key: keySplit.join('.'),
                ref: refSplit.join('.'),
            };
            if (modified) { data.isModified = true; data.required = false; }
            return data;
        });
    return _.map(flattend, (value, key) => ({ column: key, ...value }));
}

export const getAllFields = async (dataset: Record<string, any>, type: string): Promise<Record<string, any>[]> => {

    const { data_schema, denorm_config, transformations_config } = dataset
    let dataFields = flattenSchema(data_schema, type);
    if (!_.isEmpty(denorm_config.denorm_fields)) {
        for (const denormField of denorm_config.denorm_fields) {
            const denormDataset: any = {}
            const properties = flattenSchema(denormDataset.data_schema, type);
            const transformProps = _.map(properties, (prop) => {
                _.set(prop, 'name', _.join([denormField.denorm_out_field, prop.name], '.'));
                _.set(prop, 'expr', _.replace(prop.expr, "$", "$." + denormField.denorm_out_field));
                return prop;
            });
            dataFields.push(...transformProps);
        }
    }
    if (!_.isEmpty(transformations_config)) {
        const transformationFields = _.map(transformations_config, (tf) => ({
            expr: "$." + tf.field_key,
            name: tf.field_key,
            data_type: tf.transformation_function.datatype,
            arrival_format: tf.transformation_function.datatype,
            type: tf.transformation_function.datatype
        }))
        const originalFields = _.differenceBy(dataFields, transformationFields, "name")
        dataFields = _.concat(originalFields, transformationFields)
    }
    _.remove(dataFields, { is_deleted: true })
    return dataFields;
}

export const updateDenormDerived = (schemaColumns: any, columns: any, fixedPrefix: string): any[] => {
    const result = _.map(columns, (column: any) => {
        const isExistingColumn = _.find(schemaColumns, ["column", column.field_key]);
        if (isExistingColumn) {
            return {
                ...isExistingColumn,
                "type": _.get(column, "transformation_function.type"),
                "data_type": _.get(column, "transformation_function.datatype"),
                "required": false,
                "isModified": true,
                ..._.get(column, "metadata"),
            };
        } else {
            const columnKey = _.join(_.map(_.split(_.get(column, "field_key"), "."), payload => `properties.${payload}`), ".")
            return {
                "column": `${fixedPrefix}.${column.field_key}`,
                "type": _.get(column, "transformation_function.type"),
                "key": `properties.${fixedPrefix}.${columnKey}`,
                "ref": `properties.${fixedPrefix}.${columnKey}`,
                "required": false,
                "isModified": true,
                "data_type": _.get(column, "transformation_function.type"),
                ..._.get(column, "metadata"),
            };
        }
    });
    return _.concat(schemaColumns, result);
}

const processDenormConfigurations = async (item: any, transformations: any) => {
    const denormFieldsData: any = [];
    const dataset_id = _.get(item, 'dataset_id');
    const denorm_out_field = _.get(item, "denorm_out_field");
    const dataset = await fetchDatasetRecord(dataset_id, "Live");
    let schema = flattenSchema(_.get(dataset, "data_schema"), denorm_out_field, true);
    schema = updateDenormDerived(schema,transformations, denorm_out_field,);
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


export const formatDenormFields = async (denormFields: any, transformations: any) => {
    if (denormFields.length > 0) {
        const final = _.map(denormFields, (item: any) => {
            return processDenormConfigurations(item, transformations);
        });
        return Promise.all(final).then((data) => _.flatten(data));
    }
    else return [];
}

const addRequiredFields = (
    type: string,
    result: Record<string, any>,
    schemaObject: Record<string, any>,
    required: string[],
) => {
    const requiredFields = schemaObject.required || [];
    _.map(result, (item) => {
        if (type === 'array' || type === 'object') {
            if (required && required.includes(item.key.replace('properties.', ''))) item.required = true;
            else if (requiredFields.includes(item.key.replace('properties.', ''))) item.required = true;
            else item.required = false;
        }
        else if (requiredFields.includes(item.key.replace('properties.', ''))) item.required = true;
        else item.required = false;
    })
}

const flatten = (schemaObject: Record<string, any>, rollup: boolean = false) => {
    let schemaObjectData = schemaObject;
    const result: Record<string, any> = {};
    const getKeyName = (prefix: string, key: string) => prefix ? `${prefix}.${key}` : key;
    const flattenHelperFn = (propertySchema: Record<string, any>, prefix: string, ref: string, arrayChild = false) => {
        const { type, properties, items, required, ...rest } = propertySchema;
        if (type === 'object' && properties) {
            if (prefix !== "" && !arrayChild) result[prefix] = { type, key: ref, ref, properties, items, parent: true, ...rest };
            for (let [key, value] of Object.entries(properties)) {
                flattenHelperFn(value as Record<string, any>, getKeyName(prefix, key), getKeyName(ref, `properties.${key}`));
            }
        } else if (type === 'array' && items && !rollup) {
            if (prefix !== "") result[prefix] = { type, key: ref, ref, properties, items, parent: true, ...rest };
            if (['array', 'object'].includes(items?.type)) {
                flattenHelperFn(items, prefix, getKeyName(ref, `items`), true)
            } else {
                result[prefix] = { type, key: ref, ref, properties, items, ...rest };
            }
        } else {
            result[prefix] = { type, key: ref, ref, properties, items, ...rest };
        }
        addRequiredFields(type, result, schemaObjectData, required);
    }

    flattenHelperFn(schemaObjectData, "", "");
    return result;
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
        const derivedFields = _.filter(newFields,(field:any)=>{
            return field?.transformation_function?.category === "derived"
        })
        const final = _.map(derivedFields, (item: any) => {
            const columnKey = _.join(_.map(_.split(_.get(item, "field_key"), '.'), payload => `properties.${payload}`), '.')
            return {
                ...item,
                "column": item?.field_key,
                "type": _.get(item, 'transformation_function.datatype') || "string",
                "key": columnKey,
                "ref": columnKey,
                "isModified": true,
                "required": false,
                "data_type": _.get(item, 'transformation_function.datatype'),
                ...(dataMappings && { "arrival_format": getArrivalFormat(_.get(item, '_transformedFieldSchemaType'), dataMappings) || _.get(item, 'arrival_format') })
            }
        });
        return final;
    }
    else return [];
}
