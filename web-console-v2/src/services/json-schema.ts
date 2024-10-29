import * as _ from 'lodash';
import { ValidationMode } from '../types/datasets';

const getSuggestionsFromRow = (row: Record<string, any>): any[] => {
    let suggestions = _.get(row, 'suggestions', []);
    const subRows = _.get(row, 'subRows', []);
    subRows.forEach((subRow: Record<string, any>) => {
        suggestions = suggestions.concat(getSuggestionsFromRow(subRow));
    });
    return suggestions;
};

export const getNonDeletedRows = (data: Record<string, any>[]) => {
    return _.filter(data || [], (payload) => {
        const isDeleted = _.get(payload, 'isDeleted') || false;
        return !isDeleted;
    });
};

export const filterRows = (
    row: Record<string, any>
): { unresolved: Record<string, any>[]; resolved: Record<string, any>[] } => {
    const unresolvedSubRows: Record<string, any>[] = [];
    const resolvedSubRows: Record<string, any>[] = [];

    const checkAndAddSubRows = (currentRow: Record<string, any>): void => {
        const subRows = _.get(currentRow, 'subRows', []);
        const isResolved = _.get(currentRow, 'resolved', false);
        const suggestions = getSuggestionsFromRow(currentRow);
        const hasCriticalSuggestion = checkForCriticalSuggestion(suggestions);

        if (hasCriticalSuggestion && subRows.length === 0) {
            if (!isResolved) {
                unresolvedSubRows.push(currentRow);
            } else {
                resolvedSubRows.push(currentRow);
            }
        }

        subRows.forEach((subRow: Record<string, any>) => {
            checkAndAddSubRows(subRow);
        });
    };

    checkAndAddSubRows(row);
    return { unresolved: unresolvedSubRows, resolved: resolvedSubRows };
};

export const getFilteredData = (data: Record<string, any>[], lookup: string) => {
    const columns = new Set();
    const getDerivedColumns = (columnName: string) => {
        const keys = _.split(columnName, '.');
        for (let index = 0; index < keys.length; index++) {
            columns.add(_.join(_.slice(keys, 0, index + 1), '.'));
        }
    };

    const filteredSubRows: Record<string, any>[] = [];

    _.forEach(data, (columnMetadata) => {
        const { unresolved, resolved } = filterRows(columnMetadata);
        const rowsToCheck = lookup === 'resolved' ? resolved : unresolved;

        rowsToCheck.forEach((subRow) => {
            const subRowSuggestions = getSuggestionsFromRow(subRow);
            if (checkForCriticalSuggestion(subRowSuggestions)) {
                filteredSubRows.push(subRow);
            }
        });
    });

    filteredSubRows.forEach((subRow) => {
        getDerivedColumns(_.get(subRow, 'column'));
    });
    return filteredSubRows;
};

const addRequiredFields = (
    type: string,
    result: Record<string, any>,
    schemaObject: Record<string, any>,
    isRequired: string[]
) => {
    const requiredFields = schemaObject.isRequired || [];
    _.map(result, (item) => {
        if (type === 'array' || type === 'object') {
            if (isRequired && isRequired.includes(item.key.replace('properties.', '')))
                item.isRequired = true;
            else if (requiredFields.includes(item.key.replace('properties.', '')))
                item.isRequired = true;
            else item.isRequired = false;
        } else if (requiredFields.includes(item.key.replace('properties.', '')))
            item.isRequired = true;
        else item.required = false;
    });
};

const insertProperties = (data: any) =>
    data.flatMap((item: any, index: any) =>
        index === data.length - 1 ? [item] : [item, 'properties']
    );

const transformDataV1 = (data: any, jsonSchemaData: any) => {
    return _.reduce(data, (result: any, obj) => {
        const columns = obj.column.split('.');
        let parent: any = result;
        columns.forEach((column: any, index: any) => {
            const originalColumn = obj.column;
            const rootType = _.size(columns) > 1 ? _.cloneDeep(columns).slice(0, -1) : columns;
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
            if (_.has(subRow, 'subRows')) _.set(subRow, 'disableActions', true);
            parent = subRow;
        });
        return result;
    }, { "subRows": [] });
}

