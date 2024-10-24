import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { ingestionData } from './Constant';

interface FormSchema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

const schemas: FormSchema[] = [
    {
        title: '',
        schema: {
            type: 'object',
            properties: {
                section1: {
                    title: ingestionData.section1.title,
                    type: 'object',
                    properties: {
                        datasetName: {
                            type: 'string',
                            title: ingestionData.section1.datasetName.title,
                            pattern: ingestionData.section1.datasetName.pattern
                        },
                        datasetId: {
                            type: 'string',
                            title: ingestionData.section1.datasetId.title
                        }
                    },
                    required: ['datasetName', 'datasetId']
                }
            },
            required: ['section1']
        },
        uiSchema: {
            'ui:submitButtonOptions': {
                norender: true
            },
            section1: {
                'ui:submitButtonOptions': {
                    norender: true
                },
                datasetName: {
                    'ui:widget': 'text'
                },
                datasetId: {
                    'ui:widget': 'text'
                }
            }
        }
    }
];

export default schemas;