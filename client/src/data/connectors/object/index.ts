import * as yup from "yup";
import en from 'utils/locales/en.json'

const objectStoreSource = [
    {
        name: "source",
        label: "Cloud Service",
        type: 'autocomplete',
        selectOptions: [{ label: "AWS", value: "aws" }],
        required: true,
        validationSchema: yup.string().required(en.isRequired)
    },
    {
        name: "type",
        label: "Storage Service",
        type: 'select',
        dependsOn: {
            key: "source",
            value: "aws"
        },
        selectOptions: [{ label: "S3", value: "s3" }],
        required: true,
        validationSchema: yup.string().required(en.isRequired)
    }
]

export const objectStoreForm = [
    {
        title: "Storage Source",
        formField: objectStoreSource
    }
]