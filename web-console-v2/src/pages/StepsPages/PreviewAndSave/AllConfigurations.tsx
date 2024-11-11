import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import { Box, Grid, Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Toolbar, Typography } from '@mui/material';
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import MuiAccordionSummary, {
    AccordionSummaryProps,
} from '@mui/material/AccordionSummary';
import { styled } from '@mui/material/styles';
import { render } from '@testing-library/react';
import Loader from 'components/Loader';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { endpoints, useFetchDatasetsById } from 'services/dataset';
import { http } from 'services/http';

interface TransformationRow {
    field_key: string;
    transformation_function: {
        type: string;
        expr: string;
    };
}

const AllConfigurations = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { datasetId }: any = useParams();
    const [datasetName, setDatasetName] = useState<any>('');
    const [connectorMeta, setConnectorMeta] = useState<any>(undefined);
    const [connectorConfig, setConnectorConfig] = useState<any>(undefined);
    const [dataSchema, setDataSchema] = useState<any>(undefined);

    const response = useFetchDatasetsById({
        datasetId,
        queryParams: 'status=Draft&mode=edit&fields=dataset_id,name,data_schema,transformations_config,connectors_config,validation_config,dedup_config,denorm_config,dataset_config,type'
    });

    useEffect(() => {
        if (response.data) {
            const dataset = response.data;
            setDatasetName(dataset.name);
            setDataSchema(_.get(dataset, 'data_schema', {}));
            const validationConfig = _.get(dataset, 'validation_config', {});
            const denormData = _.get(dataset, 'denorm_config.denorm_fields', []);
            const transformationData = _.get(dataset, 'transformations_config', []);
            const connectorConfigData = _.get(dataset, ['connectors_config'], []);
            const storageKeys = _.get(dataset, ['dataset_config', 'keys_config'], []);
            const storageType = _.get(dataset, ['dataset_config', 'indexing_config'], []);
            const datasetType = _.get(dataset, 'type');
            const { olap_store_enabled, lakehouse_enabled, cache_enabled } = storageType;
            if (connectorConfigData.length > 0) {
                setConnectorConfig(connectorConfigData[0]);
                const connectorId = connectorConfigData[0].connector_id;
                http.get(`${endpoints.READ_CONNECTORS}/${connectorId}`).then((response: any) => {
                    const connectorData = _.get(response, ['data', 'result'])
                    if (connectorData) {
                        setConnectorMeta(connectorData)
                    }
                })
            }
        }
    }, [response.data])


    const [expanded, setExpanded] = React.useState<string | false>('panel1');

    const handleChange = (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
        setExpanded(newExpanded ? panel : false);
    };

    const Accordion = styled((props: AccordionProps) => (
        <MuiAccordion disableGutters elevation={0} square {...props} />
    ))(({ theme }) => ({
        border: `1px solid ${theme.palette.divider}`,
        '&:not(:last-child)': {
            borderBottom: 0,
        },
        '&::before': {
            display: 'none',
        },
    }));

    const AccordionSummary = styled((props: AccordionSummaryProps) => (
        <MuiAccordionSummary
            expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />}
            {...props}
        />
    ))(({ theme }) => ({
        backgroundColor:
            theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, .05)'
                : 'rgba(0, 0, 0, .03)',
        flexDirection: 'row-reverse',
        '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
            transform: 'rotate(90deg)',
        },
        '& .MuiAccordionSummary-content': {
            marginLeft: theme.spacing(1),
        },
    }));

    const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
        padding: theme.spacing(2),
        borderTop: '1px solid rgba(0, 0, 0, .125)',
    }));

    const StyledTableRow = styled(TableRow)(({ theme }) => ({
        '&:nth-of-type(odd)': {
            backgroundColor: theme.palette.action.hover,
        },
        // hide last border
        '&:last-child td, &:last-child th': {
            border: 0,
        },
    }));

    const RenderFieldRows:React.FC = (parent: any, properties: any) => {
        return (
        <>
        {properties && _.entries(properties).map(([key, value]) => (
            <>
            <StyledTableRow key={key} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell align="left">{parent?parent+'.':''}{key}</TableCell>
                <TableCell align="left">{(value as any).arrival_format}</TableCell>
                <TableCell align="left">{(value as any).data_type}</TableCell>
                <TableCell align="left"><Switch disabled checked={(value as any).isRequired}/></TableCell>
            </StyledTableRow>
            {value && RenderFieldRows(key, (value as any).properties)}
            </>
        ))}
        </>
    )}

    return (
        <Box>
            {(response.isPending) ? <Loader loading={response.isPending} descriptionText="Loading the page" /> : 
            <Box>
                <Accordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
                    <AccordionSummary aria-controls="panel1d-content" id="panel1d-header" disabled={!connectorConfig}>
                        <Typography variant='h6'>Connector - {connectorConfig && connectorMeta ? connectorMeta.name : 'No connector configured'}</Typography>
                    </AccordionSummary>
                    {connectorMeta && (
                        <AccordionDetails>
                            <Grid container columnSpacing={3} justifyContent={'flex-start'}>
                                <Grid item xs={14} sm={7} lg={7}>
                                    <TableContainer component={Paper} >
                                        <Table size="small" aria-label="a dense table">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell align="left" colSpan={2}>
                                                        Configuration
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell align="left" width={'50%'}>Config</TableCell>
                                                    <TableCell align="left" width={'50%'}>Value</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {connectorConfig && _.entries(connectorConfig.connector_config).map(([configKey, configValue]) => (
                                                    <StyledTableRow key={configKey} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                        <TableCell align="left">{connectorMeta.ui_spec.properties[configKey].title}</TableCell>
                                                        <TableCell align="left">{String(configValue)}</TableCell>
                                                    </StyledTableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Grid>
                                {connectorConfig.operations_config && (
                                    <Grid item xs={10} sm={5} lg={5}>
                                        <TableContainer component={Paper}>
                                            <Table size="small" aria-label="a dense table">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell align="left" colSpan={2}>
                                                            Fetch Configuration
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell align="left" width={'50%'}>Config</TableCell>
                                                        <TableCell align="left" width={'50%'}>Value</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {connectorConfig && _.entries(connectorConfig.operations_config).map(([configKey, configValue]) => (
                                                        <StyledTableRow key={configKey} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                            <TableCell align="left">{configKey == 'interval' ? 'Polling Interval' : 'Polling Schedule'}</TableCell>
                                                            <TableCell align="left">{String(configValue)}</TableCell>
                                                        </StyledTableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Grid>
                                )}
                            </Grid>
                        </AccordionDetails>
                    )}
                </Accordion>
                <Accordion expanded={expanded === 'panel2'} onChange={handleChange('panel2')}>
                    <AccordionSummary aria-controls="panel2d-content" id="panel2d-header">
                        <Typography variant='h6'>Ingestion</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <TableContainer component={Paper} sx={{width: '60%'}}>
                            <Table size="small" aria-label="a dense table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="left" width={'50%'}>Dataset Name</TableCell>
                                        <TableCell align="left" width={'50%'}>Dataset ID</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left">{datasetName}</TableCell>
                                        <TableCell align="left">{datasetId}</TableCell>
                                    </StyledTableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Paper sx={{ width: '100%', overflow: 'hidden', mt: '20px' }}>
                            <TableContainer sx={{maxHeight: 440, width: '80%'}}>
                                <Table stickyHeader size="small" aria-label="a dense table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell align="left" width={'55%'}>Field</TableCell>
                                            <TableCell align="left" width={'15%'}>Arrival Format</TableCell>
                                            <TableCell align="left" width={'15%'}>Data Type</TableCell>
                                            <TableCell align="left" width={'15%'}>Required</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dataSchema && RenderFieldRows('', dataSchema.properties)}  
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </AccordionDetails>
                </Accordion>
                <Accordion expanded={expanded === 'panel3'} onChange={handleChange('panel3')}>
                    <AccordionSummary aria-controls="panel3d-content" id="panel3d-header">
                        <Typography variant='h6'>Processing</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography>
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
                            malesuada lacus ex, sit amet blandit leo lobortis eget. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex,
                            sit amet blandit leo lobortis eget.
                        </Typography>
                    </AccordionDetails>
                </Accordion>
                <Accordion expanded={expanded === 'panel4'} onChange={handleChange('panel4')}>
                    <AccordionSummary aria-controls="panel4d-content" id="panel4d-header">
                        <Typography variant='h6'>Storage</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography>
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
                            malesuada lacus ex, sit amet blandit leo lobortis eget. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex,
                            sit amet blandit leo lobortis eget.
                        </Typography>
                    </AccordionDetails>
                </Accordion>
            </Box>
            }
        </Box>
    );
}

export default AllConfigurations;
