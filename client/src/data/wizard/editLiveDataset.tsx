import * as yup from "yup";
import en from 'utils/locales/en.json';
import * as _ from "lodash";
import { hasSpacesInField, hasSpecialCharacters, invalidNewFieldRegex } from "services/utils";

export const inputFields = (flattenedData: any[], arrivalFormat = "", fieldPath = '', datamappings: any) => {
    const filteredData = _.filter(flattenedData, { data_type: "object" });
    const defaultOption = [{ label: "$", value: "$.(root)" }];
    const dataTypeStoreFormat: any = [];
    Object.keys(datamappings).forEach(arrivalType => {
        const arrivalFormatOptions = datamappings[arrivalType].arrival_format;

        arrivalFormatOptions.forEach((arrivalFormat: any) => {
            const storeFormatOptions: any = Object.keys(datamappings[arrivalType].store_format || {});

            dataTypeStoreFormat.push({
                label: arrivalFormat,
                value: arrivalFormat,
                arrivalType: arrivalType.toLowerCase(),
                storeFormatOptions: storeFormatOptions.map((storeFormat: any) => ({
                    label: storeFormat,
                    value: storeFormat,
                })),
            });
        });
    });

    function extractMainKeys(object: Record<string, any>): { label: string; value: string }[] {
        return Object.keys(object).map(key => ({
            label: key,
            value: key,
        }));
    }

    const arrivalType: any[] = extractMainKeys(datamappings).map(item => item);
    const dataTypeOptions: any[] = dataTypeStoreFormat.filter((option: any) => option.arrivalType === arrivalFormat);

    return [
        {
            title: "EditLiveDatasetInputs",
            fields: [
                {
                    title: "Field path",
                    fields: [{
                        name: "field",
                        label: "Field path",
                        type: 'select',
                        selectOptions: _.concat(defaultOption, _.map(filteredData, (ele: any) => ({
                            label: `$.${ele?.column}`,
                            value: `${ele?.column}`
                        }))),
                        required: true,
                        validationSchema: yup.string().required(en.isRequired)
                    },
                    {
                        name: "newfield",
                        label: "New field",
                        tooltip: "Enter name of new field",
                        type: 'text',
                        required: true,
                        validationSchema: yup.string().required(en.isRequired)
                        .test("invalidFieldName", en.newFieldInvalid, (value: any) => hasSpecialCharacters(value, invalidNewFieldRegex))
                        .test('spaceInField', en.containsSpaces, value => hasSpacesInField(value))
                    }],
                },
                {
                    title: "Arrival format and Data type",
                    fields: [
                        {
                            name: "arrivalformat",
                            label: "Arrival format",
                            type: 'select',
                            selectOptions: arrivalType,
                            required: true,
                            validationSchema: yup.string().required(en.isRequired)
                        },
                        {
                            title: "Data Type",
                            name: "datatype",
                            label: "Data type",
                            type: 'select',
                            selectOptions: !_.isEmpty(dataTypeOptions) ? dataTypeOptions[0].storeFormatOptions : dataTypeStoreFormat,
                            required: true,
                            validationSchema: yup.string().required(en.isRequired)
                        }
                    ],
                },
            ]
        }
    ]
}