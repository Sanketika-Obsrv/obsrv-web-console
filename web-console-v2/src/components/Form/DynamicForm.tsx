import React from 'react';
import { Box, Typography } from '@mui/material';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { withTheme } from '@rjsf/core';
import { Theme as MuiTheme } from '@rjsf/mui';
import styles from './DynamicForm.module.css';
import { ErrorSchema, RJSFSchema, UiSchema } from '@rjsf/utils';
import Ajv, { ErrorObject } from 'ajv';
import _ from 'lodash';

const CustomForm = withTheme(MuiTheme);

const ajv = new Ajv({ strict: false });

export interface FormData {
    [key: string]: unknown;
}

export interface Schema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

interface DynamicFormProps {
    schema: Schema;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
    highlightedSection?: string | null;
    customClassNames?: {
        container?: string;
        sectionContainer?: string;
        connectorName?: string;
        sectionContainers?: string;
    };
    styles?: any;
    extraErrors?: ErrorSchema;
    handleClick?: (id: string) => void;
}

const DynamicForm = ({
    schema,
    formData,
    setFormData,
    onChange,
    customClassNames,
    styles: customStyles,
    extraErrors = {},
    handleClick
}: DynamicFormProps) => {

    const customErrors = (errors: null | ErrorObject[] = []) => {
        if (_.isEmpty(errors)) return;

        _.forEach(errors, (error) => {
            const errorKey = _.get(error, ['params', 'missingProperty']);

            const errorMessage = {
                pattern: 'Invalid pattern',
                required: `Required ${errorKey}`
            };

            const keyword = _.get(error, 'keyword', '');
            const customMessage = _.get(errorMessage, [keyword], '');
            const defaultMessage = _.get(error, 'message', '');
            error.message = customMessage || defaultMessage;
        });
    };

    const validator = customizeValidator({}, customErrors);

    const handleFormDataChange = (data: FormData) => {
        
        const valid = ajv.validate(schema, data);

        if (valid) {
            setFormData((prevData: FormData) => {
                const updatedData = { ...prevData, ...data };
                onChange(updatedData, null);
                return updatedData;
            });
        } else {
            const errors = ajv.errors?.map((error) => error.message) || [];
            const updatedData = { ...formData, ...data };
            onChange(updatedData, errors);
        }
    };

    const getSchema = (sectionKey: string, sectionValue: any) => {
        const fieldSchema = {
            type: "object", 
            properties: {
                [sectionKey]: sectionValue as RJSFSchema
            },
            required: schema.schema.required && schema.schema.required.includes(sectionKey) ? [sectionKey] : []
        }
        return fieldSchema;
    }

    return (
        <Box
            className={customClassNames?.container || styles.container}
            style={customStyles?.container}
        >
            <Box
                className={customClassNames?.sectionContainer || styles.sectionContainer}
                style={customStyles?.sectionContainer}
            >
                <Typography
                    variant="h1"
                    className={customClassNames?.connectorName || styles.connectorName}
                    style={customStyles?.connectorName}
                >
                    {schema.title}
                </Typography>
                {schema.schema.properties &&
                    _.entries(schema.schema.properties).map(([sectionKey, sectionValue]) => {
                        return (
                            <Box
                                key={sectionKey}
                                className={
                                    customClassNames?.sectionContainers ||
                                    styles.sectionContainers
                                }
                                style={customStyles?.sectionContainers}
                                onClick={() => handleClick?.(sectionKey)}
                            >
                                <CustomForm
                                    schema={getSchema(sectionKey, sectionValue) as RJSFSchema}
                                    uiSchema={{
                                        [sectionKey]: {
                                            ...schema.uiSchema[sectionKey]
                                        }
                                    }}
                                    formData={formData as FormData}
                                    validator={validator}
                                    showErrorList={false}
                                    onChange={(e) => {
                                        handleClick?.(sectionKey);
                                        handleFormDataChange(e.formData);
                                    }}
                                    liveValidate={true}
                                    templates={{
                                        ButtonTemplates: {
                                            SubmitButton: () => null
                                        }
                                    }}
                                    extraErrors={extraErrors}
                                    onBlur={() => handleClick?.(sectionKey)}
                                />
                            </Box>
                        );
                    })}
            </Box>
            
        </Box>
    );
};

export default DynamicForm;