const transformData = (data: any, jsonSchemaData: any) => {
    return _.reduce(
        data,
        (result: any, obj) => {
            const columns = obj.column.split('.');
            let parent: any = result;
            columns.forEach((column: any, index: any) => {
                const originalColumn = obj.column;
                const rootType = _.size(columns) > 1 ? _.cloneDeep(columns).slice(0, -1) : columns;
                const columnWithoutDots = column.replace(/\./g, '');
                let subRows: any = _.get(parent, 'subRows');
                if (!subRows) {
                    subRows = [];
                    parent.subRows = subRows;
                }

                const subRow = {
                    column: columnWithoutDots,
                    originalColumn,
                    type: _.get(jsonSchemaData, [
                        'properties',
                        ...insertProperties(rootType),
                        'type',
                        columnWithoutDots
                    ]),
                    ..._.omit(obj, ['column'])
                };
                subRows.push(subRow);

                if (_.has(subRow, 'subRows')) _.set(subRow, 'disableActions', true);
                parent = subRow;
            });
            return result;
        },
        { subRows: [] }
    );
};

export const getNesting = (payload: any, jsonSchemaData: any) => {
    const data: any = transformData(payload, jsonSchemaData);
    return data.subRows;
};

export const getNestingV1 = (payload: any, jsonSchemaData: any) => {
    const data: any = transformDataV1(payload, jsonSchemaData);
    return data.subRows;
};

const flatten = (schemaObject: Record<string, any>, rollup = false) => {
    const schemaObjectData = schemaObject;
    const result: Record<string, any> = {};
    const getKeyName = (prefix: string, key: string) => (prefix ? `${prefix}.${key}` : key);
    const flattenHelperFn = (
        propertySchema: Record<string, any>,
        prefix: string,
        ref: string,
        arrayChild = false
    ) => {
        const { type, properties, items, required, ...rest } = propertySchema;
        if (type === 'object' && properties) {
            if (prefix !== '' && !arrayChild)
                result[prefix] = {
                    type,
                    key: ref,
                    ref,
                    properties,
                    items,
                    parent: true,
                    ...rest
                };
            for (const [key, value] of Object.entries(properties)) {
                flattenHelperFn(
                    value as Record<string, any>,
                    getKeyName(prefix, key),
                    getKeyName(ref, `properties.${key}`)
                );
            }
        } else if (type === 'array' && items && !rollup) {
            if (prefix !== '')
                result[prefix] = {
                    type,
                    key: ref,
                    ref,
                    properties,
                    items,
                    parent: true,
                    ...rest
                };
            if (['array', 'object'].includes(items?.type)) {
                flattenHelperFn(items, prefix, getKeyName(ref, `items`), true);
            } else {
                result[prefix] = { type, key: ref, ref, properties, items, ...rest };
            }
        } else {
            result[prefix] = { type, key: ref, ref, properties, items, ...rest };
        }
        addRequiredFields(type, result, schemaObjectData, required);
    };

    flattenHelperFn(schemaObjectData, '', '');
    return result;
};

export const updateDenormDerived = (
    schemaColumns: any,
    columns: any,
    fixedPrefix: string
): any[] => {
    const result = _.map(columns, (column: any) => {
        const isExistingColumn = _.find(schemaColumns, ['column', column.field_key]);
        if (isExistingColumn) {
            return {
                ...isExistingColumn,
                type: _.get(column, 'metadata._transformedFieldSchemaType'),
                data_type: _.get(column, 'metadata._transformedFieldDataType'),
                required: false,
                isModified: true,
                ..._.get(column, 'metadata')
            };
        } else {
            const columnKey = _.join(
                _.map(
                    _.split(_.get(column, 'field_key'), '.'),
                    (payload) => `properties.${payload}`
                ),
                '.'
            );
            return {
                column: `${fixedPrefix}.${column.field_key}`,
                type: _.get(column, 'metadata._transformedFieldSchemaType'),
                key: `properties.${fixedPrefix}.${columnKey}`,
                ref: `properties.${fixedPrefix}.${columnKey}`,
                required: false,
                isModified: true,
                data_type: _.get(column, 'metadata._transformedFieldDataType'),
                ..._.get(column, 'metadata')
            };
        }
    });
    return _.concat(schemaColumns, result);
};

