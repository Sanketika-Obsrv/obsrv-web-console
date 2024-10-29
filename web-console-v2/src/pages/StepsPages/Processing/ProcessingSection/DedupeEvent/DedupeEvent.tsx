import React, { useEffect, useMemo, useState } from 'react';
import { Stack } from '@mui/material';
import DedupeEvents from 'components/Form/DynamicForm';
import schema from './Schema';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import _ from 'lodash';

interface FormData {
    [key: string]: unknown;
}

interface Schema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

interface ConfigureConnectorFormProps {
    schema: Schema;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

const DedupeEvent = (props: any) => {
    const { data, handleAddOrEdit, transformationOptions, isSuccess, isProceed } = props;
    const dropDuplicates = _.get(data, ['drop_duplicates']);
    const dedupKey = _.get(data, ['dedup_key']);
    const existingData = { 
        section1: {
            dropDuplicates: dropDuplicates ? 'Enable Deduplication' : '',
            dedupeKey: dropDuplicates ? dedupKey : ''
        }
    };

    const [formData, setFormData] = useState<{ [key: string]: unknown }>(existingData);

    const transformationOption = useMemo(() => {
        if (!_.isEmpty(transformationOptions))
            _.set(
                schema,
                ['schema', 'properties', 'section1', 'properties', 'dedupeKey', 'enum'],
                transformationOptions
            );
    }, [transformationOptions]);


    useEffect(() => {
        const formDropDuplicates = _.get(formData, ['section1', 'dropDuplicates']);
        const formDedupKey = _.get(formData, ['section1', 'dedupeKey']);
        if (formDropDuplicates !== dropDuplicates && formDedupKey !== dedupKey) {
            setFormData(existingData);
        }
        if (dropDuplicates && dedupKey !== '' && _.includes(transformationOptions, dedupKey)) {
            isProceed(true);
        }
    }, [isSuccess]);

    const handleChange: ConfigureConnectorFormProps['onChange'] = (formInfo) => {
        isProceed(false);
        setFormData(formInfo);
        const value : any = _.get(formInfo, ['section1']);
        const dedupeKey = _.get(formInfo, ['section1']);
        const dropDuplicates = _.get(value, 'dropDuplicates');
        if (!_.isUndefined(dropDuplicates)) {
            const isDropDuplicates = dropDuplicates.includes('Enable Deduplication');
            const dedupKey = isDropDuplicates ? _.get(dedupeKey, 'dedupeKey', '') : '';
            const dedupeEvent = {
                drop_duplicates: isDropDuplicates,
                dedup_key: dedupKey
            };

            if (!isDropDuplicates) {
                const updatedData = {
                    section1: {
                        dropDuplicates: '',
                        dedupeKey: ''
                    }
                };

                setFormData(updatedData);
            }

            const shouldAddOrEdit =
                (isDropDuplicates && dedupKey !== '') || (!isDropDuplicates && dedupKey === '');

            if (shouldAddOrEdit) {
                handleAddOrEdit(dedupeEvent);
                isProceed(true);
            }
        }
    };

    return (
        <Stack mt={-8} ml={-0.5}>
            <DedupeEvents
                schema={schema}
                formData={formData}
                setFormData={setFormData}
                onChange={handleChange}
                customClassNames={{
                    container: 'customContainerClass',
                    sectionContainer: 'customSectionContainerClass',
                    connectorName: 'customConnectorNameClass',
                    sectionContainers: 'customSectionContainersClass'
                }}
            />
        </Stack>
    );
};

export default DedupeEvent;