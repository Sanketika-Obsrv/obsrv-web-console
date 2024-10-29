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
                    dataset: {
                        title: processData.section5Properties.dataset,
                        type: 'string',
                        enum: initialOptions
                    },
                    transformation: {
                        title: processData.section5Properties.transformation,
                        type: 'string'
                    },
                    masterDataset: {
                        type: 'number',
                        title: processData.section5Properties.masterDataset
                    },
                    storeData: {
                        type: 'string',
                        title: processData.section5Properties.storeData
                    }
                },
                required: ['dataset', 'masterDataset', 'storeData']
            }
        }
    },
    uiSchema: {
        'ui:submitButtonOptions': {
            norender: true
        },
        section: {
            transformationType: {
                'ui:widget': 'text'
            },
            transformation: {
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