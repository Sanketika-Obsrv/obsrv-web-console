import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { processData } from '../../Constant';

interface FormSchema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

const initialOptions = [''];

const schema: FormSchema =
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
                        title: processData.section1Properties.selectFiled,
                        enum: initialOptions,
                        type: 'string',
                        uniqueItems: true
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
                            }
                        ]
                    },
                    transformationMode: {
                        type: 'string',
                        title: processData.section2Properties.mode,
                        enum: ['Strict', 'Lenient']
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
            transformationMode: {
                'ui:widget': 'radio',
                'ui:options': {
                    inline: true,
                    label: true
                }
            }
        }
    }
};

export default schema;