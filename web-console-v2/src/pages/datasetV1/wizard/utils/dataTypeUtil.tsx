import * as _ from "lodash";
import moment from 'moment';
import JSONata from 'jsonata';
import en from 'utils/locales/en.json';

const defaultFormatToDataTypeMapping: any = {
    "text": "string",
    "number": "number"
}


const DATE_FORMATS = [
    'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'YYYY-DD-MM', 'YYYY/MM/DD',
    'DD-MM-YYYY', 'MM-DD-YYYY', 'MM-DD-YYYY HH:mm:ss', 'YYYY/MM/DD HH:mm:ss',
    'YYYY-MM-DD HH:mm:ss', 'YYYY-DD-MM HH:mm:ss', 'DD/MM/YYYY HH:mm:ss',
    'DD-MM-YYYY HH:mm:ss', 'MM-DD-YYYY HH:mm:ss.SSS', 'YYYY-MM-DD HH:mm:ss.SSS',
    'YYYY-DD-MM HH:mm:ss.SSS', 'YYYY/MM/DD HH:mm:ss.SSS', 'DD/MM/YYYY HH:mm:ss.SSS',
    'DD-MM-YYYY HH:mm:ss.SSS', 'DD-MM-YYYYTHH:mm:ss.SSSZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    'YYYY-DD-MMTHH:mm:ss.SSSZ', 'YYYY/MM/DDTHH:mm:ss.SSSZ', 'DD/MM/YYYYTHH:mm:ss.SSSZ',
    'YYYY-DD-MMTHH:mm:ss.SSS', 'YYYY/MM/DDTHH:mm:ss.SSS', 'DD/MM/YYYYTHH:mm:ss.SSS',
    'MM-DD-YYYYTHH:mm:ss.SSSZ', 'DD-MM-YYYYTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ssZ',
    'YYYY-DD-MMTHH:mm:ssZ', 'YYYY/MM/DDTHH:mm:ssZ', 'DD/MM/YYYYTHH:mm:ssZ', 'MM-DD-YYYYTHH:mm:ssZ',
    'MM-DD-YYYYTHH:mm:ss', 'DD-MM-YYYYTHH:mm:ss', 'YYYY-MM-DDTHH:mm:ss', 'YYYY-DD-MMTHH:mm:ss',
    'YYYY/MM/DDTHH:mm:ss', 'DD/MM/YYYYTHH:mm:ss', 'DD-MM-YYYY HH:mm:ss.SSSZ', 'YYYY-MM-DD HH:mm:ss.SSSZ',
    'YYYY-DD-MM HH:mm:ss.SSSZ', 'YYYY/MM/DD HH:mm:ss.SSSZ', 'DD/MM/YYYY HH:mm:ss.SSSZ',
    'MM-DD-YYYY HH:mm:ss.SSSZ', 'DD-MM-YYYY HH:mm:ssZ', 'YYYY-MM-DD HH:mm:ssZ', 'YYYY-DD-MM HH:mm:ssZ',
    'YYYY/MM/DD HH:mm:ssZ', 'DD/MM/YYYY HH:mm:ssZ', 'MM-DD-YYYY HH:mm:ssZ', 'DD-MM-YYYYTHH:mm:ss.SSSSSSZ',
    'YYYY-MM-DDTHH:mm:ss.SSSSSSZ', 'YYYY-DD-MMTHH:mm:ss.SSSSSSZ', 'YYYY/MM/DDTHH:mm:ss.SSSSSSZ',
    'DD/MM/YYYYTHH:mm:ss.SSSSSSZ', 'MM-DD-YYYYTHH:mm:ss.SSSSSSZ', 'DD/MM/YYYYTHH:mm:ss.SSSSSS',
    'YYYY-DD-MMTHH:mm:ss.SSSSSS', 'YYYY/MM/DDTHH:mm:ss.SSSSSS', 'YYYY-MM-DDTHH:mm:ss.SSSSSS',
    'MM-DD-YYYYTHH:mm:ss.SSSSSS', 'DD-MM-YYYYTHH:mm:ss.SSSSSS', 'DD-MM-YYYY HH:mm:ss.SSSSSS',
    'YYYY-MM-DD HH:mm:ss.SSSSSS', 'YYYY-DD-MM HH:mm:ss.SSSSSS', 'YYYY/MM/DD HH:mm:ss.SSSSSS',
    'DD/MM/YYYY HH:mm:ss.SSSSSS', 'MM-DD-YYYY HH:mm:ss.SSSSSS', 'DD-MM-YYYY HH:mm:ss.SSSSSSZ',
    'YYYY-MM-DDTHH:mm:ss.SSSSSSSSSZ', 'YYYY-DD-MMTHH:mm:ss.SSSSSSSSSZ', 'YYYY/MM/DDTHH:mm:ss.SSSSSSSSSZ',
    'DD/MM/YYYYTHH:mm:ss.SSSSSSSSSZ', 'MM-DD-YYYYTHH:mm:ss.SSSSSSSSSZ', 'DD/MM/YYYYTHH:mm:ss.SSSSSSSSS',
    'YYYY-DD-MMTHH:mm:ss.SSSSSSSSS', 'YYYY/MM/DDTHH:mm:ss.SSSSSSSSS', 'YYYY-MM-DDTHH:mm:ss.SSSSSSSSS',
    'MM-DD-YYYYTHH:mm:ss.SSSSSSSSS', 'DD-MM-YYYYTHH:mm:ss.SSSSSSSSS', 'DD-MM-YYYY HH:mm:ss.SSSSSSSSS',
    'YYYY-MM-DD HH:mm:ss.SSSSSSSSS', 'YYYY-DD-MM HH:mm:ss.SSSSSSSSS', 'YYYY/MM/DD HH:mm:ss.SSSSSSSSS',
    'DD/MM/YYYY HH:mm:ss.SSSSSSSSS', 'MM-DD-YYYY HH:mm:ss.SSSSSSSSS', 'DD-MM-YYYY HH:mm:ss.SSSSSSSSSZ',
    'DD-MM-YYYYTHH:mm:ss.SSSSSSSSSZ',
];

