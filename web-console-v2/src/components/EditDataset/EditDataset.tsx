import * as yup from 'yup';
import en from '../../utils/locales/en.json';
import * as _ from 'lodash';
import { hasSpacesInField, hasSpecialCharacters, invalidNewFieldRegex } from '../../services/utils';
import { validFormatTypes } from 'pages/StepsPages/Ingestion/SchemaDetails/SchemaDetails';
export const filterForObjectArrivalFormat = (data: any[]) => {
    const result: any[] = [];

    const checkSubRows = (row: { subRows: any[] }) => {
        // Check if the current row has arrival_format as 'object'
        if (_.get(row, 'arrival_format') === 'object') {
            result.push(row);
        }

        // If the row has subRows, recursively check them
        if (row.subRows && row.subRows.length > 0) {
            row.subRows.forEach((subRow: any) => checkSubRows(subRow));
        }
    };

    // Loop through the top-level rows in flattenedData
    data.forEach((row: any) => {
        checkSubRows(row);
    });

    return result;
};

// Usage

export const inputFields = (
    flattenedData: any[],
    arrivalFormat = '',
    fieldPath = '',
    datamappings: any
) => {
    const filteredData = filterForObjectArrivalFormat(flattenedData);
    const defaultOption = [{ label: '$', value: '$.(root)' }];
    const dataTypeStoreFormat: any = [];
    Object.keys(datamappings).forEach((arrivalType) => {
        const arrivalFormatOptions = datamappings[arrivalType].arrival_format;

        arrivalFormatOptions.forEach((arrivalFormat: any) => {
            const storeFormatOptions: any = Object.keys(
                datamappings[arrivalType].store_format || {}
            );

            dataTypeStoreFormat.push({
                label: arrivalFormat,
                value: arrivalFormat,
                arrivalType: arrivalType.toLowerCase(),
                storeFormatOptions: storeFormatOptions.map((storeFormat: any) => ({
                    label: storeFormat,
                    value: storeFormat
                }))
            });
        });
    });

    function extractMainKeys(object: Record<string, any>): { label: string; value: string }[] {
        return Object.keys(object).map((key) => ({
            label: key,
            value: key
        }));
    }

    const defaultDatatypeOptions = validFormatTypes.map((item) => ({
        label: item,
        value: item
    }));

    const arrivalType: any[] = extractMainKeys(datamappings).map((item) => item);
    const dataTypeOptions: any[] = dataTypeStoreFormat.filter(
        (option: any) => option.arrivalType === arrivalFormat
    );

    const arrivalTypeOptions = arrivalType.length <= 0 ? defaultDatatypeOptions : arrivalType;
    const nameRegex = /^[^!@#$%^&()+{}[]:;<>,?~\|]$/;
    
    return [
        {
            title: 'EditLiveDatasetInputs',
            fields: [
                {
                    title: 'Field path',
                    fields: [
                        {
                            name: 'field',
                            label: 'Field path',
                            type: 'select',
                            selectOptions: _.concat(
                                defaultOption,
                                _.map(filteredData, (ele: any) => ({
                                    label: `$.${ele?.column}`,
                                    value: `${ele?.column || ''}`
                                }))
                            ),
                            required: true,
                            validationSchema: yup.string().required(en.isRequired)
                        },
                        {
                            name: 'newfield',
                            label: 'New field',
                            tooltip: 'Enter name of new field',
                            type: 'text',
                            required: true,
                            validationSchema: yup
                                .string()
                                .required(en.isRequired)
                                .test('invalidFieldName', en.newFieldInvalid, (value: any) =>
                                    hasSpecialCharacters(value, invalidNewFieldRegex)
                                )
                                .test('spaceInField', en.containsSpaces, (value) =>
                                    hasSpacesInField(value)
                                ).max(100, en.maxLen)
                                .min(4, en.minLen)
                                .test('validCharacters', "The field should exclude any special characters, permitting only '.', '-', '_', alphabets, numbers", (value) =>
                                    nameRegex.test(value)
                                )
                        }
                    ]
                },
                {
                    title: 'Arrival format and Data type',
                    fields: [
                        {
                            name: 'arrivalformat',
                            label: 'Arrival format',
                            type: 'select',
                            selectOptions: arrivalTypeOptions,
                            required: true,
                            validationSchema: yup.string().required(en.isRequired)
                        },
                        {
                            title: 'Data Type',
                            name: 'datatype',
                            label: 'Data type',
                            type: 'select',
                            selectOptions: !_.isEmpty(dataTypeOptions)
                                ? dataTypeOptions[0].storeFormatOptions
                                : dataTypeStoreFormat,
                            required: true,
                            validationSchema: yup.string().required(en.isRequired)
                        }
                    ]
                }
            ]
        }
    ];
};
