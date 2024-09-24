import * as yup from "yup";
import en from 'utils/locales/en.json'

export const validateDataForm = [
    {
        name: "validateType",
        label: "Validation Type",
        type: 'select',
        tooltip: "Select Appropriate validate type",
        selectOptions: [
            {
                label: 'Strict',
                value: 'strict'
            },
            {
                label: 'Ignore New Fields',
                value: 'ignore'
            },
            {
                label: 'Auto Index New Fields',
                value: 'auto'
            }
        ]
    }
]

export const dedupeForm = [
    {
        name: "dedupeKey",
        label: "Select Dedupe Field",
        type: 'autocomplete',
        tooltip: "Column based on which you want to enable the dedupe",
        required: true,
        validationSchema: yup.string().required(en.isRequired),
        selectOptions: [],
    },
]
