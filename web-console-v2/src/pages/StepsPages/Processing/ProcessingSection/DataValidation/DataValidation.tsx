import React, { useEffect, useState } from 'react';
import { Stack } from '@mui/material';
import DataValidationForm from 'components/Form/DynamicForm';
import schema from './Schema';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import _ from 'lodash';
import { setAdditionalProperties } from 'services/json-schema';
import { useUpdateDataset } from 'services/dataset';
import { keyMapping } from '../../Processing';

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

const DataValidation = (props: any) => {
    const { data, handleAddOrEdit, datasetData } = props;

    const [, setFormErrors] = useState<any>(null);
    const [formData, setFormData] = useState<{ [key: string]: unknown }>({});

    useEffect(() => {
        if (_.get(data, ['mode'], '')) {
            const existingData = {
                
                section1: {
                    validation: _.get(data, ['mode'], '')
                }
                
            };

            setAdditionalProperties(_.get(datasetData, ['data_schema']), data?.mode);
            handleAddOrEdit(data?.mode, 'validation');
            setFormData(existingData);
        }
    }, [data.mode]);

    const handleChange: ConfigureConnectorFormProps['onChange'] = (formData, errors) => {
        setFormData(formData);

        if (errors) {
            setFormErrors(errors);
        } else {
            setFormErrors([]);
        }

        const value = _.get(formData, ['section1', 'validation']);

        if (value) handleAddOrEdit(value);
    };

    return (
        <Stack mt={-8} ml={-1}>
            <DataValidationForm
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

export default DataValidation;
