import { Accordion, AccordionDetails, AccordionSummary, Button, Chip, Dialog, Grid, IconButton, Tooltip, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import config from 'data/initialConfig';
import React, { useEffect, useState } from "react";
import { DeleteFilled, EditOutlined } from "@ant-design/icons";
import { useFormik } from "formik";
import _ from "lodash";
import { addState } from "store/reducers/wizard";
import { deleteConnectorMetadata, saveConnectorDraft } from "services/connectors";
import { getKeyAlias } from "services/keysAlias";
import { flattenObject } from "services/utils";
import { error, success } from 'services/toaster';
import AlertDialog from "components/AlertDialog";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { DatasetStatus } from "types/datasets";
const { spacing } = config

const alertDialogContext = { title: 'Delete Connector', content: 'Are you sure you want to delete this connector ?' };

const ConnectorSection = (props: any) => {
    const dispatch = useDispatch();
    const { id, label, dialog, fields = [], name } = props;
    const wizardState = useSelector((state: any) => _.get(state, ['wizard']) || {});
    const existingState: any = _.get(wizardState, ['pages', id]);
    const storeState: any = useSelector((state: any) => state);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [edit, setEdit] = useState<boolean>(false)
    const [toEditValue, setEditValue] = useState({});
    const [expanded, setExpanded] = useState<string | false>(false);
    const formField: any = _.get(existingState, "formFieldSelection") || []
    const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false)
    const [deleteValue, setDeleteValue] = useState<string>('')

    const filterPredicate = (field: any) => {
        if (_.includes(formField, _.get(field, 'value'))) return true;
        if (_.get(field, ['selected']) === true) return true;
        return false;
    };

    const getInitialValues = () => {
        const selectedFields = _.filter(fields, filterPredicate);
        return { [name]: _.map(selectedFields, 'value') }
    }

    const formik = useFormik({ initialValues: getInitialValues(), onSubmit: values => { } });
    const formValues = formik.values;

    const addConnector = async (state: Record<string, any>, payload: Record<string, any> | null) => {
        try {
            dispatch(addState({ id, ...state }));
            if (payload) {
                const datasetId = _.get(wizardState, 'pages.datasetConfiguration.state.masterId');
                const { connector_type, source, id, ...rest } = payload;
                const connectorPayload = {
                    id: `${datasetId}_${connector_type}`,
                    connector_id: `${connector_type}`,
                    connector_config: { ...rest },
                    version:"v1"
                }
                await saveConnectorDraft(connectorPayload,datasetId);
            }
        } catch (err) {
            dispatch(error({ message: "Failed to add the connector" }));
        }
    }

    const persist = (error: any) => {
        const formFieldSelection = _.get(existingState, "formFieldSelection") || _.get(formValues, [name]);
        addConnector({ formFieldSelection, value: _.get(existingState, "value"), error: error }, null);
    }

    const validateForm = async () => {
        const isJDBCValidationPassed = !_.isUndefined(_.get(existingState, ['value', 'jdbc'])) ?  _.get(existingState, ['value', 'jdbc', 'authenticationMechanism', 'username'], false) && _.get(existingState, ['value', 'jdbc', 'authenticationMechanism', 'password'], false) : true
        const isObjectStoreValidationPassed =  !_.isUndefined(_.get(existingState, ['value', 'object'])) ? _.get(existingState, ['value', 'object', 'authenticationMechanism', 'config', 'access_key'], false) && _.get(existingState, ['value', 'object', 'authenticationMechanism', 'config', 'secret_key'], false) : true 
        const isKafkaValidationPassed =  !_.isUndefined(_.get(existingState, ['value', 'kafka']))  ? _.get(existingState, ['value', 'kafka', 'topic'], false) && _.get(existingState, ['value', 'kafka', 'kafkaBrokers'], false) : true
        let validationPassed = isJDBCValidationPassed && isKafkaValidationPassed && isObjectStoreValidationPassed 
        if (formValues[id].length > 1 && validationPassed) {
            persist(false);
        } else if (formValues[id].length === 1) {
            persist(false);
        } else {
            persist({ 'error': true });
        } 
    }

    useEffect(() => {
        validateForm();
    }, [_.get(existingState, "value")]);

    const deleteDataConnectorConfig = async (dataSource: string) => {
        try {
            const updatedFormFields = _.filter(formField, item => item !== dataSource);
            const formValues = _.get(existingState, "value") || {}
            const updatedValues = _.omit(formValues, [dataSource]);
            await deleteConnectorMetadata({ state: storeState, type: dataSource });
            addConnector({ formFieldSelection: updatedFormFields, value: updatedValues }, null);
            dispatch(success({ message: `${_.capitalize(dataSource)} connector config deleted successfully` }));
        } catch (err) {
            dispatch(error({ message: "Failed to delete the connector" }));
        }
    }

    const onDelete = async () => {
        await deleteDataConnectorConfig(deleteValue);
    }

    const onEdit = (value: any) => {
        setEdit(true)
        setDialogOpen(true)
        const editRecord = _.get(existingState, ["value", value]) || {}
        setEditValue(editRecord)
    }

    const filterConfigs = (payload: Record<string, any>) => {
        const configs = _.pick(payload, ["topic", "kafkaBrokers", "databaseName", "tableName", "source", "bucket", "prefix", "type"])
        const filteredConfigs = _.omitBy(configs, (value) => _.isUndefined(value) || value === '');
        return filteredConfigs;
    }

    const renderAccordionSection = (field: any) => {
        const { value, disabled, label, icon, description } = field;
        const connectorPayload = _.get(existingState, ["value", value]) || {};
        const sourceConfigs: any = filterConfigs(connectorPayload);

        const handleChange = (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
            setExpanded(newExpanded ? panel : false);
        };

        const handleDelete = (value: string) => {
            setOpenDeleteDialog(true)
            setDeleteValue(value)
        }

        const actions = [{
            name: 'edit',
            label: 'Edit',
            color: 'primary',
            onClick: (_: any) => onEdit(value),
            disabled: disabled,
            icon: <EditOutlined />
        },
        {
            name: 'delete',
            label: 'Delete',
            color: 'primary',
            onClick: () => handleDelete(value),
            disabled: disabled,
            icon: <DeleteFilled />
        }]

        const renderconnectorInfo = () => {
            const connectorInfo = flattenObject(sourceConfigs);
            return <>
                {_.map(connectorInfo, (payload: any) => {
                    const { key, value } = payload;
                    return <Grid item display='flex' marginX={1}>
                        <Chip variant="outlined" label={`${_.capitalize(getKeyAlias(key))} : ${(getKeyAlias(value))}`} />
                    </Grid>
                })}
                {!_.size(connectorInfo) && <Typography variant="caption">({description})</Typography>}
            </>
        }

        const connectorTitle = () => (
            <Grid container justifyContent="space-between" alignItems="center">
                <Grid item display="flex">
                    <Grid container spacing={2} alignItems='center'>
                        <Grid item display='flex'>
                            {icon}
                        </Grid>
                        <Grid item display='flex'>
                            <Typography variant='body1' fontWeight={450}>{label}</Typography>
                        </Grid>
                        <Grid item display='flex'>
                            {renderconnectorInfo()}
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item display="flex" sx={{ marginX: "2rem" }}>
                    {_.map(actions, (item: any) => {
                        const { label, name, onClick, color, disabled, icon } = item
                        return <Tooltip title={label}>
                            <IconButton
                                id={name}
                                onClick={onClick}
                                color={color}
                                size="medium"
                                disabled={disabled}
                            >
                                {icon}
                            </IconButton>
                        </Tooltip>
                    })}
                </Grid>
            </Grid>
        )

        const filterConnectorDetails = (payload: Record<string, any>) => {
            const omittedKeys = ["authenticationMechanism.password", "authenticationMechanism.username", "authenticationMechanism.encrypted", "connector_type", "authenticationMechanism.config.access_key", "authenticationMechanism.config.secret_key", "id", "prefix", "fileFormat.compressed"];
            return _.filter(payload, ({ key }) => !omittedKeys.includes(key));
        };
        const filterSourceDetails = _.omitBy(connectorPayload, (value, key) =>
            sourceConfigs.hasOwnProperty(key) && sourceConfigs[key] === value
        );
        const dataSourceDetails: Record<string, any> = filterConnectorDetails(flattenObject(filterSourceDetails));

        const connectorDetails = () => _.map(dataSourceDetails, (payload: any) => {
            const { key, value } = payload || {};
            return <Grid container direction='row' margin={1} alignItems='center'>
                <Grid item xs={2}>
                    <Typography color='black' variant='body1' fontWeight={500}>{_.capitalize(getKeyAlias(key))}</Typography>
                </Grid>
                <Grid item xs={10}>
                    <Typography color='black' variant='body1'>{value}</Typography>
                </Grid>
            </Grid>
        })

        const shouldExpand = _.size(dataSourceDetails) > 0 && !edit && !openDeleteDialog;
        return <Accordion expanded={expanded === value && shouldExpand} onChange={handleChange(value)}>
            <AccordionSummary aria-controls="panel1d-content" id="panel1d-header" expandIcon={_.size(dataSourceDetails) === 0 ? <div style={{ marginRight: "1.5rem" }}></div> : <ArrowForwardIosIcon />}>
                {connectorTitle()}
            </AccordionSummary>
            <AccordionDetails>
                <Grid container direction='row'>
                    <Grid item xs={12} marginLeft={1}>
                        {connectorDetails()}
                    </Grid>
                </Grid>
            </AccordionDetails>
        </Accordion>
    }

    const renderConnectorDetails = () => {
        const configData = _.filter(fields, (field: any) => formField.includes(field.value))
        return <Grid item xs={12}>
            {_.map(configData, renderAccordionSection)}
        </Grid>
    }

    const onDialogClose = () => {
        setDialogOpen(false);
        setEdit(false)
        setEditValue({})
        setExpanded(false)
    }

    const updateDialogProps = () => {
        return React.cloneElement(dialog, { id, fields, addConnector, onClose: onDialogClose, edit, toEditValue, existingState, ...props });
    }

    const disableAddConnector = () => {
        const data = _.filter(fields, (field) => !_.includes(formField, field.value));
        return _.isEmpty(data);
    };

    const dailogClose = () => {
        setOpenDeleteDialog(false)
        setExpanded(false)
    }

    const renderDeleteDailog = () => {
        return <AlertDialog open={openDeleteDialog} handleClose={dailogClose} context={alertDialogContext} action={onDelete} />
    }

    return <>

        <Grid container rowSpacing={0} columnSpacing={spacing}>
            {renderConnectorDetails()}
            <Grid item xs={12} textAlign="end" my={2}>
                <Button
                    onClick={_ => {
                        setDialogOpen(true)
                        setEditValue({})
                    }}
                    disabled={disableAddConnector()}
                    startIcon={<AddOutlinedIcon fontSize="large" />}
                >
                    <Typography variant="body2" fontWeight="500">
                        {label}
                    </Typography>
                </Button>
            </Grid>
            <Grid item xs={12}>
                <Dialog maxWidth={'md'} fullWidth={true} open={dialogOpen} onClose={_ => setDialogOpen(false)}>
                    {updateDialogProps()}
                </Dialog>
            </Grid>
            {renderDeleteDailog()}
        </Grid>
    </>
}

export default ConnectorSection;
