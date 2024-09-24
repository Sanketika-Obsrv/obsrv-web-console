import { Button, Grid, Typography, Box, Alert } from "@mui/material";
import MUIForm from "components/form";
import { s3StoreConfigsForm } from "data/connectors/object/s3";
import _ from "lodash";
import * as yup from "yup";
import { renderFeildsOnCondition, validateFormValues } from "../../services/utils";
import { useEffect, useRef, useState } from "react";
import React from "react";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";

const onSubmission = (value: any) => { }

const AWSConfigs = (props: any) => {
    const { edit, setMainFormValue, addConnector, onClose, existingState, mainformData } = props;
    const formikRef = useRef(_.map(_.flattenDeep(_.map(s3StoreConfigsForm, (fields: any) => fields.fields)), () => React.createRef()))
    const wizardState: any = useSelector((state: any) => state?.wizard);
    const [childFormErrors, setChildFormErrors] = useState<boolean>(false);
    const [childFormValue, setChildFormValues] = useState<any>();
    const [formData, setFormData] = useState<any>(() => {
        if (edit) {
            const { type,
                source,
                bucket,
                prefix,
                region,
                fileFormat: { type: formatType, compressed },
                pollingInterval: { type: pollingIntervalType, schedule },
            } = _.get(existingState, ['value', 'object']);
            const access_key = _.get(existingState, ['value', 'object', 'authenticationMechanism', 'config', 'access_key'], '')
            const authType = _.get(existingState, ['value', 'object', 'authenticationMechanism', 'type'], '')
            const secret_key = _.get(existingState, ['value', 'object', 'authenticationMechanism', 'config', 'secret_key'], '')
            const name = _.get(existingState, ['value', 'object', 'authenticationMechanism', 'config', 'name'], '');

            return {
                source, prefix,
                storageClass: type, bucket,
                fileFormatType: formatType,
                compressFile: compressed,
                authType, access_key, secret_key, region,
                account_name: name,
                pollingIntervalType, schedule
            };
        }
    })

    const validateForm = async () => {
        return await validateFormValues(formikRef, formData);
    }

    const saveConnectorConfig = (e: any) => {
        setMainFormValue(null)
        const existingForm = _.get(existingState, "formFieldSelection") || []
        const { bucket, fileFormatType, compressFile = "yes", authType, access_key, prefix = "", secret_key, region, pollingIntervalType, schedule, account_name, connector_type } = formData;
        const datasetId = _.get(wizardState, 'pages.datasetConfiguration.state.masterId');
        const transformPayload = {
            ...{ id: `${datasetId}_${connector_type}` },
            ...mainformData,
            connector_type,
            bucket,
            prefix,
            fileFormat: { type: fileFormatType, compressed: compressFile },
            pollingInterval: { type: pollingIntervalType, schedule },
            region,
            authenticationMechanism: { type: authType, config: authType === 'credentials' ? { access_key, secret_key } : { name: account_name } },
        };
        addConnector({ formFieldSelection: _.uniq(_.concat(existingForm, ["object"])), value: { ...existingState.value, object: transformPayload }, error: false }, transformPayload)
        onSubmission({})
        onClose()
    }

    const subscribeToFormChanges = async () => {
        const isValid = await validateForm();
        setChildFormErrors(isValid)
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

    const transformInitialState = (formField: Record<string, any>, formValues: Record<string, any>) => {
        if (edit) {
            const formFieldValues = _.map(formField, 'name');
            const initialValues = _.pick(formValues, formFieldValues);
            return initialValues;
        }
        return null;
    }

    const renderForm = (field: any, index: number) => {
        const { fields, title, description } = field;
        const modifiedFormField = renderFeildsOnCondition(fields, formData) || [];
        const validations: any = {};
        _.forEach(modifiedFormField, formItem => {
            const validationSchema = _.get(formItem, 'validationSchema')
            if (!validationSchema) return;
            validations[formItem.name] = validationSchema
        });
        const validationSchemas = yup.object().shape(validations);

        const initialState = transformInitialState(modifiedFormField, formData) || {};

        return <Grid item xs={12} sx={{ marginBottom: "1rem" }}>
            <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
                <Box>
                    <Typography variant="body1" fontWeight={500}>{title}{' : '}</Typography>
                </Box>
                <Box sx={{ my: 1 }}>
                    <MUIForm
                        subscribe={setChildFormValues}
                        initialValues={{ connector_type: "object", pollingIntervalType: "periodic", authType: "credentials", fileFormatType: "jsonl", ...initialState } || {}}
                        onSubmit={(value: any) => onSubmission(value)}
                        fields={modifiedFormField}
                        size={{ sm: 4, xs: 4, lg: 6 }}
                        validationSchema={validationSchemas}
                        ref={formikRef.current[index]}
                    />
                </Box>
                <Box>
                    {description && <>{description(_.get(formData, 'bucket'))}</>}
                </Box>
            </Box>
        </Grid>
    }

    const renderConfigsForm = (configs: any) => {
        return <Grid container>
            <Grid item xs={12}>{_.map(_.get(configs, 'fields'), renderForm)}</Grid>
        </Grid>
    }

    const renderJSONDescription = () => {
        const sampleFileData = [
            '{"name": "John", "age": 30, "city": "New York"}',
            '{"name": "Alice", "age": 25, "city": "San Francisco"}',
            '{"name": "Bob", "age": 35, "city": "Chicago"}',
        ];
        return <Grid container>
            <Grid item>
                <Alert severity="info" sx={{ lineHeight: 0 }}>
                    <Typography variant="caption" fontSize={14}>The data in each file is expected to be in <strong>JSON Lines</strong> format for where each JSON object is represented as a separate line in a file i.e. each JSON object is seperated by a new line character in the file. For Example: </Typography>
                    <Box sx={{ display: "flex", flexDirection: 'column', bgcolor: "secondary.100", padding: '0.5rem' }}>
                        {_.map(sampleFileData, (sentence, index) => (
                            <Typography key={index} variant="caption" fontSize={13}>
                                {sentence}
                            </Typography>
                        ))}
                    </Box>
                </Alert>
            </Grid>
        </Grid>
    }

    const renderActionField = () => {
        return <Grid container justifyContent="flex-end" spacing={2} alignItems="center" marginTop={0.5}>
            <Grid item display="flex">
                <Button
                    variant="contained"
                    onClick={(e) => saveConnectorConfig(e)}
                    size="large"
                    disabled={!childFormErrors}
                    sx={{ py: "0.8rem", px: "1.2rem" }}
                    startIcon={edit ? <EditOutlined /> : <PlusOutlined />}
                >
                    <Typography variant="h6">
                        {edit ? 'Update' : 'Add'}
                    </Typography>
                </Button>
            </Grid>
        </Grid>
    }

    return <Grid item xs={12}>
        {_.map(s3StoreConfigsForm, renderConfigsForm)}
        {_.get(formData, "fileFormatType") == "jsonl" && renderJSONDescription()}
        {renderActionField()}
    </Grid>
}

export default AWSConfigs;
