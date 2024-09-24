import ConditionalForm from "pages/dataset/wizard/components/ConditionalForm";
import { forms } from 'data/forms';
import * as _ from 'lodash';
import { flattenSchema } from "services/json-schema";
import ConditionalCheckboxForm from "pages/dataset/wizard/components/ConditionalCheckboxBasedForm";
import DataDenorm from "pages/dataset/wizard/components/DataDenormalization";

const dedupeQues = {
    question: {
        name: "dedupe",
        label: "Dedupe Events ?",
        type: 'checkbox',
        required: true,
        selectOptions: [{
            label: 'Enable Deduplication',
            value: 'yes'
        }],
    },
    options: {
        yes: {
            dedupOptions: true,
            form: forms.input_dedupe,
            description: "Select Dedupe properties"
        },
        no: {
            form: null,
            description: null
        }
    }
}

const dataValidation = {
    type: 'radio',
    justifyContents: 'flex-start',
    name: 'dataValidation',
    noChildForm: true,
    fields: [
        {
            name: "dataValidation",
            label: "Strict",
            value: "Strict",
            selected: true,
            required: true,
            disabled: false,
            description: "Strict data validation of all fields, data will be marked as invalid if not adhering to schema",
            form: null
        },
        {
            name: "dataValidation",
            label: "Discard New Fields",
            value: "IgnoreNewFields",
            required: true,
            disabled: false,
            form: null,
            description: "Validate only known fields, skip unknown fields",
        }
    ]
}

const transformer = (formMeta: Array<Record<string, any>>, context: Record<string, any>) => {
    const schema = _.get(context, 'redux.jsonSchema.data.schema');
    if (!schema) return formMeta;
    flattenSchema(schema);
    return formMeta;
}

export const sections = [
    {
        id: 'dataValidation',
        title: 'Data Validation',
        description: 'Data Validation Type',
        componentType: 'box',
        component: <ConditionalCheckboxForm pageId="processing"  {...dataValidation} />,
        navigation: {
            next: 'dedupe'
        }
    },
    {
        id: 'dedupe',
        title: 'Dedupe Events',
        description: 'Dedupe refers to the process of identifying and removing duplicate or redundant data entries within a dataset',
        component: <ConditionalForm pageId="processing" transform={transformer} {...dedupeQues} />,
        navigation: {
            next: 'denorm'
        }
    },
    {
        id: 'denorm',
        title: 'Data Denormalization',
        description: 'Data denormalization is a technique used in database design where the data in a database is intentionally made less normalized. In other words, instead of having data organized into many separate tables that are related to each other by keys, the data is combined into fewer tables.',
        component: <DataDenorm pageId="processing" />
    }
];
