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
                'ui:help': 'Ex: $sum(Product.(Price * Quantity)) \n FirstName & " " & Surname'
            }
        }
    }
};

export default schema;