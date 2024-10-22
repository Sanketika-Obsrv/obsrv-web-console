import { RJSFSchema, UiSchema } from '@rjsf/utils';
interface FormSchema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}
const schemas: FormSchema[] = [
    {
        title: 'Configure Snowflake',
        schema: {
            type: 'object',
            properties: {
                section1: {
                    title: 'Configure Connector',
                    type: 'object',
                    properties: {
                        ipAddress: {
                            type: 'string',
                            title: 'IP Address',
                            pattern: '^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$'
                        },
                        credentials: {
                            type: 'string',
                            title: 'Credentials'
                        }
                    },
                    required: ['ipAddress', 'credentials']
                },
                section2: {
                    title: 'Connector Source Configuration',
                    type: 'object',
                    properties: {
                        table: {
                            type: 'string',
                            title: 'Table',
                            pattern: '^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$'
                        },
                        kafkaTopics: {
                            type: 'string',
                            title: 'Kafka Topics'
                        },
                        s3BucketName: {
                            type: 'string',
                            title: 'S3 Bucket Name'
                        },
                        field: {
                            type: 'string',
                            title: 'Field'
                        }
                    },
                    required: ['table', 'kafkaTopics', 's3BucketName', 'field']
                }
            },
            required: ['section1', 'section2']
        },
        uiSchema: {
            'ui:submitButtonOptions': {
                norender: true
            },
            section1: {
                'ui:submitButtonOptions': {
                    norender: true
                },
                ipAddress: {
                    'ui:placeholder': 'Enter IP address'
                },
                credentials: {
                    'ui:placeholder': 'Enter credentials'
                }
            },
            section2: {
                table: {
                    'ui:placeholder': 'Lorem ipsum'
                },
                kafkaTopics: {
                    'ui:placeholder': 'Lorem ipsum'
                },
                s3BucketName: {
                    'ui:placeholder': 'Lorem ipsum'
                },
                field: {
                    'ui:placeholder': 'Lorem ipsum'
                }
            }
        }
    }
];
export default schemas;
