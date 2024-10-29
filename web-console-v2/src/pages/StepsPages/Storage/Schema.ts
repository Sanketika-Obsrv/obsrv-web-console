import { UiSchema, RJSFSchema } from '@rjsf/utils';
import { CustomCheckboxWidget } from 'components/CheckboxWithInfoIcon/CheckboxWithInfoIcon';

// Define the custom schema interface extending RJSFSchema
export interface CustomSchema extends RJSFSchema {
    enumDescriptions?: { [key: string]: string }; // Ensure enumDescriptions is a string indexable object
}

export const STORE_TYPE = {
    LAKEHOUSE: 'Lakehouse',
    REAL_TIME_STORE: 'Real-time Store',
    CACHE: 'Cache'
};

interface FormSchema {
    title: string;
    schema: CustomSchema;
    uiSchema: UiSchema;
}

const schema: FormSchema =
{
    title: 'Storage',
    schema: {
        type: 'object',
        properties: {
            section1: {
                title: 'Dataset Type',
                type: 'object',
                properties: {
                    datasetType: {
                        type: 'string',
                        enum: ['Events', 'Transactional', 'Master']
                    }
                }
            },
            section2: {
                title: 'Storage Type',
                type: 'object',
                properties: {
                    storageType: {
                        type: 'array',
                        items: {
                            type: 'string',
                            enum: [
                                STORE_TYPE.LAKEHOUSE,
                                STORE_TYPE.REAL_TIME_STORE,
                                STORE_TYPE.CACHE
                            ],
                            enumLables: [STORE_TYPE.REAL_TIME_STORE]
                        },
                        uniqueItems: true
                    }
                }
            },
            section3: {
                title: 'Indexing Config',
                type: 'object',
                properties: {
                    primary: {
                        title: 'Primary Key',
                        type: 'string',
                        enum: [''],
                        uniqueItems: true
                    },
                    timestamp: {
                        title: 'Timestamp Key',
                        type: 'string',
                        enum: [''],
                        uniqueItems: true
                    },
                    partition: {
                        title: 'Partition Key',
                        type: 'string',
                        enum: [''],
                        uniqueItems: true
                    }
                }
            }
        }
    } as CustomSchema,
    uiSchema: {
        'ui:submitButtonOptions': {
            norender: true
        },
        section1: {
            'ui:submitButtonOptions': {
                norender: true
            },
            datasetType: {
                'ui:widget': 'radio',
                'ui:options': {
                    inline: true,
                    label: false
                }
            }
        },
        section2: {
            'ui:submitButtonOptions': {
                norender: true
            },
            storageType: {
                'ui:widget': CustomCheckboxWidget,
                'ui:options': {
                    inline: true,
                    enumDescriptions: {
                        [STORE_TYPE.REAL_TIME_STORE]: 'Real-time store is append only'
                    }
                }
            }
        },
        section3: {
            'ui:submitButtonOptions': {
                norender: true
            },
            primary: {
                'ui:widget': 'select'
            },
            timestamp: {
                'ui:widget': 'select'
            },
            partition: {
                'ui:widget': 'select'
            }
        }
    }
};

export default schema;