export const flattenSchemaV1 = (schema: Record<string, any>, fixedPrefix?: string | undefined, modified?: boolean, rollup = false) => {
    const flattend = flatten(schema, rollup);
    if (fixedPrefix)
        return _.map(flattend, (value, key) => {
            const { key: propertyKey, ref } = value;
            const keySplit = _.split(propertyKey, '.');
            const refSplit = _.split(ref, '.');
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

export const flattenSchema = (
    schema: Record<string, any>,
    fixedPrefix?: string | undefined,
    modified?: boolean,
    rollup = false
) => {
    const flattend = flatten(schema, rollup);
    if (fixedPrefix)
        return _.map(flattend, (value, key) => {
            const { key: propertyKey, ref } = value;
            const keySplit = _.split(propertyKey, '.');
            const refSplit = _.split(ref, '.');
            keySplit.splice(1, 0, fixedPrefix, 'properties');
            refSplit.splice(1, 0, fixedPrefix, 'properties');
            const data = {
                column: `${fixedPrefix}.${key}`,
                ...value,
                key: keySplit.join('.'),
                ref: refSplit.join('.')
            };
            if (modified) {
                data.isModified = true;
                data.required = false;
            }
            return data;
        });
    return _.map(flattend, (value, key) => ({ column: key, ...value }));
};

export const checkForCriticalSuggestion = (suggestions: any) =>
    _.some(suggestions, (suggestion) => {
        return _.includes(['must-fix'], suggestion?.severity?.toLowerCase());
    });

export const isResolved = (payload: Record<string, any>) => {
    const { suggestions = [], resolved = false } = payload;
    const isCritical = checkForCriticalSuggestion(suggestions);
    return isCritical ? resolved : true;
};

export const areConflictsResolved = (payload: Array<any>) => {
    return _.every(payload, isResolved);
};

const changeRequiredPropertyInSchema = (
    schema: Record<string, any>,
    schemaKeyPath: string,
    isRequired: boolean
) => {
    const schemaObject = _.get(schema, schemaKeyPath);
    if (schemaObject) {
        schemaObject.isRequired = isRequired;
        if (schemaObject.subRows) {
            _.forEach(schemaObject.subRows, (subRow) => {
                subRow.isRequired = isRequired;
            });
        }
    } else {
        console.warn(`No schema object found at path: ${schemaKeyPath}`);
    }
};

const deleteItemFromSchema = (
    schema: Record<string, any>,
    schemaKeyPath: string,
    isRequired: boolean
) => {
    if (_.has(schema, schemaKeyPath)) {
        _.unset(schema, schemaKeyPath);
        changeRequiredPropertyInSchema(schema, schemaKeyPath, isRequired);
    }
};

const updateTypeInSchema = (
    schema: Record<string, any>,
    schemaPath: string,
    type: string,
    removeSuggestions = false
) => {
    const existing = _.get(schema, schemaPath);

    if (existing) {
        if (removeSuggestions) {
            _.unset(existing, 'suggestions');
            _.unset(existing, 'oneof');
            _.unset(existing, 'arrivalOneOf');
        }

        if (existing.subRows) {
            _.forEach(existing.subRows, (subRow, index) => {
                const subRowPath = `${schemaPath}.subRows.${index}`;
                updateTypeInSchema(schema, subRowPath, type, removeSuggestions);
            });
        }

        _.set(schema, schemaPath, { ...existing, type });
    } else {
        console.warn(`Path ${schemaPath} does not exist in schema.`);
    }
};
const updateFormatInSchema = (
    schema: Record<string, any>,
    schemaPath: string,
    arrival_format: string
) => {
    const existing = _.get(schema, schemaPath);
    _.set(schema, schemaPath, { ...existing, arrival_format });
};

const updateDataTypeInSchema = (
    schema: Record<string, any>,
    schemaPath: string,
    data_type: string,
    isModified: boolean
) => {
    const existing = _.get(schema, schemaPath);
    if (isModified) {
        const validDateFormats = ['date-time', 'date', 'epoch'];
        if (!_.includes(validDateFormats, data_type)) {
            _.unset(existing, 'format');
        } else {
            data_type === 'epoch'
                ? _.set(existing, 'format', 'date-time')
                : _.set(existing, 'format', data_type);
        }
    }
    _.set(schema, schemaPath, { ...existing, data_type });
};

const descriptionInSchema = (
    schema: Record<string, any>,
    schemaPath: string,
    description: string
) => {
    const existing = _.get(schema, schemaPath);
    if (description) _.set(schema, schemaPath, { ...existing, description });
};

export const setAdditionalProperties = (
    schemaObject: Record<string, any>,
    validationMode: string
) => {
    const schemaObjectData = schemaObject;

    const helperFn = (propertySchema: any) => {
        const { type, properties, items } = propertySchema;
        if (type === 'object') {
            //TODO: needs to changed based on the new validation modes
            _.set(propertySchema, 'additionalProperties', validationMode === ValidationMode.IgnoreNewFields);
            if (properties) {
                for (const [key, value] of Object.entries(properties)) {
                    helperFn(value);
                }
            }
        } else if (type === 'array' && items) {
            if (['object'].includes(items?.type)) {
                helperFn(items);
            }
        }
    };

    helperFn(schemaObjectData);
    return schemaObjectData;
};

export const updateJSONSchema = (
    schema: Record<string, any>,
    updatePayload: Record<string, any>
) => {
    const clonedOriginal = _.cloneDeep(schema);
    const modifiedRows = _.filter(_.get(updatePayload, 'schema'), ['isModified', true]);
    _.forEach(modifiedRows, (modifiedRow) => {
        const {
            isDeleted = false,
            required = false,
            key,
            type,
            description = null,
            arrival_format,
            data_type,
            isModified = false
        } = modifiedRow;
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
};

export const formatSchemaItem = (key: string, item: any): any => {
    const schemaType = item.type || 'string';
    const dataType = item.data_type || 'string';
    const arrivalFormat = item.arrival_format || '';
    const isRequired = item.isRequired || false;
    const description = item.description || '';
    const canExpand = schemaType === 'object' || arrivalFormat === 'object';
    const isExpanded = item.isExpanded || false;

    const subRows =
        canExpand && (item.properties || item.subRows)
            ? prepareFieldsFromJson(item.properties || item.subRows)
            : [];

    const allChildWithSuggestionsResolved = subRows
        .filter((row: any) => row.suggestions && row.suggestions.length > 0)
        .every((row: any) => row.resolved === true);

    const resolved =
        item.resolved !== undefined
            ? item.resolved
            : canExpand
                ? allChildWithSuggestionsResolved
                : !item.suggestions?.length;

    return {
        key: key,
        column: key,
        type: schemaType,
        arrival_format: arrivalFormat,
        data_type: dataType,
        isRequired: isRequired,
        description: description,
        canExpand: canExpand,
        isExpanded: isExpanded,
        subRows: subRows,
        suggestions: item.suggestions || [],
        oneof: item.oneof || [],
        arrivalOneOf: item.arrivalOneOf || [],
        originalColumn: key,
        resolved: resolved
    };
};

export const prepareFieldsFromJson = (fields: any): any => {
    if (Array.isArray(fields)) {
        return fields.map((item, index) => {
            const key = item.key.toString();
            return formatSchemaItem(key, item);
        });
    } else if (typeof fields === 'object' && fields !== null) {
        return Object.entries(fields).map(([key, item]) => {
            return formatSchemaItem(key, item);
        });
    } else {
        console.error('Unexpected type for fields:', typeof fields);
        return [];
    }
};

export const downloadJSONSchema = (
    schema: Record<string, any>,
    updatePayload: Record<string, any>,
    schemaBase: any
) => {
    const clonedOriginal = _.cloneDeep(schema);
    const modifiedRows = _.get(updatePayload, 'schema');
    const processRow = (
        row: {
            isDeleted?: false | undefined;
            isRequired?: false | undefined;
            key: any;
            type: any;
            description?: string | undefined;
            arrival_format: any;
            data_type: any;
            subRows?: never[] | undefined;
            isModified?: false | undefined;
        },
        path: string
    ) => {
        const {
            isDeleted = false,
            isRequired = false,
            key,
            type,
            description = '',
            arrival_format,
            data_type,
            subRows = [],
            isModified = false
        } = row;

        const currentPath = `${path}.${key}`;

        if (isDeleted) {
            deleteItemFromSchema(clonedOriginal, currentPath, false);
        } else {
            updateTypeInSchema(clonedOriginal, currentPath, type, true);
            updateFormatInSchema(clonedOriginal, currentPath, arrival_format);
            updateDataTypeInSchema(clonedOriginal, currentPath, data_type, isModified);
            descriptionInSchema(clonedOriginal, currentPath, description);
            changeRequiredPropertyInSchema(clonedOriginal, currentPath, isRequired);
        }

        if (subRows && subRows.length > 0) {
            subRows.forEach((subRow: any) => {
                processRow(subRow, `${currentPath}.properties`);
            });
        }
    };

    _.forEach(modifiedRows, (modifiedRow) => {
        processRow(modifiedRow, 'schema');
    });

    const finalSchema = {
        schema: {
            $schema: schemaBase.schema,
            type: 'object',
            properties: clonedOriginal.schema,
            additionalProperties: true
        }
    };

    return finalSchema;
};

export const checkForMustFixConflict = (row: Record<string, any>) => {
    const helper = (subRow: Record<string, any>, conflict = false, resolved = true) => {
        const subRows = subRow?.subRows || [];
        const suggestions = _.get(subRow, 'suggestions') || [];
        const isCritical = checkForCriticalSuggestion(suggestions);
        const isResolved = _.has(subRow, 'resolved')
            ? _.get(subRow, 'resolved')
            : isCritical
                ? false
                : true;
        conflict = conflict || isCritical;
        resolved = resolved && isResolved;
        for (const subRow of subRows) {
            [conflict, resolved] = helper(subRow, conflict, resolved);
        }
        return [conflict, resolved];
    };
    return helper(row);
};

export const mergeEvents = (events: any) => {
    const mergedEvent: any = {};
    events.forEach((event: any) => {
        for (const key in event) {
            if (_.has(event, key)) {
                const mergedValue = mergedEvent[key];
                const eventValue = event[key];
                const bothObjects = _.isObject(mergedValue) && _.isObject(eventValue);
                const notArray = !_.isArray(mergedValue) && !_.isArray(eventValue);

                if (bothObjects && notArray) {
                    mergedEvent[key] = mergeObjects(mergedValue, eventValue);
                } else {
                    mergedEvent[key] = eventValue;
                }
            }
        }
    });
    return mergedEvent;
};

const mergeObjects = (obj1: any, obj2: any) => {
    const mergedObj = { ...obj1 };

    for (const key in obj2) {
        if (_.has(obj2, key)) {
            const mergedValue = mergedObj[key];
            const obj2Value = obj2[key];
            const bothObjects = _.isObject(mergedValue) && _.isObject(obj2Value);
            const notArray = !_.isArray(mergedValue) && !_.isArray(obj2Value);

            if (bothObjects && notArray) {
                mergedObj[key] = mergeObjects(mergedValue, obj2Value);
            } else {
                mergedObj[key] = obj2Value;
            }
        }
    }
    return mergedObj;
};

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
};

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
