import { RJSFSchema, UiSchema } from '@rjsf/utils';
import RadioWithInfoIcon from 'components/RadioWithInfoIcon/RadioWithInfoIcon';

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
                    title: '',
                    type: 'object',
                    properties: {
                        validation: {
                            type: 'string',
                            oneOf: [
                                {
                                    title: 'Strict',
                                    enum: ['Strict']
                                },
                                {
                                    title: 'Discard New Fields',
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
                        'Strict data validation of all fields data will be marked as invalid if not adhering to schema,Validate only known fields, skip unknown fields'
                }
            }
        }
    }
];

export default schemas;
