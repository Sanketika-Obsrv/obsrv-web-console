import InputAccordion from "pages/dataset/wizard/components/InputAccordion";
import TimestampSelection from "pages/dataset/wizard/components/TimestampSelection";
import AddNewField from "pages/dataset/wizard/components/transformationDialogs/AddNewField";
import AddTransformationExpression from "pages/dataset/wizard/components/transformationDialogs/AddTransformationExpression";
import AddPIIDialog from "pages/dataset/wizard/components/transformationDialogs/AddPII";

import { TransformationMode } from "types/datasets";

const actions = [{ label: 'Mask', component: '', value: 'mask' }, { label: 'Encrypt', component: '', value: 'encrypt' }];

const transformation_mode = [{ label: 'Strict', component: '', value: TransformationMode.Strict, selected: true }, { label: 'Lenient', component: '', value: TransformationMode.Lenient }]

export const sections = [
    {
        id: 'pii',
        title: 'PII Fields',
        description: 'PII is sensitive information that needs to be protected and kept secure to prevent identity theft, fraud, or other types of harm.  PII fields are often identified and tagged to ensure that appropriate controls are in place to protect the data',
        component: <InputAccordion key="pii" actions={actions} transformation_mode={transformation_mode} label={'Add PII Field'} dialog={< AddPIIDialog />} />,
        noGrid: true,
        navigation: {
            next: 'transformation'
        }
    },
    {
        id: 'transform',
        title: 'Fields Transformation',
        description: 'Field transformations allows users to manipulate and transform data during ingestion or query time. Custom Expressions specify a set of column transformations to be performed on input data',
        component: <InputAccordion key="transform" actions={[...actions, { label: 'JSONata', component: '', value: 'custom' }]} transformation_mode={transformation_mode} label={'Add Transformation'} dialog={< AddTransformationExpression />} />,
        noGrid: true,
        navigation: {
            next: 'additionalFields'
        }
    },
    {
        id: 'derived',
        title: 'Derived Fields',
        description: 'Create New Columns by applying custom transformation expressions',
        component: <InputAccordion key="derived" actions={[{ label: 'JSONata', component: '', value: 'custom' }]} transformation_mode={transformation_mode} label={'Add Derived Field'} dialog={< AddNewField />} />,
        noGrid: true,
        navigation: {
            next: 'timestamp'
        }
    },
    {
        id: 'timestamp',
        title: 'Timestamp Field',
        description: 'Timestamp Field specifies the column or field that contains the timestamp for each data record being ingested. This enabled our platform to effectively partition, index, and query data based on the timestamps.',
        componentType: 'box',
        master: false,
        component: <TimestampSelection />
    }
];
