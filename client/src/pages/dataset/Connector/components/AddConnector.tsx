import { Box, DialogContent, DialogTitle, Grid, IconButton, Typography } from "@mui/material";
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import MUIForm from "components/form";
import * as _ from "lodash";
import React, { useState } from "react";
import HtmlTooltip from "components/HtmlTooltip";
import { QuestionCircleOutlined } from "@ant-design/icons";
import config from 'data/initialConfig';
const { spacing } = config

const onSubmission = (value: any) => { };

const AddConnector = (props: any) => {
    const { fields, onClose, edit, toEditValue, existingState } = props;
    const [mainFormValue, setMainFormValue] = useState<any>(_.pick(toEditValue, "connector_type"));

    const filterPredicate = (field: any) => {
        if (_.get(field, ['selected']) === true) return false;
        if (edit) return field.value === _.get(toEditValue, "connector_type");
        const formFieldSelection = _.get(existingState, "formFieldSelection") || []
        return !formFieldSelection.includes(field.value)
    };

    const transformField = (field: any) => {
        const selectedFields = _.filter(field, filterPredicate);
        return selectedFields;
    }

    const fieldSection = [
        {
            name: 'connector_type',
            label: 'Source Type',
            type: 'select',
            required: true,
            selectOptions: transformField(fields)
        }
    ]

    const renderForm = (value: any) => {
        const connectorInfo = fields.find((field: any) => value["connector_type"]?.includes(field.value));
        if (!connectorInfo) return null;
        return React.cloneElement(_.get(connectorInfo, "component"), { edit, onClose, setMainFormValue, mainFormValue, existingState, ...props })
    }

    const renderDialogTitle = () => {
        return <>
            <Grid container display="flex" alignItems="center" justifyContent="space-between">
                <Grid item display="flex">
                    <Grid container display="flex" alignItems="center" spacing={spacing}>
                        <Grid item display="flex">
                            <Typography variant="h5">
                                {edit ? 'Update Connector' : 'Add Connector'}
                            </Typography>
                        </Grid>
                        <Grid item display="flex">
                            <HtmlTooltip title={
                                <Box>
                                    <Typography variant="caption" fontSize={13}>Source connectors allow businesses to import data into the Obsrv platform. To start with, we would like to extend the support for:</Typography>
                                    <ul>
                                        <li>Relational DB Source Connector</li>
                                        <li>Blob / Object Store Source Connector</li>
                                        <li>Data Stream Source Connector</li>
                                        <li>Neo4j Connector</li>
                                        <li>Debezium Connector</li>
                                    </ul>
                                </Box>}>
                                <QuestionCircleOutlined style={{ fontSize: '1.25rem' }} />
                            </HtmlTooltip>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item display="flex">
                    <IconButton
                        aria-label="close"
                        onClick={onClose}
                    >
                        <CloseOutlinedIcon />
                    </IconButton>
                </Grid>
            </Grid>
        </>
    }

    const renderDialogBox = () => {
        return <Box sx={{ p: 1, py: 1.5, maxWidth: "100%", }}>
            <DialogTitle component={Box} alignItems="center">
                {renderDialogTitle()}
            </DialogTitle>
            <DialogContent>
                <Grid container>
                    <Grid item xs={12} margin={1}>
                        <MUIForm
                            initialValues={mainFormValue}
                            subscribe={setMainFormValue}
                            onSubmit={(value: any) => onSubmission(value)}
                            fields={fieldSection}
                            size={{ xs: 12 }}
                        />
                    </Grid>
                    <Grid item xs={12} marginX={1}>
                        {mainFormValue && renderForm(mainFormValue)}
                    </Grid>
                </Grid>
            </DialogContent>
        </Box>
    }

    return renderDialogBox();
}

export default AddConnector;