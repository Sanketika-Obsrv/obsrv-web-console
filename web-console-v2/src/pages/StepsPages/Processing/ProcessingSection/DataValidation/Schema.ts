import { RJSFSchema, UiSchema } from '@rjsf/utils';
import RadioWithInfoIcon from 'components/RadioWithInfoIcon/RadioWithInfoIcon';

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
                    validation: {
                        type: 'string',
                        oneOf: [
                            {
                                title: 'No',
                                enum: ['Strict']
                            },
                            {
                                title: 'Yes',
                                enum: ['IgnoreNewFields']
                            }
                        ]
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
            validation: {
                'ui:widget': RadioWithInfoIcon,
                'ui:options': {
                    inline: true,
                    label: false
                },
                'ui:help':
                    'Processing will fail if any fields outside the schema are detected,Additional fields will be ignored and processing will continue'
            }
        }
    }
};

export default schema;