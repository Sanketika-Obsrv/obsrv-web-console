import * as yup from "yup";
import en from 'utils/locales/en.json'
import S3uthMechanismDescription from "./s3AuthMechDescription";
import { hasSpecialCharacters, s3AccessKeyValidationRegEx, s3BucketNameValidationRegex, s3SecretKeyValidationRegEx, singleDoubleQuotesValidationRegEx } from "services/utils";

export const s3StoreConfigsForm = [
    {
        title: "Configurations",
        fields: [
            {
                title: "Bucket Configuration",
                fields: [{
                    name: "bucket",
                    label: "Bucket Name",
                    tooltip: "Enter the Source Bucket Name",
                    type: 'text',
                    required: true,
                    validationSchema: yup.string().required(en.isRequired).min(3).max(63).test('invalidBucket', en.bucketNameInvalid, value => hasSpecialCharacters(value, s3BucketNameValidationRegex))
                },
                {
                    name: "prefix",
                    label: "Prefix",
                    tooltip: "Enter the prefix for bucket name",
                    type: 'text',
                    required: false,
                    validationSchema: yup.string().optional().trim(en.whiteSpaceConflict).strict(true).test("validateInvertedComma", en.singleDoubleQuotesInvalid, (value: any) => {
                        return !singleDoubleQuotesValidationRegEx.test(value)
                    })
                }]
            },
            {
                title: "Polling Interval",
                fields: [
                    {
                        name: "pollingIntervalType",
                        label: "Polling Interval",
                        type: 'select',
                        selectOptions: [{ label: "Periodic", value: "periodic" }],
                        required: true,
                        validationSchema: yup.string().required(en.isRequired)
                    }
                ]
            },
            {
                title: "Authentication Mechanism",
                description: (bucket_name: string) => {
                    return <S3uthMechanismDescription bucket_name={bucket_name} />
                },
                fields: [{
                    name: "authType",
                    label: "Authentication Type",
                    type: 'select',
                    selectOptions: [{ label: "Credentials", value: "credentials" }],
                    required: true,
                    validationSchema: yup.string().required(en.isRequired)
                }]
            },
            {
                title: "File Configuration",
                fields: [{
                    name: "fileFormatType",
                    label: "File Format",
                    type: 'select',
                    selectOptions: [{ label: "JSON Lines", value: "jsonl" }],
                    required: true,
                    validationSchema: yup.string().required(en.isRequired)
                }]
            }
        ]
    }
]

export const s3ConfigsAdditionalFields = [
    {
        field: "pollingIntervalType",
        value: "periodic",
        formField: [{
            name: "schedule",
            label: "Schedule",
            type: 'select',
            selectOptions: [{ value: "hourly", label: "Hourly" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }],
            required: true,
            validationSchema: yup.string().required(en.isRequired)
        }]
    },
    {
        field: "authType",
        value: "credentials",
        formField: [{
            name: "access_key",
            label: "Access Key",
            tooltip: "Enter the Access Key",
            type: 'password',
            required: true,
            validationSchema: yup.string().required(en.isRequired).max(20).test('invalidAccessKey', en.accessKeyInvalid, value => hasSpecialCharacters(value, s3AccessKeyValidationRegEx))
        },
        {
            name: "secret_key",
            label: "Secret Key",
            tooltip: "Enter the Secret Key",
            type: 'password',
            required: true,
            validationSchema: yup.string().required(en.isRequired).max(40).test('invalidSecretKey', en.secretKeyInvalid, value => hasSpecialCharacters(value, s3SecretKeyValidationRegEx))
        },
        {
            name: "region",
            label: "Region",
            type: 'select',
            selectOptions: [{ label: "us-east-1 (N. Virginia)", value: "us-east-1" },
            { label: "us-east-2 (Ohio)", value: "us-east-2" },
            { label: "us-west-1 (N. California)", value: "us-west-1" },
            { label: "us-west-2 (Oregon)", value: "us-west-2" },
            { label: "ap-south-1 (Mumbai)", value: "ap-south-1" },
            { label: "ap-northeast-1 (Toyko)", value: "ap-northeast-1" },
            { label: "ap-northeast-2 (Seoul)", value: "ap-northeast-2" },
            { label: "ap-northeast-3 (Osaka)", value: "ap-northeast-3" },
            { label: "ap-southeast-1 (Singapore)", value: "ap-southeast-1" },
            { label: "ap-southeast-2 (Sydney)", value: "ap-southeast-2" },
            { label: "ap-east-1 (HongKong)", value: "ap-east-1" },
            { label: "ap-southeast-3 (Jakarta)", value: "ap-southeast-3" },
            { label: "ap-southeast-4 (Melbourne)", value: "ap-southeast-4" },
            { label: "ca-central-1 (Central)", value: "ca-central-1" },
            { label: "eu-central-1 (Frankfurt)", value: "eu-central-1" },
            { label: "eu-west-1 (Ireland)", value: "eu-west-1" },
            { label: "eu-west-2 (London)", value: "eu-west-2" },
            { label: "eu-west-3 (Paris)", value: "eu-west-3" },
            { label: "eu-north-1 (Stockholm)", value: "eu-north-1" },
            { label: "eu-south-1 (Milan)", value: "eu-south-1" },
            { label: "eu-south-2 (Spain)", value: "eu-south-2" },
            { label: "eu-central-2 (Zurich)", value: "eu-central-2" },
            { label: "sa-east-1 (Sao Paulo)", value: "sa-east-1" },
            { label: "af-south-1 (Cape Town)", value: "af-south-1" },
            { label: "me-south-1 (Bahrain)", value: "me-south-1" },
            { label: "me-central-1 (UAE)", value: "me-central-1" },
            { label: "il-central-1 (Tel Aviv)", value: "il-central-1" }],
            required: true,
            validationSchema: yup.string().required(en.isRequired)
        }]
    },
    {
        field: "authType",
        value: "serviceAccount",
        formField: [{
            name: "account_name",
            label: "Name",
            tooltip: "Enter the Service Account Name",
            type: 'text',
            required: true,
            validationSchema: yup.string().required(en.isRequired)
        }]
    }
]