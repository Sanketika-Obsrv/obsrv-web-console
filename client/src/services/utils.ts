import _ from "lodash";
import moment from "moment";
import { DatasetType } from "types/datasets";
import { v4 as uuid } from 'uuid';

export const flattenObject = (obj: Record<string, any>, parentKey = '') => {
    let flattenedData: Array<Record<string, any>> = [];

    for (let [key, value] of Object.entries(obj)) {
        let currentKey = parentKey ? `${parentKey}.${key}` : key;
        if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                let item = value[i];
                if (typeof item === 'object' && item !== null) {
                    flattenedData = flattenedData.concat(flattenObject(item, `${currentKey}[${i}]`));
                } else {
                    flattenedData.push({ key: `${currentKey}[${i}]`, value: item });
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            flattenedData = flattenedData.concat(flattenObject(value, currentKey));
        } else {
            flattenedData.push({ key: currentKey, value });
        }
    }

    return flattenedData;
}


export const readJsonFileContents = (file: File) => {
    return new Promise((resolve, reject) => {
        if (file.type === 'application/json') {
            const reader = new FileReader();
            reader.addEventListener('loadend', function () {
                const fileContents = reader.result;
                if (typeof fileContents === 'string') {
                    try {
                        return resolve(JSON.parse(fileContents));
                    } catch (err) { }
                    const lines = fileContents.split(/\r?\n/);
                    let jsonArray: any[] = [];
                    lines.forEach(function (line) {
                        try {
                            jsonArray.push(JSON.parse(line));
                        } catch (err: any) { }
                    });
                    resolve(jsonArray);
                } else {
                    reject("Invalid file contents");
                }
            });
            reader.readAsText(file);
        } else {
            reject('Only json files are supported');
        }
    })
}

export const downloadJSONFile = (data: any, filename: string) => {
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


export const generateDatesBetweenInterval = (start: any, end: any) => {
    const diffInMinutes = start.diff(end, 'minute');
    const datesBetween = [];

    for (let i = 0; i <= diffInMinutes; i += 5) {
        datesBetween.push(start.subtract(i, 'minute').unix());
    }

    return datesBetween;
}

export const charsRegEx = /[!@#$%^&*()+{}\[\]:;<>,?~\\|]/

export const hasSpecialCharacters = (value: string | undefined, regex: RegExp = charsRegEx) => {
    if (!value || !regex) return false;
    return regex.test(value);
}

export const spaceValidationRegEx = /(\s)/
export const doubleQuotesValidationRegEx = /["]/
export const singleDoubleQuotesValidationRegEx = /['"]/
export const s3BucketNameValidationRegex = /(?!(^xn--|^sthree-|.+--ol-s3$|.+-s3alias$))^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/
export const s3AccessKeyValidationRegEx = /^(ASIA|AKIA|AROA|AIDA)([A-Z0-9]+)$/
export const s3SecretKeyValidationRegEx = /^[a-zA-Z0-9+/=]*$/
export const jdbcHostValidationRegex = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?|localhost(?:\/[^\s]*)?|((?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/
export const jdbcPortValidationRegex = /^[0-9]*$/
export const kafkaTopicValidationRegex = /^[A-Za-z0-9-_.]*$/
export const kafkaBrokersValidationRegex = /^[A-Za-z0-9.:/,]*$/
export const invalidNewFieldRegex = /^(?![!@#$%^&*()_ +=\-[\]{};':"\\|,.<>/?`~]+$).*/

export const hasSpacesInField = (value: string | undefined, regex: RegExp = spaceValidationRegEx) => {
    if (!value || !regex) return false;
    return !regex.test(value);
}

export const getDatasetType = (type: boolean) => {
    const isMaster = {
        true: DatasetType.MasterDataset
    }
    return _.get(isMaster, _.toString(type)) || DatasetType.Dataset
}

export const transformAlertDescription = (payload: Record<string, any>) => {
    const { description = "", labels = {} } = payload;
    if (!description) return;
    let alertDescription = description;

    _.keys(labels).forEach((key) => {
        const templateVariable = `{{ \\$\\$labels\\.${key} }}`;
        const regex = new RegExp(templateVariable, 'g');
        alertDescription = alertDescription?.replace(regex, labels[key]);
    });
    return alertDescription;
}

export const validateFormValues = async (form: React.MutableRefObject<any>, value: Record<string, any>) => {
    let validationStatus = true;
    if (form.current) {
        const formikReference = form.current as any;
        for (const field in value) {
            formikReference.setFieldTouched(field)
        }
        const validationState = await formikReference.validateForm(value);
        validationStatus = _.size(validationState) === 0;
    }

    return validationStatus;
}

const getTransformationType = (value: Record<string, any>) => {
    const { metadata } = value || {};
    const transformationType = {
        pii: "PII",
        transformation: "Transformations",
        additionalFields: "Derived"
    }
    return _.get(transformationType, _.get(metadata, "section")) || ""
}

export const getSectionDetails = (row: Record<string, any>) => {
    const { type, name, value } = row || {}
    const section = {
        timestamp: "Fields [ Timestamp ]",
        validation: "Processing [ Data Validation ]",
        denorm: "Processing [ Data Denormalization ]",
        dedup: "Processing [ Dedupe Events ]",
        transformations: `Fields [ ${getTransformationType(value)} ]`,
        dataSource: "Input [ Data Sources ]",
        dataFormat: "Input [ Data Formats ]",
        dataSchema: "Data Schema"
    }
    return _.get(section, type) || "";
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