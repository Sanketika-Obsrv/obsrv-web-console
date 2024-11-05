import { Grid } from '@mui/material';
import { withTheme } from '@rjsf/core';
import { Theme as MuiTheme } from '@rjsf/mui';
import { ErrorSchema, RJSFSchema, UiSchema } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import Ajv, { ErrorObject } from 'ajv';
import _ from 'lodash';
import React from 'react';

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

interface ConnectorFormProps {
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

const ConnectorForm = ({
    schema,
    formData,
    setFormData,
    onChange,
    customClassNames,
    styles: customStyles,
    extraErrors = {},
    handleClick
}: ConnectorFormProps) => {

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
        const valid = ajv.validate(schema.schema, data);

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

    const getUISchema = (sectionKey: string) => {
        if (schema.uiSchema[sectionKey]) {
            return {
                [sectionKey]: schema.uiSchema[sectionKey]
            }
        } else {
            const sectionValue:any = schema.schema.properties?.[sectionKey];
            if (typeof sectionValue === 'object' && 'format' in sectionValue && sectionValue.format === 'password') {
                return {
                    [sectionKey]: {
                        'ui:widget': 'password'
                    }
                };
            }
            if (typeof sectionValue === 'object' && 'format' in sectionValue && sectionValue.format === 'hidden') {
                return {
                    [sectionKey]: {
                        'ui:widget': 'hidden'
                    }
                };
            }
        }
    }

    return (

        <Grid container spacing={3} className={customStyles?.gridContainer} justifyContent={'flex-start'}>
            {schema.schema.properties && _.sortBy(_.entries(schema.schema.properties)).map(([sectionKey, sectionValue]) => {
                return (
                    <Grid item xs={12} sm={6} lg={6}
                        key={sectionKey}
                        onClick={() => handleClick?.(sectionKey)}
                    >
                        <CustomForm
                            schema={getSchema(sectionKey, sectionValue) as RJSFSchema}
                            uiSchema={getUISchema(sectionKey)}
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
                            onFocus={() => handleClick?.(sectionKey)}
                        />
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default ConnectorForm;