import _ from 'lodash';
import { Grid } from "@mui/material";
import MUIForm from "components/form";
import { useEffect, useMemo, useRef, useState } from "react";
import * as yup from 'yup';
import config from 'data/initialConfig';
import { querySeverity } from '../services/queryBuilder';
import { asyncValidation } from '../services/utils';
import en from 'utils/locales/en.json'
import { hasSpecialCharacters, validateFormValues } from "services/utils";
import { useSelector } from 'react-redux';
const { spacing } = config;

const validator = asyncValidation();

const extractNumber = (payload: string) => {
    const matcher = payload.match(/\d+/);
    return matcher;
}

const transformExistingState = (existingState: Record<string, any>) => {
    const { frequency, interval } = existingState;
    return {
        ...existingState,
        ...(frequency && interval && {
            frequency: extractNumber(frequency),
            interval: extractNumber(interval)
        })
    };
}

const AlertInfo = (props: any) => {
    const { formData, setFormData, existingState, sectionLabel, isFieldEditable } = props;
    const validationConfigs = useSelector((state: any) => state?.config?.validationLimit || {})
    const [value, subscribe] = useState<any>(transformExistingState(existingState));
    const onSubmission = (value: any) => { };
    const formikRef = useRef<any>();

    const fields = useMemo(() => [
        {
            name: "name",
            label: "Name",
            type: "text",
            required: true,
            disabled: !isFieldEditable("name"),
            tooltip: "Name of the alert rule"
        },
        {
            name: "description",
            label: "Description",
            type: "text",
            required: true,
            disabled: !isFieldEditable("description"),
            tooltip: "Description for the alert rule"
        },
        {
            name: "severity",
            label: "Severity",
            type: "select",
            required: true,
            selectOptions: querySeverity,
            disabled: !isFieldEditable("severity"),
            tooltip: "Severity Level for the alert rule"
        },
        {
            name: "frequency",
            label: "Frequency",
            type: "slider",
            config: {
                step: 1,
                max: 30,
                suffix: "Min"
            },
            required: true,
            disabled: !isFieldEditable("frequency"),
            tooltip: "How frequently to evaluate this rule ?"
        },
        {
            name: "interval",
            label: "Interval",
            type: "slider",
            config: {
                step: 1,
                max: 30,
                suffix: "Min"
            },
            required: true,
            disabled: !isFieldEditable("interval"),
            tooltip: "How long the rule should persist in the current state to fire the alert ?"
        }
    ], []);

    const validationSchema = useMemo(() => yup
        .object()
        .shape({
            name: yup.string().required(en.isRequired).test('Unique Rule Name', 'Rule name already exists', validator.checkUniqueRule(_.get(existingState, 'name')))
                .test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
                .trim(en.whiteSpaceConflict).strict(true)
                .max(_.get(validationConfigs, ['alertRuleNameMaxLen'])),
            description: yup.string().required(en.isRequired).max(300).test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value)).trim(en.whiteSpaceConflict).strict(true),
            severity: yup.string().required(en.isRequired),
            frequency: yup.number().required(en.isRequired),
            interval: yup.number().required(en.isRequired)
                .test('Greater Interval', 'Interval must be greater than or equal to frequency.', (testValue: any) => testValue >= _.get(value, "frequency"))
        }), [value]);

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

    return (
        <Grid container direction={'column'} spacing={spacing}>
            {
                <Grid item sm={2}>
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
            }
        </Grid>
    );
}

export default AlertInfo;