const updateDataType = (
    val: string, row: any, pageData: any, persistState: any,
    setFlattenedData: any, hasConflicts: boolean, setAnchorEl: any, dataMappings: any) => {
    const updatedValues = { ...row };
    const storeState = _.cloneDeep(pageData);
    const current_arrival_format = updatedValues?.arrival_format
    let typeVal = _.get(dataMappings, [current_arrival_format, 'store_format', val, 'jsonSchema'])
    const storageFormats = _.get(dataMappings, [current_arrival_format, 'store_format'])
    const isValidArrivalFormat = _.get(storageFormats, [val])
    let newArrivalFormat: any = undefined;
    if (!isValidArrivalFormat) {
        newArrivalFormat = _.findKey(dataMappings, (obj) => {
            return _.includes(_.keys(_.get(obj, ['store_format'])), val)
        })
        typeVal = _.get(dataMappings, [newArrivalFormat, 'store_format', val, 'jsonSchema'])
    }
    const data = _.map(storeState, state => {
        if (_.get(state, 'column') === _.get(updatedValues, 'originalColumn'))
            return {
                ...state, ...updatedValues, column: updatedValues.originalColumn, isModified: true, data_type: val, ...(hasConflicts && row?.oneof && { resolved: true }),
                ...(newArrivalFormat && { arrival_format: newArrivalFormat }),
                ...(typeVal && { type: typeVal })
            };
        else return state
    });
    persistState(data);
    setFlattenedData((preState: Array<Record<string, any>>) => {
        const filteredData = _.map(preState, state => {
            if (_.get(state, 'column') === _.get(updatedValues, 'originalColumn'))
                return {
                    ...state, ...updatedValues, column: updatedValues.originalColumn, isModified: true, data_type: val, ...(hasConflicts && row?.oneof && { resolved: true }),
                    ...(newArrivalFormat && { arrival_format: newArrivalFormat }),
                    ...(typeVal && { type: typeVal })
                };
            else return state;
        });
        return filteredData;
    });
    setAnchorEl(null);
}

const resetSuggestionResolve = (
    row: any, pageData: any, persistState: any,
    setFlattenedData: any, hasConflicts: boolean, setAnchorEl: any) => {
    const updatedValues = { ...row };
    const storeState = _.cloneDeep(pageData);
    const data = _.map(storeState, state => {
        if (_.get(state, 'column') === _.get(updatedValues, 'originalColumn'))
            return { ...state, ...updatedValues, column: updatedValues.originalColumn, isModified: true, ...(hasConflicts && { resolved: false }) };
        else return state
    });
    persistState(data);
    setFlattenedData((preState: Array<Record<string, any>>) => {
        const filteredData = _.map(preState, state => {
            if (_.get(state, 'column') === _.get(updatedValues, 'originalColumn'))
                return { ...state, ...updatedValues, column: updatedValues.originalColumn, isModified: true, ...(hasConflicts && { resolved: false }) };
            else return state;
        });
        return filteredData;
    });
    setAnchorEl(null);
}

