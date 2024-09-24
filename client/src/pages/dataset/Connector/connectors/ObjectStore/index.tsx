import { Grid, Typography } from "@mui/material";
import MUIForm from "components/form";
import _ from "lodash";
import React, { useState } from "react";
import * as yup from "yup";
import AWSS3 from "./AWSS3";

const onSubmission = (value: any) => { }

const ObjectStore = (props: any) => {
    const { form, existingState } = props;
    const [childFormValue, setChildFormValue] = useState<any>(_.get(existingState, ['value', 'object']));

    const renderObjectStoreForm = (field: Record<string, any>, index: number) => {
        const { formField, title } = field;
        const formFieldValues = _.map(formField, 'name');
        const initialValues = _.pick(childFormValue, formFieldValues);

        const validations: any = {};
        _.forEach(formField, formItem => {
            const validationSchema = _.get(formItem, 'validationSchema')
            if (!validationSchema) return;
            validations[formItem.name] = validationSchema
        });
        const validationSchemas = yup.object().shape(validations);

        return <Grid item xs={12} sx={{ marginY: "1.5rem" }}>
            <Typography variant="body1" fontWeight={500} marginY={1}>{title}{' : '}</Typography>
            <MUIForm
                subscribe={setChildFormValue}
                initialValues={{ connector_type: "object", source: "aws", type: "s3", ...initialValues } || {}}
                onSubmit={(value: any) => onSubmission(value)}
                fields={formField}
                size={{ sm: 4, xs: 4, lg: 6 }}
                validationSchema={validationSchemas}
            />
        </Grid>
    }

    const renderForm = () => {
        return _.map(form, renderObjectStoreForm)
    }

    const renderFormBySourceType: any = () => {
        const sourceType = _.get(childFormValue, "source")
        const sourceClass = _.get(childFormValue, "type")
        switch (sourceType) {
            case 'aws':
                switch (sourceClass) {
                    case 's3':
                        return <AWSS3 />
                    case 's3glacier':
                        return <></>
                }
                break;
            default:
                return <></>
        }
    }

    const renderConfigs = () => {
        const formComponent = renderFormBySourceType();
        if (!formComponent) return null;
        return React.cloneElement(formComponent, { mainformData: childFormValue, ...props })
    }

    return <Grid container>
        <Grid item xs={12}>
            {renderForm()}
        </Grid>
        <Grid item xs={12}>
            {renderConfigs()}
        </Grid>
    </Grid>
}

export default ObjectStore;
