import { Button, Grid } from "@mui/material";
import MUIForm from "components/form";
import { useEffect, useRef, useState } from "react";
import * as yup from 'yup';
import _ from 'lodash';
import LabelsList from "./LabelsList";
import { validateFormValues } from "services/utils";
import { useSelector } from "react-redux";
import en from 'utils/locales/en.json'
import { hasSpecialCharacters } from "services/utils";

const transformLabels = (labels: Record<string, any>) => {
    return _.reduce(labels, (acc: Record<string, any>[], value, key) => {
        const notificationLabelsExists = _.startsWith(key, 'notificationChannel');
        if (!notificationLabelsExists) {
            acc = [...acc, { label: key, value }]
        }
        return acc;
    }, [])
}

const LabelComponent = (props: any) => {
    const { formData, setFormData, existingState, sectionLabel } = props;
    const [value, subscribe] = useState<any>({});
    const [isEdit, setIsEdit] = useState(false);
    const validationConfigs = useSelector((state: any) => state?.config?.validationLimit || {})
    const onSubmission = (value: any) => {

    };
    const formikRef = useRef<any>();
    const [labels, setLabels] = useState<any[]>(transformLabels(existingState?.labels || {}));
    const [formErrors, setFormErrors] = useState<boolean>(true);

    const fields = [
        {
            name: "label",
            label: "Key",
            type: "text",
            required: true,
        },
        {
            name: "value",
            label: "Value",
            type: "text",
            required: true,
        }
    ];

    const similarKey = "Please enter a unique key";

    const duplicateKey = (key: string | undefined) => {
        return _.find(labels, (label) => label.label === key);
    }

    const validationSchema = yup
        .object()
        .shape({
            label: yup.string().required(en.isRequired)
                .max(_.get(validationConfigs, ['alertRuleLabelsMaxLen']))
                .trim(en.whiteSpaceConflict).strict(true)
                .test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
                .test('duplicateKey', similarKey, (value) => {
                    return !duplicateKey(value);
                }),
            value: yup.string().required(en.isRequired)
                .trim(en.whiteSpaceConflict).strict(true)
                .test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
                .max(_.get(validationConfigs, ['alertRuleLabelsMaxLen']))
        });

    const validateForm = async () => {
        return validateFormValues(formikRef, value)
    }

    const addLabel = () => {
        const { label: labelKey, value: labelValue } = value;
        setLabels(preState => {
            return [...preState, value]
        });
        setFormData((preState: Record<string, any>) => {
            const existingLabels = _.get(preState, 'labels') || {}
            return {
                ...preState,
                labels: {
                    ...existingLabels,
                    [labelKey]: labelValue
                }
            }
        })
        subscribe({ label: "", value: "" })
        setIsEdit(false);
    }

    const editLabel = async (index: number) => {
        const { label: labelKey, value: labelValue } = value;
        setLabels(preState => {
            const newState = [...preState, value];
            transformLabels(newState);
            return newState;
        });
        setFormData((preState: Record<string, any>) => {
            const existingLabels = _.get(preState, 'labels') || {}
            return {
                ...preState,
                labels: {
                    ...existingLabels,
                    [labelKey]: labelValue
                }
            }
        })
        subscribe({ label: "", value: "" })
        setIsEdit(false);
    }

    const updateLabels = (labels: any[]) => {
        setLabels(labels);
    }

    const updateFormState = (value: any) => {
        subscribe(value);
    }

    const renderLabels = () => {
        const filteredLabels = _.filter(labels, (data) => data?.label !== "type" && data?.label !== "component")
        if (_.size(filteredLabels) == 0) return null;
        return <Grid item xs={12}>
            <LabelsList
                labels={filteredLabels}
                updateLabels={updateLabels}
                updateFormState={updateFormState}
                edit={setIsEdit} />
        </Grid>
    }

    const renderCreateLabelsForm = () => {
        return <Grid item xs={12}>
            <MUIForm
                initialValues={value}
                enableReinitialize={true}
                subscribe={subscribe}
                onSubmit={(value: any) => onSubmission(value)}
                fields={fields}
                size={{ sm: 6, xs: 6, lg: 6 }}
                validationSchema={validationSchema}
                ref={formikRef}
            />
        </Grid>
    }

    const subscribeToFormChanges = async () => {
        const isValid = await validateForm();
        setFormErrors(!isValid)
    }

    useEffect(() => {
        if (_.size(value) > 0) subscribeToFormChanges();
    }, [value])

    return (
        <>
            <Grid container direction={'row'} spacing={2} justifyContent='center' alignItems='center'>
                {renderLabels()}
                {renderCreateLabelsForm()}
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={formErrors}
                        onClick={() => {
                            const index = _.findIndex(labels, (label) => label.label === value.label);
                            isEdit ? editLabel(index) : addLabel();
                        }}
                    >
                        {
                            isEdit ? `Update Label` : `Add Label`
                        }
                    </Button>
                </Grid>
            </Grid>
        </>
    )
}

export default LabelComponent;