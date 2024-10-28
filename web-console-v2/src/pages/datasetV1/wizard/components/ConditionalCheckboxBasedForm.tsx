import MUIForm from "components/form";
import * as _ from 'lodash';
import { Checkbox, FormControlLabel, FormGroup, Grid, Radio, Stack, Box, Typography } from "@mui/material";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useFormik } from "formik";
import config from 'data/initialConfig';
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addState } from "store/reducers/wizard";
import HtmlTooltip from "components/HtmlTooltip";
import * as yup from "yup";
import { saveDatasetIntermediateState } from "services/dataset";
const { spacing } = config;

const ConditionalCheckboxForm = (props: any) => {
    const dispatch = useDispatch();
    const { id, type = "checkbox", justifyContents = 'flex-start', fields, name, display = "column", noChildForm = false } = props;
    const existingState: any = useSelector((state: any) => _.get(state, ['wizard', 'pages', id]) || {});
    const [childFormValue, setChildFormValues] = useState<any>({});
    const childFormRef = useRef([]);
    const formikRef = useRef(null);

    const filterPredicate = (field: any) => {
        if (_.includes(_.get(existingState, 'formFieldSelection'), _.get(field, 'value'))) return true;
        if (_.get(field, ['selected']) === true) return true;
        return false;
    };

    const getInitialValues = () => {
        const selectedFields = _.filter(fields, filterPredicate);
        if (type === "checkbox") {
            return { [name]: _.map(selectedFields, 'value') }
        } else {
            return {
                [name]: _.get(_.last(selectedFields), 'value')
            }
        }
    }

    const persistState = (state: Record<string, any>) => dispatch(addState({ id, ...state }));
    const formik = useFormik({ initialValues: getInitialValues(), onSubmit: values => { } });
    const formValues = formik.values;

    const persist = (error: any) => {
        const formFieldSelection = _.get(formValues, [name]);
        persistState({ formFieldSelection, value: { ...childFormValue, }, error: error });
    }

    const onSubmission = (value: any) => { };

    const validateForm = async () => {
        let validationPassed = true;

        if (childFormRef.current) {
            if (formikRef.current) {
                const formikReference = formikRef.current as any
                const validationStatus = await formikReference.validateForm(childFormValue);
                validationPassed = _.size(validationStatus) === 0;
            }
        }

        if (_.get(formValues, [id, "length"]) > 1 && validationPassed) {
            persist(false);
        } else if (_.get(formValues, [id, "length"]) === 1) {
            persist(false);
        } else {
            persist({ 'error': true });
        }
    }

    useEffect(() => {
        validateForm();
    }, [formValues, childFormValue]);

    const handleParentFormChange = (e: any) => {
        formik.handleChange(e);
        setChildFormValues({});
    }

    const getFormType = (metadata: Record<string, any>) => {
        const { name, value } = metadata;
        switch (type) {
            case "checkbox":
                return <Checkbox name={name} className="size-medium" checked={_.includes(_.get(formValues, name), value)} value={value} onChange={handleParentFormChange} />
            case "radio":
                return <Radio name={name} className="size-medium" checked={value === _.get(formValues, name)} value={value} onChange={handleParentFormChange} />
            default:
                return <Checkbox name={name} className="size-medium" value={value} onChange={handleParentFormChange} />
        }
    }

    const renderDescription = (description: string) => {
        return (
            <HtmlTooltip title={description}>
                <InfoOutlinedIcon fontSize="small" color="primary" />
            </HtmlTooltip>
        );
    }

    const renderFormControl = (option: Record<string, any>) => {
        const { name, value, label, description, disabled = false } = option;
        return (
            <Box display="flex" alignItems="center">
                <FormControlLabel key={`${name}-${value}`} name={name} disabled={disabled} control={getFormType(option)} label={label} disableTypography />
                {description && renderDescription(description)}
            </Box>
        );
    }

    const renderForm = () => <form onSubmit={formik.handleSubmit}>
        <FormGroup>
            <Stack direction={display} spacing={spacing} justifyContent={justifyContents}>
                {fields.map(renderFormControl)}
            </Stack>
        </FormGroup>
    </form>

    const renderAssociatedForm = () => {
        const value = _.get(formValues, [name]);
        const values = Array.isArray(value) ? value : [value];
        return _.map(values, (value: any) => {
            const metadata = _.find(fields, ['value', value]);
            if (!metadata) return null;
            const { form, description, component, formComponent, topComponent, value: type, ...rest } = metadata;
            childFormRef.current = form;
            const validations: any = {};
            _.forEach(form, formItem => {
                const validationSchema = _.get(formItem, 'validationSchema')
                if (!validationSchema) return;
                validations[formItem.name] = validationSchema
            });

            const validationSchemas = yup.object().shape(validations);

            return <>
                {topComponent && <Grid item sm={12}>{topComponent}</Grid>}
                {form && (
                    <Grid item sm={12}>
                        <MUIForm
                            subscribe={setChildFormValues}
                            initialValues={{ type, ..._.get(existingState, 'value') }}
                            onSubmit={(value: any) => onSubmission(value)}
                            fields={form}
                            size={{ sm: 4, xs: 4, lg: 4 }}
                            formComponent={formComponent && React.cloneElement(formComponent, { ...props })}
                            validationSchema={validationSchemas}
                            ref={formikRef}
                            debounce={1000}
                        />
                    </Grid>)
                }
                {component && <Grid item sm={12}>{component}</Grid>}
            </>
        })
    }

    return <>
        <Grid container rowSpacing={spacing}>
            <Grid item xs={12}>
                {renderForm()}
            </Grid>
            {renderAssociatedForm()}
        </Grid>
    </>
}

export default ConditionalCheckboxForm
