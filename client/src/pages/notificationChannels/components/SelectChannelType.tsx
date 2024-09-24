import { Grid } from "@mui/material";
import MUIForm from "components/form";
import _ from 'lodash';
import { useEffect, useMemo, useRef, useState } from "react";
import * as yup from "yup";
import config from 'data/initialConfig';
import notificationChannels from "data/notificationChannels";
import { asyncValidation } from "pages/alertManager/services/utils";
import en from 'utils/locales/en.json'
import { hasSpecialCharacters, validateFormValues } from "services/utils";
import { useSelector } from "react-redux";
const { spacing } = config;

const validator=asyncValidation();

const SelectChannelType = (props: any) => {
    const { setFormData, sectionLabel, existingState = {} } = props;
    const [value, subscribe] = useState<any>(existingState);
    const onSubmission = (value: any) => { };
    const validationConfigs = useSelector((state: any) => state?.config?.validationLimit || {})
    const formikRef = useRef(null);

    const fields = useMemo(() => [
        {
            name: "name",
            label: "Channel Name",
            type: 'text',
            required: true,
            tooltip: "Name of the channel"
        },
        {
            name: "type",
            label: "Channels",
            type: 'autocomplete',
            tooltip: "Select the channel type",
            required: true,
            selectOptions: _.map(_.keys(notificationChannels), key => ({
                label: _.capitalize(key),
                value: key
            })),
        },
    ], []);

    const validateForm = async () => {
        return validateFormValues(formikRef, value)
    }

    const subscribeToFormChanges = async () => {
        const isValid = await validateForm();
        setFormData((preState: Record<string, any>) => {
            const error = _.get(preState, 'error');
            return {
                ...preState,
                ...value,
                error: {
                    ...error,
                    [sectionLabel]: isValid
                }
            }
        })
    }

    useEffect(() => {
        if (_.size(value) > 0) subscribeToFormChanges();
    }, [value]);

    const validationSchema = useMemo(() => yup
        .object()
        .shape({
            name: yup.string().required(en.isRequired).test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
                .test('Unique Channel Name', 'Channel name already exists', validator.checkUniqueChannel(_.get(existingState, 'name')))
                .max(_.get(validationConfigs, ['notificationChannelNameMaxLen']))
                .trim(en.whiteSpaceConflict).strict(true),
            type: yup.string().required(en.isRequired),
        }), []);

    return <>
        <Grid container rowSpacing={spacing} columnSpacing={spacing}>
            <Grid item xs={12}>
                <MUIForm
                    initialValues={value}
                    enableReinitialize={true}
                    subscribe={subscribe}
                    onSubmit={(value: any) => onSubmission(value)}
                    fields={fields}
                    size={{ sm: 6, xs: 6, lg: 6 }}
                    validationSchema={validationSchema}
                    ref={formikRef}
                    debounce={1000}
                />
            </Grid>
        </Grid>
    </>

}

export default SelectChannelType;