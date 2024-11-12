import React from "react";
import * as _ from "lodash";
import { downloadJSONSchemaV1 } from 'services/json-schema';
import { downloadJsonFileV1 } from 'utils/downloadUtils';
import { DownloadOutlined } from '@ant-design/icons';
import { Button, Grid, Stack, Typography, Box } from '@mui/material';
import AllConfigurations from "pages/StepsPages/PreviewAndSave/AllConfigurations";
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { useNavigate } from 'react-router-dom';

const ReviewAllCongurations = ({ master, datasetState, datasetName }: any) => {
    const dataset_state = !_.isEmpty(datasetState) ? datasetState : "";
    const jsonSchema = _.get(dataset_state, 'pages.jsonSchema');
    const flattenedData = _.get(dataset_state, ['pages', 'columns', 'state', 'schema']);
    const navigate = useNavigate();


    const handleDownloadButton = () => {
        let data: Record<string, any> = _.get(jsonSchema, "schema");
        if (flattenedData) {
            data = _.get(downloadJSONSchemaV1(jsonSchema, { schema: flattenedData }), 'schema');
        }
        downloadJsonFileV1(data, 'json-schema', true);
    }

    const datasetActions: any = [
        {
            label: "Download Schema",
            value: "downloadSchema",
            onClick: handleDownloadButton,
            icon: <DownloadOutlined />,
            disabled: false,
            display: true
        }
    ]

    const renderDatasetActions = (action: Record<string, any>) => {
        const { label, value, onClick, icon, disabled, display } = action;
        if (!display) return null;
        return <>
            <Button key={value}
                variant="contained" size="small" type="button" onClick={onClick} startIcon={icon} disabled={disabled}>
                <Typography sx={{ color: '#ffffff' }}>{label}</Typography>
            </Button>
        </>
    }

    return <>
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Box>
                <Button
                    variant="back"
                    startIcon={
                        <KeyboardBackspaceIcon
                        />
                    }
                    onClick={() => navigate(`/datasets`)}
                >
                    Back
                </Button>
            </Box>
            <Grid container spacing={1}>
                <Grid item xs={12}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {_.map(datasetActions, renderDatasetActions)}
                    </Stack>
                </Grid>
                <Grid item xs={12}>
                </Grid>
            </Grid>
        </Box>
        <Typography variant="h1Secondary" sx={{ my: '0.5rem' }}>{_.capitalize(datasetName)}</Typography>
        <AllConfigurations />
    </>
}

export default ReviewAllCongurations