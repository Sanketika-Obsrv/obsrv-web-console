import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { processData } from '../../Constant';

interface FormSchema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

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
                        title: processData.section3Properties.newField,
                        type: 'string'
                    },
                    transformationType: {
                        type: 'string',
                        title: processData.section3Properties.selectDatasetField
                    },
                    transformationMode: {
                        type: 'string',
                        title: processData.section3Properties.mode,
                        default: 'Strict',
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
                required: ['transformations', 'transformationType']
            }
        }
    },
    uiSchema: {
        'ui:submitButtonOptions': {
            norender: true
        },
        section: {
            'ui:submitButtonOptions': {
                norender: true
            },
            transformationType: {
                'ui:widget': 'text'
            },
            transformationExp: {
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