const updateFormatType = (
    val: string, row: any, pageData: any, persistState: any,
    setFlattenedData: any, dataMappings: any, hasConflicts: boolean, setAnchorEl: any) => {

    const storageFormats = _.get(dataMappings, [val, 'store_format'])
    const isSingleStorageFormat = _.size(storageFormats) === 1 ? true : false
    const newValue = isSingleStorageFormat ? _.keys(storageFormats)[0] : defaultFormatToDataTypeMapping[val]
    const typeValue = _.get(dataMappings, [val, 'store_format', newValue, 'jsonSchema'])
    const updatedValues = { ...row };
    const storeState = _.cloneDeep(pageData);
    const data = _.map(storeState, state => {
        if (_.get(state, 'column') === _.get(updatedValues, 'originalColumn'))
            return {
                ...state, ...updatedValues, column: updatedValues.originalColumn, isModified: true, arrival_format: val, ...(hasConflicts && row?.oneof && { resolved: true }),
                ...(newValue && { data_type: newValue }), ...(typeValue && { type: typeValue })
            };
        else return state
    });
    persistState(data);
    setFlattenedData((preState: Array<Record<string, any>>) => {
        const filteredData = _.map(preState, state => {
            if (_.get(state, 'column') === _.get(updatedValues, 'originalColumn'))
                return {
                    ...state, ...updatedValues, column: updatedValues.originalColumn, isModified: true, arrival_format: val, ...(hasConflicts && row?.oneof && { resolved: true }),
                    ...(newValue && { data_type: newValue }), ...(typeValue && { type: typeValue })
                };
            else return state;
        });
        return filteredData;
    });
    setAnchorEl(null)
}

const isValidTimestamp = (value: any) => {
    const dataType = typeof value;
    switch (dataType) {
        case 'string':
            const epochRegex = /^\d+$/ig;
            if (epochRegex.test(value)) {
                const parsedValue = parseInt(value, 10);
                // Timestamp should be greater than Jan 01 2000 00:00:00 UTC/GMT in seconds
                return {
                    isValidTimestamp: parsedValue >= 946684800 && moment(parsedValue).isValid(),
                    type: "epoch"
                }
            } else {
                const isValidTimestamp = moment(value, DATE_FORMATS, true).isValid();
                return {
                    isValidTimestamp,
                    type: isValidTimestamp ? "date-time" : "string"
                }
            }
        case 'number':
            // Timestamp should be greater than Jan 01 2000 00:00:00 UTC/GMT in seconds
            const isValidTimestamp = value >= 946684800 && moment(value).isValid();
            let outType = "";
            if (isValidTimestamp) {
                outType = "epoch";
            } else {
                outType = Number.isInteger(value) ? "integer" : "double";
            }
            return {
                isValidTimestamp,
                type: outType
            };
        default:
            return {
                isValidTimestamp: false,
                type: ""
            };
    }
}

const evaluateDataType = async (jsonAtaExpression: string, sampleJsonData: any, jsonSchema: any) => {
    let data: any = {};
    _.map(sampleJsonData, (item: any) => {
        data = _.merge(data, item)
    });

    try {
        const ata: any = JSONata(jsonAtaExpression);
        const sampleData = !_.isEmpty(sampleJsonData) ? JSON.parse(sampleJsonData) : data;
        const evaluatedData = await ata.evaluate(sampleData);
        const tsCheck = isValidTimestamp(evaluatedData);
        switch (true) {
            case !evaluatedData:
                throw Error(en["noMatchTransformation"]);
            case evaluatedData?.sequence:
                return { data_type: 'array', schema_type: 'array' };
            case tsCheck?.isValidTimestamp:
                return { data_type: tsCheck.type, schema_type: typeof evaluatedData };
            case _.isString(evaluatedData):
                return { data_type: tsCheck.type, schema_type: typeof evaluatedData };
            case _.isFinite(evaluatedData):
                return { data_type: Number.isInteger(evaluatedData) ? 'long' : 'double', schema_type: Number.isInteger(evaluatedData) ? 'integer' : 'number' };
            case evaluatedData == true || evaluatedData == false:
                return { data_type: 'boolean', schema_type: 'boolean' };
            case _.isObject(evaluatedData):
                return { data_type: 'object', schema_type: 'object' };
            default:
                return { data_type: 'string', schema_type: 'string' };
        }
    } catch (err: any) {
        throw Error(err?.message || en["invalidTransformation"]);
    }
}

export { updateDataType, resetSuggestionResolve, updateFormatType, isValidTimestamp, evaluateDataType };
