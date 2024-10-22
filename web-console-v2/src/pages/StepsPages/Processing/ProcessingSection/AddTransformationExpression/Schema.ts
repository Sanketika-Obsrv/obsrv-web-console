import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { processData } from '../../Constant';

interface FormSchema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

const initialOptions = [''];

const schemas: FormSchema[] = [
    {
        title: '',
        schema: {
            type: 'object',
            properties: {
                section: {
                    title: '',
                    type: 'object',
                    properties: {
                        transformations: {
                            title: processData.section2Properties.selectFiled,
                            enum: initialOptions,
                            type: 'string',
                            uniqueItems: true
                        },
                        transformationMode: {
                            type: 'string',
                            title: processData.section2Properties.mode,
                            enum: ['Strict', 'Lenient']
                        },
                        transformationType: {
                            type: 'string',
                            title: processData.section2Properties.selectTransform,
                            oneOf: [
                                {
                                    title: 'Mask',
                                    enum: ['mask']
                                },
                                {
                                    title: 'Encrypt',
                                    enum: ['encrypt']
                                },
                                {
                                    title: 'Jsonata',
                                    enum: ['jsonata']
                                }
                            ]
                        }
                    },
                    dependencies: {
                        transformationType: {
                            oneOf: [
                                {
                                    properties: {
                                        transformationType: {
                                            oneOf: [
                                                {
                                                    title: 'Jsonata',
                                                    enum: ['jsonata']
                                                }
                                            ]
                                        },
                                        expression: {
                                            type: 'string',
                                            title: 'Add Custom Expression'
                                        }
                                    }
                                },
                                {
                                    properties: {
                                        transformationType: {
                                            oneOf: [
                                                {
                                                    title: 'Mask',
                                                    enum: ['mask']
                                                },
                                                {
                                                    title: 'Encrypt',
                                                    enum: ['encrypt']
                                                },
                                                {
                                                    title: 'SQL expression',
                                                    enum: ['sqlExpression']
                                                }
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    required: ['transformations', 'transformationType', 'transformationMode']
                }
            }
        },
        uiSchema: {
            'ui:submitButtonOptions': {
                norender: true
            },
            section: {
                transformations: {
                    'ui:widget': 'select'
                },
                transformationType: {
                    'ui:widget': 'radio',
                    'ui:options': {
                        inline: true,
                        label: true
                    }
                },
                expression: {
                    'ui:widget': 'text',
                    'ui:help': 'Ex: $sum(Product.(Price * Quantity)) \n FirstName & " " & Surname'
                },
                transformationMode: {
                    'ui:widget': 'radio',
                    'ui:options': {
                        inline: true,
                        label: true
                    }
                }
            }
        }
    }
];

export default schemas;
