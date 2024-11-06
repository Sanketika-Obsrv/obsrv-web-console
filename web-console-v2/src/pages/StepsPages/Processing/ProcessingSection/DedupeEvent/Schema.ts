import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { CustomCheckboxWidget } from 'components/CheckboxWithInfoIcon/CheckboxWithInfoIcon';

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
            section1: {
                title: '',
                type: 'object',
                properties: {
                    dropDuplicates: {
                        type: 'array',
                        items: {
                            type: 'string',
                            enum: ['Enable Deduplication']
                        },
                        uniqueItems: true
                    },
                    dedupeKey: {
                        type: 'string',
                        title: 'Select Dedupe Key',
                        enum: [''],
                        uniqueItems: true
                    }
                }
            }
        }
    },
    uiSchema: {
        'ui:submitButtonOptions': {
            norender: true
        },
        section1: {
            'ui:submitButtonOptions': {
                norender: true
            },
            dropDuplicates: {
                'ui:widget': CustomCheckboxWidget,
                'ui:options': {
                    inline: true
                }
            },
            dedupeKey: {
                'ui:widget': 'select',
                'ui:help': 'Select a unique event id from the list of fields'
            }
        }
    }
};

export default schema;