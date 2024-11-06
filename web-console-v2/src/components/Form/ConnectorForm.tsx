import { Grid } from '@mui/material';
import { withTheme } from '@rjsf/core';
import { Theme as MuiTheme } from '@rjsf/mui';
import { ErrorSchema, RJSFSchema, UiSchema } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import Ajv, { ErrorObject } from 'ajv';
import _ from 'lodash';
import React from 'react';





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

   

    return (

       <></>
    );
};

export default ConnectorForm;