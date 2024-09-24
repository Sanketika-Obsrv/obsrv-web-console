import { Alert, Grid, Typography } from "@mui/material";
import MUIForm from "components/form";
import _ from 'lodash';
import { useEffect, useRef, useState } from "react";
import * as yup from "yup";
import config from 'data/initialConfig';
import channelConfigurations from 'data/notificationChannels';
import { validateFormValues } from "services/utils";
const { spacing } = config;

const getValidationSchema = (fields: Record<string, any>[]) => {
    return _.reduce(fields, (acc: Record<string, any>, current: Record<string, any>) => {
        const { validationSchema, name } = current;
        if (validationSchema) {
            acc[name] = validationSchema;
        }
        return acc;
    }, {})
}

const ConfigureChannel = (props: any) => {
    const { formData, setFormData, sectionLabel, existingState = {}, channelConfig } = props;
    const [value, subscribe] = useState<any>(existingState);
    const onSubmission = (value: any) => { };
    const formikRef = useRef(null);

    const selectedType = channelConfig ? channelConfig : _.get(formData, 'type');
    const selectedChannelConfiguration = _.get(channelConfigurations, [selectedType, 'form']);

    const validateForm = async () => {
        return validateFormValues(formikRef, value)
    }

    const subscribeToFormChanges = async () => {
        const isValid = await validateForm();
        setFormData((preState: Record<string, any>) => {
            const error = _.get(preState, 'error');
            return {
                ...preState,
                ...(value && { config: value }),
                error: {
                    ...error,
                    [sectionLabel]: isValid
                }
            }
        })
    }

    useEffect(() => {
        subscribeToFormChanges();
    }, [selectedType, value]);

    const validationSchema = getValidationSchema(selectedChannelConfiguration);

    const channelDescription = () => {
        const selectedChannelDescription = _.get(channelConfigurations, [selectedType, 'description']);
        if (!selectedChannelDescription) return null;
        return <Alert severity="info" sx={{ lineHeight: 0 }}><Typography variant="caption">{selectedChannelDescription}</Typography></Alert>
    }

    return <>
        <Grid container rowSpacing={spacing} columnSpacing={spacing}>
            <Grid item xs={12}>
                {channelDescription()}
            </Grid>
            <Grid item xs={12}>
                <MUIForm
                    initialValues={value}
                    enableReinitialize={true}
                    subscribe={subscribe}
                    onSubmit={(value: any) => onSubmission(value)}
                    fields={selectedChannelConfiguration}
                    size={{ sm: 6, xs: 6, lg: 6 }}
                    validationSchema={yup.object().shape(validationSchema)}
                    ref={formikRef}
                    debounce={1000}
                />
            </Grid>
        </Grid>
    </>
}

export default ConfigureChannel;