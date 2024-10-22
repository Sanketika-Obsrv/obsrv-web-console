import React, { useEffect, useState } from 'react';
import { Stack } from '@mui/material';
import DataValidationForm from 'components/Form/DynamicForm';
import schemas from './Schema';
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
    schemas: Schema[];
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

const DataValidation = (props: any) => {
    const { data, handleAddOrEdit } = props;

    const [, setFormErrors] = useState<any>(null);
    const [formData, setFormData] = useState<{ [key: string]: unknown }>({});

    useEffect(() => {
        if (_.get(data, ['mode'], '')) {
            const existingData = {
                section0: {
                    section1: {
                        validation: _.get(data, ['mode'], '')
                    }
                }
            };

            setFormData(existingData);
        }
    }, [data]);

    const handleChange: ConfigureConnectorFormProps['onChange'] = (formData, errors) => {
        setFormData(formData);

        if (errors) {
            setFormErrors(errors);
        } else {
            setFormErrors([]);
        }

        const value = _.get(formData, ['section0', 'section1', 'validation']);

        if (value) handleAddOrEdit(value);
    };

    return (
        <Stack mt={-8} ml={-1}>
            <DataValidationForm
                schemas={schemas}
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
