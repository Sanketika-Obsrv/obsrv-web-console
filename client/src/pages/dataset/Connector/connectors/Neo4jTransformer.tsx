import { Grid } from "@mui/material";
import MUIForm from "components/form";
import _ from "lodash";
import { useRef, useState, useEffect } from "react";
import * as yup from "yup";
import ConnectorActions from "../services/ConnectorActions";
import { useSelector } from "react-redux";
import { validateFormValues } from "services/utils";

const onSubmission = (value: any) => { }

const SunbirdNeo4jTransformer = (props: any) => {
    const { form, onClose, setMainFormValue, addConnector, edit, existingState } = props;
    const [childFormValue, setChildFormValue] = useState<any>(_.get(existingState, "value.neo4j"));
    const formikRef = useRef(null);
    const wizardState: any = useSelector((state: any) => state?.wizard);
    const [formErrors, setFormErrors] = useState<boolean>(true);

    const saveConnectorConfig = (e: any) => {
        setMainFormValue(null)
        const formField = _.get(existingState, "formFieldSelection") || []
        const datasetId = _.get(wizardState, 'pages.datasetConfiguration.state.masterId');
        addConnector({ formFieldSelection: _.uniq(_.concat(formField, ["neo4j"])), value: { ...existingState.value, ['neo4j']: { ...childFormValue, ...{ id:`${datasetId}_neo4j` } } }, error: false }, childFormValue)
        onSubmission({})
        onClose()
    }

    const validateForm = async () => {
        return validateFormValues(formikRef, childFormValue)
    }

    const subscribeToFormChanges = async () => {
        const isValid = await validateForm();
        setFormErrors(!isValid)
    }

    useEffect(() => {
        if (_.size(childFormValue) > 0) subscribeToFormChanges();
    }, [childFormValue])

    const renderForm = () => {
        const validations: any = {};
        _.forEach(form, formItem => {
            const validationSchema = _.get(formItem, 'validationSchema')
            if (!validationSchema) return;
            validations[formItem.name] = validationSchema
        });

        const validationSchemas = yup.object().shape(validations);

        return <Grid item sm={12}>
            <Grid container spacing={2}>
                <Grid item sm={12}>
                    <MUIForm
                        subscribe={setChildFormValue}
                        initialValues={{ connector_type: "neo4j", ...childFormValue }}
                        onSubmit={(value: any) => onSubmission(value)}
                        fields={form}
                        size={{ sm: 4, xs: 4, lg: 6 }}
                        validationSchema={validationSchemas}
                        ref={formikRef}
                    />
                </Grid>
                <Grid item sm={12}>
                    <ConnectorActions formData={childFormValue} formErrors={formErrors} actionHandler={saveConnectorConfig} edit={edit} />
                </Grid>
            </Grid>
        </Grid>
    }

    return renderForm();
}

export default SunbirdNeo4jTransformer;