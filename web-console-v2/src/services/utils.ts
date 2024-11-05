import moment from 'moment';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { AxiosResponse } from 'axios';
import { fetchSessionStorageItem, storeSessionStorageItem } from 'utils/sessionStorage';
import { DatasetType } from 'types/datasets';
export const charsRegEx = /[!@#$%^&*()+{}\\[\]:;<>,?~\\|]/;

export const hasSpecialCharacters = (value: string | undefined, regex: RegExp = charsRegEx) => {
    if (!value || !regex) return false;
    return regex.test(value);
};

export const spaceValidationRegEx = /(\s)/;

export const invalidNewFieldRegex = /^(?![!@#$%^&*()_ +=\-[\]{};':"\\|,.<>/?`~]+$).*/;

export const nameRegex = /^[a-zA-Z0-9._-]+$/;

export const hasSpacesInField = (
    value: string | undefined,
    regex: RegExp = spaceValidationRegEx
) => {
    if (!value || !regex) return false;
    return !regex.test(value);
};

export const validFieldName = (
    value: string | undefined,
    regex: RegExp = nameRegex
) => {
    if (!value || !regex) return false;
    return regex.test(value);
};

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

export const readJsonFileContents = (file: File) => {
    return new Promise((resolve, reject) => {
        if (file.type === 'application/json') {
            const reader = new FileReader();

            reader.addEventListener('loadend', function () {
                const fileContents = reader.result;

                if (typeof fileContents === 'string') {
                    try {
                        return resolve(JSON.parse(fileContents));
                    } catch (err) {
                        console.log(err);
                    }

                    const lines = fileContents.split(/\r?\n/);

                    const jsonArray: any[] = [];

                    lines.forEach(function (line) {
                        try {
                            jsonArray.push(JSON.parse(line));
                        } catch (err: any) {
                            console.log(err);
                        }
                    });

                    resolve(jsonArray);
                } else {
                    reject('Invalid file contents');
                }
            });

            reader.readAsText(file);
        } else {
            reject('Only json files are supported');
        }
    });
};

export const generateRequestBody = (configs: Record<string, any>) => {
    const { apiId, request } = configs;

    return {
        id: apiId,
        ver: 'v2',
        ts: moment().format(),
        params: {
            msgid: uuid()
        },
        request: request
    };
};

export const getDatasetType = (type: boolean) => {
    const isMaster = {
        true: DatasetType.MasterDataset
    };
    return _.get(isMaster, _.toString(type)) || DatasetType.Dataset;
};

export const setVersionKey = (value: number) => {
    const configDetailKey = 'configDetails';

    const configDetail = fetchSessionStorageItem(configDetailKey) || {};

    _.set(configDetail, 'version_key', String(value));

    storeSessionStorageItem(configDetailKey, configDetail);
};

export const transformResponse = (response: AxiosResponse) => _.get(response, ['data', 'result']);

export const transformAlertDescription = (payload: Record<string, any>) => {
    const { description = '', labels = {} } = payload;

    if (!description) return;

    let alertDescription = description;

    _.keys(labels).forEach((key) => {
        const templateVariable = `{{ \\$\\$labels\\.${key} }}`;

        const regex = new RegExp(templateVariable, 'g');

        alertDescription = alertDescription?.replace(regex, labels[key]);
    });

    return alertDescription;
};

export const flattenObject = (obj: Record<string, any>, parentKey = '') => {
    let flattenedData: Array<Record<string, any>> = [];

    for (const [key, value] of Object.entries(obj)) {
        const currentKey = parentKey ? `${parentKey}.${key}` : key;
        if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const item = value[i];
                if (typeof item === 'object' && item !== null) {
                    flattenedData = flattenedData.concat(
                        flattenObject(item, `${currentKey}[${i}]`)
                    );
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
};

const getTransformationType = (value: Record<string, any>) => {
    const { metadata } = value || {};
    const transformationType = {
        pii: 'PII',
        transformation: 'Transformations',
        additionalFields: 'Derived'
    };
    return _.get(transformationType, _.get(metadata, 'section')) || '';
};

export const getSectionDetails = (row: Record<string, any>) => {
    const { type, name, value } = row || {};
    const section = {
        timestamp: 'Fields [ Timestamp ]',
        validation: 'Processing [ Data Validation ]',
        denorm: 'Processing [ Data Denormalization ]',
        dedup: 'Processing [ Dedupe Events ]',
        transformations: `Fields [ ${getTransformationType(value)} ]`,
        dataSource: 'Input [ Data Sources ]',
        dataFormat: 'Input [ Data Formats ]',
        dataSchema: 'Data Schema'
    };
    return _.get(section, type) || '';
}

export const generateDatesBetweenInterval = (start: any, end: any) => {
  const diffInMinutes = start.diff(end, 'minute');
  const datesBetween = [];

  for (let i = 0; i <= diffInMinutes; i += 5) {
    datesBetween.push(start.subtract(i, 'minute').unix());
  }

  return datesBetween;
};
