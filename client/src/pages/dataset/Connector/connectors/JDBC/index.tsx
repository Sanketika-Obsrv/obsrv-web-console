import { Grid, Typography } from "@mui/material";
import MUIForm from "components/form";
import _ from "lodash";
import React, { useState } from "react";
import RelationalDB from "./Configs";

const onSubmission = (value: any) => { }

const RelationalDatabase = (props: any) => {
    const { form, existingState, edit } = props;
    const [childFormValue, setChildFormValue] = useState<any>(() => {
        if (edit) {
            return { type: _.get(existingState, ['value', 'jdbc', 'type']) }
        }
    });

    const renderRDBMSForm = (field: Record<string, any>, index: number) => {
        const { formField, title } = field;
        const formFieldValues = _.map(formField, 'name');
        const initialValues = _.pick(childFormValue, formFieldValues);

        return <Grid item xs={12} sx={{ marginTop: "1.5rem" }}>
            <Typography variant="body1" fontWeight={500} marginY={1}>{title}{' : '}</Typography>
            <MUIForm
                subscribe={setChildFormValue}
                initialValues={initialValues || {}}
                onSubmit={(value: any) => onSubmission(value)}
                fields={formField}
                size={{ sm: 4, xs: 4, lg: 6 }}
            />
        </Grid>
    }

    const renderForm = () => {
        return _.map(form, renderRDBMSForm)
    }

    const renderConfigs = () => {
        const dbType = _.get(childFormValue, "type")
        if (!dbType) return null;
        return React.cloneElement(<RelationalDB />, { mainformData: childFormValue, ...props })
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

export default RelationalDatabase;