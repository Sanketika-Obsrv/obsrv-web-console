import * as _ from 'lodash'
import { http } from 'services/http';
import apiEndpoint from 'data/apiEndpoints';
import { ValidationMode } from 'types/datasets';
import Ajv from "ajv";
import { generateRequestBody } from './utils';
const validator = new Ajv({
    strict: false
});

export const fetchJsonSchema = (data: Record<string, any>) => {
    const transitionRequest = generateRequestBody({ request: { ...data }, apiId: "api.datasets.dataschema" })
    return http.post(apiEndpoint.generateJsonSchema, transitionRequest)
        .then(response => response.data?.result);
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

const insertProperties = (data: any) => data.flatMap((item: any, index: any) => (index === data.length - 1 ? [item] : [item, 'properties']));

const transformData = (data: any, jsonSchemaData: any) => {
    return _.reduce(data, (result: any, obj) => {
        const columns = obj.column.split('.');
        let parent: any = result;
        columns.forEach((column: any, index: any) => {
            const originalColumn = obj.column;
            let rootType = _.size(columns) > 1 ? _.cloneDeep(columns).slice(0, -1) : columns;
            const columnWithoutDots = column.replace(/\./g, '');
            let subRows: any = _.get(parent, 'subRows');
            if (!subRows) {
                subRows = [];
                parent.subRows = subRows;
            }
            let subRow = _.find(subRows, { column: columnWithoutDots });
            if (!subRow) {
                subRow = { column: columnWithoutDots, originalColumn, type: _.get(jsonSchemaData, ['properties', ...insertProperties(rootType), 'type', columnWithoutDots]), ..._.omit(obj, ['column']) };
                subRows.push(subRow);
            }
            if(_.has(subRow, 'subRows')) _.set(subRow, 'disableActions', true);
            parent = subRow;
        });
        return result;
    }, { "subRows": [] });
}

export const getNesting = (payload: any, jsonSchemaData: any) => {
    const data: any = transformData(payload, jsonSchemaData);
    return data.subRows;
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
        } else if (type === 'array' && items && !rollup ) {
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

export const updateDenormDerived = (schemaColumns: any, columns: any, fixedPrefix: string): any[] => {
    const result = _.map(columns, (column: any) => {
        const isExistingColumn = _.find(schemaColumns, ['column', column.field_key]);
        if (isExistingColumn) {
            return {
                ...isExistingColumn,
                "type": _.get(column, 'metadata._transformedFieldSchemaType'),
                "data_type": _.get(column, 'metadata._transformedFieldDataType'),
                "required": false,
                "isModified": true,
                ..._.get(column, 'metadata'),
            };
        } else {
            const columnKey = _.join(_.map(_.split(_.get(column, "field_key"), '.'), payload => `properties.${payload}`), '.')
            return {
                "column": `${fixedPrefix}.${column.field_key}`,
                "type": _.get(column, 'metadata._transformedFieldSchemaType'),
                "key": `properties.${fixedPrefix}.${columnKey}`,
                "ref": `properties.${fixedPrefix}.${columnKey}`,
                "required": false,
                "isModified": true,
                "data_type": _.get(column, 'metadata._transformedFieldDataType'),
                ..._.get(column, 'metadata'),
            };
        }
    });
    return _.concat(schemaColumns, result);
}

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

export const checkForCriticalSuggestion = (suggestions: any) => _.some(suggestions, suggestion => {
    return _.includes(['must-fix'], suggestion?.severity?.toLowerCase())
})

export const isResolved = (payload: Record<string, any>) => {
    const { suggestions = [], resolved = false } = payload;
    const isCritical = checkForCriticalSuggestion(suggestions);
    return isCritical ? resolved : true;
}

export const areConflictsResolved = (payload: Array<any>) => {
    return _.every(payload, isResolved);
}

const getPathToRequiredKey = (schema: Record<string, any>, schemaKeyPath: string, schemaKey: string) => {
    const regExStr = `properties.${schemaKey}`;
    const regex = `(.${regExStr})`;
    const [pathToRequiredKey] = _.split(schemaKeyPath, new RegExp(regex, 'g'));
    if (pathToRequiredKey === schemaKeyPath) return 'required'
    return `${pathToRequiredKey}.required`
}

const changeRequiredPropertyInSchema = (schema: Record<string, any>, schemaKeyPath: string, required: boolean) => {
    const schemaKey = _.last(_.split(schemaKeyPath, '.'));
    if (schemaKey) {
        const pathToRequiredProperty = getPathToRequiredKey(schema, schemaKeyPath, schemaKey);
        let existingRequiredKeys = _.get(schema, pathToRequiredProperty) || [];
        if (required) {
            // add to required property.
            const updatedRequiredKeys = _.includes(existingRequiredKeys, schemaKey) ? existingRequiredKeys : [...existingRequiredKeys, schemaKey];
            _.set(schema, pathToRequiredProperty, updatedRequiredKeys);
        } else {
            // remove from required property.
            const updatedRequiredKeys = _.difference(existingRequiredKeys, [schemaKey]);
            if (_.size(updatedRequiredKeys) > 0)
                _.set(schema, pathToRequiredProperty, updatedRequiredKeys);
        }
    }
}

const deleteItemFromSchema = (schema: Record<string, any>, schemaKeyPath: string, required: boolean) => {
    if (_.has(schema, schemaKeyPath)) {
        _.unset(schema, schemaKeyPath);
        changeRequiredPropertyInSchema(schema, schemaKeyPath, required);
    }
}

const updateTypeInSchema = (schema: Record<string, any>, schemaPath: string, type: string, removeSuggestions: boolean = false) => {
    const existing = _.get(schema, schemaPath);
    if (removeSuggestions){
        _.unset(existing, 'suggestions');
        _.unset(existing, 'oneof');
        _.unset(existing, 'arrivalOneOf')
    }
    _.set(schema, schemaPath, { ...existing, type });
}

const updateFormatInSchema = (schema: Record<string, any>, schemaPath: string, arrival_format: string) => {
    const existing = _.get(schema, schemaPath);
    _.set(schema, schemaPath, { ...existing, arrival_format });
}

const updateDataTypeInSchema = (schema: Record<string, any>, schemaPath: string, data_type: string, isModified: boolean) => {
    const existing = _.get(schema, schemaPath);
    if (isModified) {
        const validDateFormats = ['date-time', 'date', 'epoch']
        if (!_.includes(validDateFormats, data_type)) {
            _.unset(existing, 'format');
        } else {
            data_type === 'epoch' ? _.set(existing, 'format', 'date-time') : _.set(existing, 'format', data_type)
        }
    }
    _.set(schema, schemaPath, { ...existing, data_type });
}

const descriptionInSchema = (schema: Record<string, any>, schemaPath: string, description: string) => {
    const existing = _.get(schema, schemaPath);
    if (description) _.set(schema, schemaPath, { ...existing, description });
}

export const setAdditionalProperties = (schemaObject: Record<string, any>, validationMode: string) => {
    let schemaObjectData = schemaObject;

    const helperFn = (propertySchema: any) => {
        const { type, properties, items } = propertySchema;
        if (type === 'object') {
            _.set(propertySchema, 'additionalProperties', validationMode!==ValidationMode.Strict)
            if (properties) {
                for (let [key, value] of Object.entries(properties)) {
                    helperFn(value);
                }
            }
        } else if (type === 'array' && items) {
            if (['object'].includes(items?.type)) {
                helperFn(items)
            }
        }
    }

    helperFn(schemaObjectData);
    return schemaObjectData;
}

export const updateJSONSchema = (schema: Record<string, any>, updatePayload: Record<string, any>) => {
    const clonedOriginal = _.cloneDeep(schema);
    const modifiedRows = _.filter(_.get(updatePayload, 'schema'), ['isModified', true]);
    _.forEach(modifiedRows, modifiedRow => {
        const { isDeleted = false, required = false, key, type, description = null, arrival_format, data_type, isModified = false } = modifiedRow;
        if (isDeleted) {
            deleteItemFromSchema(clonedOriginal, `schema.${key}`, false);
        } else {
            updateTypeInSchema(clonedOriginal, `schema.${key}`, type, true);
            updateFormatInSchema(clonedOriginal, `schema.${key}`, arrival_format);
            updateDataTypeInSchema(clonedOriginal, `schema.${key}`, data_type, isModified);
            descriptionInSchema(clonedOriginal, `schema.${key}`, description);
            changeRequiredPropertyInSchema(clonedOriginal, `schema.${key}`, required);
        }
    });
    return clonedOriginal;
}

export const downloadJSONSchema = (schema: Record<string, any>, updatePayload: Record<string, any>) => {
    const clonedOriginal = _.cloneDeep(schema);
    const modifiedRows = _.get(updatePayload, 'schema');
    _.forEach(modifiedRows, modifiedRow => {
        const { isDeleted = false, required = false, key, type, description = null, arrival_format, data_type, isModified = false } = modifiedRow;
        if (isDeleted) {
            deleteItemFromSchema(clonedOriginal, `schema.${key}`, false);
        } else {
            updateTypeInSchema(clonedOriginal, `schema.${key}`, type, true);
            updateFormatInSchema(clonedOriginal, `schema.${key}`, arrival_format);
            updateDataTypeInSchema(clonedOriginal, `schema.${key}`, data_type, isModified);
            descriptionInSchema(clonedOriginal, `schema.${key}`, description);
            changeRequiredPropertyInSchema(clonedOriginal, `schema.${key}`, required);
        }
    });
    return clonedOriginal;
}

export const checkForMustFixConflict = (row: Record<string, any>) => {
    const helper = (subRow: Record<string, any>, conflict = false, resolved = true) => {
        const subRows = subRow?.subRows || [];
        const suggestions = _.get(subRow, 'suggestions') || [];
        const isCritical = checkForCriticalSuggestion(suggestions);
        const isResolved = _.has(subRow, 'resolved') ? _.get(subRow, 'resolved') : (isCritical ? false : true);
        conflict = conflict || isCritical;
        resolved = resolved && isResolved;
        for (const subRow of subRows) {
            [conflict, resolved] = helper(subRow, conflict, resolved);
        }
        return [conflict, resolved];
    };
    return helper(row);
};

export const getFilteredData = (data: Record<string, any>[], lookup: string) => {
    const columns = new Set();

    const getDerivedColumns = (columnName: string) => {
        const keys = _.split(columnName, '.');
        for (let index = 0; index < keys.length; index++) {
            columns.add(_.join(_.slice(keys, 0, index + 1), '.'));
        }
    }

    const resolutionPredicate = (isResolved: boolean) => {
        if (lookup === "resolved") return isResolved;
        return !isResolved;
    }

    _.forEach(data, columnMetadata => {
        const suggestions = _.get(columnMetadata, 'suggestions') || [];
        const isResolved = _.get(columnMetadata, 'resolved') || false;
        const hasCriticalSuggestion = checkForCriticalSuggestion(suggestions);
        const isTruthy = hasCriticalSuggestion && resolutionPredicate(isResolved);
        if (!isTruthy) return;
        getDerivedColumns(_.get(columnMetadata, 'column'));
    });

    return _.compact(_.map([...columns], column => _.find(data, ['column', column])));
}

export const getFilteredMetricData = (data: Record<string, any>[]) => {
    const columns = new Set();

    const getDerivedColumns = (columnName: string) => {
        const keys = _.split(columnName, '.');
        for (let index = 0; index < keys.length; index++) {
            columns.add(_.join(_.slice(keys, 0, index + 1), '.'));
        }
    }

    _.forEach(data, columnMetadata => {
        const factValuedData = _.get(columnMetadata, 'rollupType');
        if (factValuedData === 'fact' || factValuedData === 'count') {
            return getDerivedColumns(_.get(columnMetadata, 'column'));
        }
    });

    return _.compact(_.map([...columns], column => _.find(data, ['column', column])));
}

export const mergeEvents = (events: any) => {
    let mergedEvent: any = {};
    events.forEach((event: any) => {
        for (const key in event) {
            if (_.has(event, key)) {
                // If the key already exists in mergedEvent and it's an object (not an array), merge them recursively
                const mergedValue = mergedEvent[key];
                const eventValue = event[key];
                const bothObjects = _.isObject(mergedValue) && _.isObject(eventValue);
                const notArray = !_.isArray(mergedValue) && !_.isArray(eventValue);

                if (bothObjects && notArray) {
                    mergedEvent[key] = mergeObjects(mergedValue, eventValue);
                } else {
                    // Otherwise, simply assign the value if it's not an array
                    mergedEvent[key] = eventValue;
                }
            }
        }
    });
    return mergedEvent;
}

const mergeObjects = (obj1: any, obj2: any) => {
    let mergedObj = { ...obj1 };

    for (const key in obj2) {
        if (_.has(obj2, key)) {
            // If the key already exists in merged object and it's an object (not an array), merge them recursively
            const mergedValue = mergedObj[key];
            const obj2Value = obj2[key];
            const bothObjects = _.isObject(mergedValue) && _.isObject(obj2Value);
            const notArray = !_.isArray(mergedValue) && !_.isArray(obj2Value);

            if (bothObjects && notArray) {
                mergedObj[key] = mergeObjects(mergedValue, obj2Value);
            } else {
                // Otherwise, simply assign the value if it's not an array
                mergedObj[key] = obj2Value;
            }
        }
    }
    return mergedObj;
}

export const flattenObject = (obj: any) => {
    const flattenedObject: any = {};
    function flatten(obj: any, prefix = '') {
        for (const key in obj) {
            if (_.has(obj, key)) {
                const propertyName = prefix ? `${prefix}.${key}` : key;
                const objValue = obj[key];
                const notArray = !_.isArray(objValue);

                if (_.isObject(objValue) && notArray) {
                    flatten(objValue, propertyName);
                } else {
                    flattenedObject[propertyName] = objValue;
                }
            }
        }
    }
    flatten(obj);
    return flattenedObject;
}

export const schemaValidation = (payload: Record<string, any>, schema: Record<string, any>): Record<string, any> => {
    const isValid = validator.validate(schema, payload)
    if (!isValid) {
        const error: any = validator.errors;
        const errorMessage = error[0]?.schemaPath?.replace("/", "") + " " + error[0]?.message || "Invalid Request Body";
        return { isValid, message: errorMessage }
    }
    return { isValid }
}