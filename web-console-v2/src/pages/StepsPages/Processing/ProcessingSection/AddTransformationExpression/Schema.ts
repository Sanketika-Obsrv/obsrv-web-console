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
                        title: processData.section2Properties.selectFiled,
                        enum: initialOptions,
                        type: 'string',
                        uniqueItems: true
                    },
                    expression: {
                        type: 'string',
                        title: processData.section2Properties.selectTransform
                    },
                    transformationMode: {
                        type: 'string',
                        title: processData.section2Properties.mode,
                        default: "Strict",
                        oneOf: [
                            {
                                title: 'Yes',
                                enum: ['Strict']
                            },
                            {
                                title: 'No',
                                enum: ['Lenient']
                            }
                        ]
                    }
                },
                required: ['transformations', 'expression', 'transformationMode']
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
};

export default schema;
