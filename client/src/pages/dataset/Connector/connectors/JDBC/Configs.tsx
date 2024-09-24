import { Alert, Grid, Typography, Box } from "@mui/material";
import MUIForm from "components/form";
import _ from "lodash";
import React, { useRef, useState, useEffect } from "react";
import * as yup from "yup";
import { validateFormValues } from "../../services/utils";
import ConnectorActions from "../../services/ConnectorActions";
import { useSelector } from "react-redux";
import { jdbcConfigForm } from "data/connectors/jdbc/configs";
import Loader from "components/Loader";

const onSubmission = (value: any) => { }

const getUpdatedFormField = (props: Record<string, any>) => {
    const { state, form } = props;
    const schemaColumns = _.get(state, ["pages", "columns", "state", "schema"]) || []
    const timestampsCols = _.map(schemaColumns, field => {
        if (!_.get(field, "isDeleted") && _.includes(["date", "date-time", "epoch"], _.get(field, "data_type"))) {
            const value = _.get(field, "column")
            return { label: value, value }
        }
    })
    const timeStampFormField = [{
        title: "TimeStamp Column",
        formField: [{
            name: "timestampColumn",
            label: "Select Timestamp Field",
            type: 'autocomplete',
            required: true,
            validationSchema: yup.string().required("This field is required"),
            selectOptions: _.compact(timestampsCols),
        }]
    }]
    const updatedFormField = _.concat(form, timeStampFormField);
    return updatedFormField;
}

const JDBCConfigs = (props: any) => {
    const { edit, setMainFormValue, addConnector, onClose, existingState, mainformData } = props;
    const wizardState: any = useSelector((state: any) => state?.wizard);
    const updatedForm = getUpdatedFormField({ state: wizardState, form: jdbcConfigForm })
    const [formErrors, setFormErrors] = useState<boolean>(true);
    const [childFormValue, setChildFormValue] = useState<any>();
    const [loading, setLoading] = useState<boolean>(true)
    const formikRef = useRef(_.map(_.flattenDeep(_.map(updatedForm, (fields: any) => fields.fields)), () => React.createRef()))
    const [formData, setFormData] = useState<any>(() => {
        if (edit) {
            const {
                connection: { host, port },
                databaseName, tableName, timestampColumn,
                pollingInterval: { type: pollingIntervalType, schedule }
            } = _.get(existingState, ['value', 'jdbc']);
            const username = _.get(existingState, ['value', 'jdbc', 'authenticationMechanism', 'username'], '')
            const password = _.get(existingState, ['value', 'jdbc', 'authenticationMechanism', 'password'], '')
            return {
                ...mainformData,
                jdbc_host: host,
                jdbc_port: port,
                databaseName, tableName,
                jdbc_user: username,
                jdbc_password: password,
                timestampColumn,
                pollingIntervalType, schedule
            };
        }
    });

    const saveConnectorConfig = (e: any) => {
        setMainFormValue(null)
        const existingForm = _.get(existingState, "formFieldSelection") || []
        const { connector_type, databaseName, tableName, jdbc_host, jdbc_port, jdbc_user, jdbc_password, timestampColumn, pollingIntervalType, schedule } = formData
        const { type } = mainformData;
        const datasetId = _.get(wizardState, 'pages.datasetConfiguration.state.masterId');
        const transformFormData = {
            ...{ id: `${datasetId}_${connector_type}` },
            connector_type,
            type,
            connection: { host: jdbc_host, port: jdbc_port },
            databaseName,
            tableName,
            pollingInterval: { type: pollingIntervalType, schedule },
            authenticationMechanism: { username: jdbc_user, password: jdbc_password },
            batchSize: 1000,
            timestampColumn
        }
        addConnector({ formFieldSelection: _.uniq(_.concat(existingForm, ["jdbc"])), value: { ...existingState.value, jdbc: transformFormData }, error: false }, transformFormData)
        onSubmission({})
        onClose()
    }

    const validateForm = () => {
        return validateFormValues(formikRef, formData)
    }

    const subscribeToFormChanges = async () => {
        const isValid = await validateForm();
        setFormErrors(!isValid)
    }

    useEffect(() => {
        if (_.size(formData) > 0) subscribeToFormChanges();
    }, [formData])

    useEffect(() => {
        setFormData((preState: Record<string, any>) => {
            return {
                ...preState,
                ...childFormValue
            }
        })
    }, [childFormValue])

    useEffect(() => {
        setLoading(true);
        const clearFormValues = () => {
            setFormData({});
            setFormErrors(true);
        }
        if (edit) {
            const existingType = _.get(existingState, ['value', 'jdbc', 'type']);
            if (existingType !== _.get(mainformData, "type")) clearFormValues();
        } else clearFormValues();
        setTimeout(() => setLoading(false), 200);
    }, [mainformData]);

    const getDefaultPort = (dbType: string) => {
        const dbPortMapping = {
            mysql: "3306",
            postgresql: "5432"
        }
        return _.get(dbPortMapping, dbType) || ""
    }

    const renderJDBCForm = (field: Record<string, any>, index: number) => {
        const { formField, title, description } = field;
        const formFieldValues = _.map(formField, 'name');
        const initialValues = _.pick(formData, formFieldValues);

        const validations: any = {};
        _.forEach(formField, formItem => {
            const validationSchema = _.get(formItem, 'validationSchema')
            if (!validationSchema) return;
            validations[formItem.name] = validationSchema
        });

        const validationSchemas = yup.object().shape(validations);

        return <Grid item xs={12} sx={{ marginY: "1.5rem" }}>
            <Typography variant="body1" fontWeight={500} marginY={1.5}>{title}{' : '}</Typography>
            <MUIForm
                subscribe={setChildFormValue}
                initialValues={{ connector_type: "jdbc", pollingIntervalType: "periodic", ...initialValues, jdbc_port: getDefaultPort(_.get(mainformData, "type") || "") } || {}}
                onSubmit={(value: any) => onSubmission(value)}
                fields={formField}
                size={{ sm: 4, xs: 4, lg: 6 }}
                validationSchema={validationSchemas}
                ref={formikRef.current[index]}
            />
            <Box>
                {description && <Alert severity="info" sx={{ marginY: '1rem', lineHeight: 0 }}>
                    <Typography variant="caption" fontSize={13}>
                        {description}
                    </Typography>
                </Alert>}
            </Box>
        </Grid>
    }

    return <Grid item xs={12}>{loading ? <Loader /> :
        <Grid container>
            <Grid item xs={12}>
                {_.map(updatedForm, renderJDBCForm)}
            </Grid>
            <Grid item xs={12}>
                <ConnectorActions formData={formData} type={_.get(mainformData, "type")} formErrors={formErrors} actionHandler={saveConnectorConfig} edit={edit} />
            </Grid>
        </Grid>
    }</Grid>
}

export default JDBCConfigs; 
