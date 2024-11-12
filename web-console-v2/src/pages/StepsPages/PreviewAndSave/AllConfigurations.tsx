import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import { Box, Checkbox, Grid, Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Toolbar, Typography } from '@mui/material';
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
import { datasetRead } from 'services/datasetV1';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Collapse from '@mui/material/Collapse';

interface TransformationRow {
    field_key: string;
    transformation_function: {
        type: string;
        expr: string;
    };
}

const datasetTypeMapping = {
    'event': 'Event/Telemetry Data',
    'transaction': 'Data Changes (Updates or Transactions)',
    'master': 'Master Data'
}

const DenormRow = ({ value }: any) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell align="left">{value?.denorm_key}</TableCell>
                <TableCell align="left">{value?.name}</TableCell>
                <TableCell>
                    Show Fields
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Table stickyHeader size="small" aria-label="a dense table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="left" width={'50%'}>Field</TableCell>
                                        <TableCell align="left" width={'20%'}>Arrival Format</TableCell>
                                        <TableCell align="left" width={'15%'}>Data Type</TableCell>
                                        <TableCell align="left" width={'15%'}>Required</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {value.data_schema.properties && _.entries(value.data_schema.properties).map(([key, value]) => (
                                        <>
                                        <TableRow key={key} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell align="left">{key}</TableCell>
                                            <TableCell align="left">{(value as any).arrival_format}</TableCell>
                                            <TableCell align="left">{(value as any).data_type}</TableCell>
                                            <TableCell align="left"><Switch disabled checked={(value as any).isRequired}/></TableCell>
                                        </TableRow>
                                        </>
                                    ))} 
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

const AllConfigurations = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { datasetId }: any = useParams();
    const [datasetName, setDatasetName] = useState<any>('');
    const [connectorMeta, setConnectorMeta] = useState<any>(undefined);
    const [connectorConfig, setConnectorConfig] = useState<any>(undefined);
    const [dataSchema, setDataSchema] = useState<any>(undefined);
    const [datasetType, setDatasetType] = useState<string>('');
    const [indexingConfig, setIndexingConfig] = useState<any>(undefined);
    const [keysConfig, setKeysConfig] = useState<any>(undefined);
    const [validationConfig, setValidationConfig] = useState<any>(undefined);
    const [dedupConfig, setDedupConfig] = useState<any>(undefined);
    const [sensitiveFields, setSensitiveFields] = useState<any[]>([]);
    const [derivedFields, setDerivedFields] = useState<any[]>([]);
    const [transformFields, setTransformFields] = useState<any[]>([]);
    const [dataDenormalizations, setDataDenormalizations] = useState<any[]>([])
    const [openRows, setOpenRows] = useState<any>({});;

    const response = useFetchDatasetsById({
        datasetId,
        queryParams: 'status=Draft&mode=edit&fields=dataset_id,name,data_schema,transformations_config,connectors_config,validation_config,dedup_config,denorm_config,dataset_config,type'
    });

    useEffect(() => {
        if (response.data) {
            const dataset = response.data;
            setDatasetName(dataset.name);
            setDataSchema(_.get(dataset, 'data_schema', {}));
            const denormData = _.get(dataset, 'denorm_config.denorm_fields', []);
            const transformationData = _.get(dataset, 'transformations_config', []);
            const connectorConfigData = _.get(dataset, ['connectors_config'], []);
            setValidationConfig(_.get(dataset, 'validation_config', {}));
            setDedupConfig(_.get(dataset, 'dedup_config', {}));
            setKeysConfig(_.get(dataset, ['dataset_config', 'keys_config'], {}));
            setIndexingConfig(_.get(dataset, ['dataset_config', 'indexing_config'], {}));
            setDatasetType(_.get(dataset, 'type'));
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
            const dataDenormalizations:any[] = [];
            const sensitiveFields:any[] = [];
            const transformations:any[] = [];
            const derived:any[] = [];
            if(transformationData.length > 0) {
                _.forEach(transformationData, (transformation) => {
                    const mergedTF = {
                        field: transformation['field_key'],
                        ...transformation['transformation_function'],
                        mode: transformation['mode']
                    }
                    if(mergedTF['category'] === 'pii' || mergedTF['type'] !== 'jsonata') {
                        sensitiveFields.push(mergedTF)
                    } else if (mergedTF['category'] === 'transform') {
                        transformations.push(mergedTF);
                    } else {
                        derived.push(mergedTF);
                    }
                })
                setSensitiveFields(sensitiveFields);
                setDerivedFields(derived);
                setTransformFields(transformations);
            }
            if(denormData.length > 0) {
                _.forEach(denormData, async (denorm) => {
                    const datasetResponse = await datasetRead({ datasetId: `${denorm.dataset_id}?fields=data_schema,name` }).then(response => _.get(response, 'data.result'));
                    const denormData = {
                        ...denorm,
                        name: _.get(datasetResponse, 'name'),
                        data_schema: _.get(datasetResponse, 'data_schema')
                    }
                    dataDenormalizations.push(denormData);
                })
                setDataDenormalizations(dataDenormalizations)
            }
        }
    }, [response.data])


    const [expanded, setExpanded] = React.useState<string | false>('connector');

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
                <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{parent?parent+'.':''}{key}</TableCell>
                <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{(value as any).arrival_format}</TableCell>
                <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{(value as any).data_type}</TableCell>
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
                <Accordion expanded={expanded === 'connector'} onChange={handleChange('connector')}>
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
                                                    <TableCell align="left" width={'50%'} sx={{ borderRight: '1px solid #ddd !important' }}>Config</TableCell>
                                                    <TableCell align="left" width={'50%'} >Value</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {connectorConfig && _.entries(connectorConfig.connector_config).map(([configKey, configValue]) => (
                                                    <StyledTableRow key={configKey} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{connectorMeta.ui_spec?.properties[configKey]?.title}</TableCell>
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
                                                        <TableCell align="left" width={'50%'} sx={{ borderRight: '1px solid #ddd !important' }}>Config</TableCell>
                                                        <TableCell align="left" width={'50%'}>Value</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {connectorConfig && _.entries(connectorConfig.operations_config).map(([configKey, configValue]) => (
                                                        <StyledTableRow key={configKey} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                            <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{configKey == 'interval' ? 'Polling Interval' : 'Polling Schedule'}</TableCell>
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
                <Accordion expanded={expanded === 'ingestion'} onChange={handleChange('ingestion')}>
                    <AccordionSummary aria-controls="panel2d-content" id="panel2d-header">
                        <Typography variant='h6'>Ingestion</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <TableContainer component={Paper} sx={{width: '80%'}}>
                            <Table size="small" aria-label="a dense table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="left" width={'40%'} sx={{ borderRight: '1px solid #ddd !important' }}>Dataset Name</TableCell>
                                        <TableCell align="left" width={'30%'} sx={{ borderRight: '1px solid #ddd !important' }}>Dataset ID</TableCell>
                                        <TableCell align="left" width={'30%'}>Dataset Type</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{datasetName}</TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{datasetId}</TableCell>
                                        <TableCell align="left">{_.get(datasetTypeMapping, datasetType)}</TableCell>
                                    </StyledTableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Paper sx={{ width: '80%', overflow: 'hidden', mt: '20px' }}>
                            <TableContainer sx={{maxHeight: 440}}>
                                <Table stickyHeader size="small" aria-label="a dense table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell align="left" colSpan={4}>
                                                Data Schema
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell align="left" width={'50%'} sx={{ borderRight: '1px solid #ddd !important' }}>Field</TableCell>
                                            <TableCell align="left" width={'20%'} sx={{ borderRight: '1px solid #ddd !important' }}>Arrival Format</TableCell>
                                            <TableCell align="left" width={'15%'} sx={{ borderRight: '1px solid #ddd !important' }}>Data Type</TableCell>
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
                <Accordion expanded={expanded === 'processing'} onChange={handleChange('processing')}>
                    <AccordionSummary aria-controls="panel3d-content" id="panel3d-header">
                        <Typography variant='h6'>Processing</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <TableContainer component={Paper} sx={{width: '70%'}}>
                            <Table size="small" aria-label="a dense table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="left" colSpan={3}>Configurations</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" width={'35%'} sx={{ borderRight: '1px solid #ddd !important' }}>Add New Fields</TableCell>
                                        <TableCell align="left" width={'10%'} sx={{ borderRight: '1px solid #ddd !important' }}>{validationConfig && validationConfig.mode === 'Strict' ? 'No' : 'Yes'}</TableCell>
                                        <TableCell align="left" width={'55%'}>{validationConfig && validationConfig.mode === 'Strict' ? 'Events will be skipped if there are unknown fields' : 'Events will be processed even if there are unknown fields'}</TableCell>
                                    </StyledTableRow>
                                    <StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" width={'35%'} sx={{ borderRight: '1px solid #ddd !important' }}>Enable Deduplication</TableCell>
                                        <TableCell align="left" width={'10%'} sx={{ borderRight: '1px solid #ddd !important' }}>{dedupConfig && dedupConfig.drop_duplicates ? 'Yes' : 'No'}</TableCell>
                                        <TableCell align="left" width={'55%'}>Dedupe Key: {dedupConfig ? dedupConfig?.dedup_key: 'Not Applicable'}</TableCell>
                                    </StyledTableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TableContainer component={Paper} sx={{width: '80%', mt: '15px'}}>
                            <Table size="small" aria-label="a dense table">
                                <TableHead>
                                    <StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" colSpan={3}>Data Denormalization</TableCell>
                                    </StyledTableRow>
                                    <TableRow>
                                        <TableCell align="left" width={'40%'} sx={{ borderRight: '1px solid #ddd !important' }}>Dataset Field</TableCell>
                                        <TableCell align="left" width={'40%'} sx={{ borderRight: '1px solid #ddd !important' }}>Master Dataset</TableCell>
                                        <TableCell align="left" width={'20%'} sx={{ borderRight: '1px solid #ddd !important' }}></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {dataDenormalizations.length === 0 &&
                                        (<StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell align="center" colSpan={3}>No fields are added for denormalization</TableCell>
                                        </StyledTableRow>)
                                    }
                                    {dataDenormalizations.length > 0 && dataDenormalizations.map((value) => (
                                        <React.Fragment key={value.field}>
                                            <DenormRow value={value} />
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TableContainer component={Paper} sx={{width: '80%', mt: '15px'}}>
                            <Table size="small" aria-label="a dense table">
                                <TableHead>
                                    <StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" colSpan={4}>Data Privacy</TableCell>
                                    </StyledTableRow>
                                    <TableRow>
                                        <TableCell align="left" width={'45%'} sx={{ borderRight: '1px solid #ddd !important' }}>Field</TableCell>
                                        <TableCell align="left" width={'15%'} sx={{ borderRight: '1px solid #ddd !important' }}>Data Type</TableCell>
                                        <TableCell align="left" width={'10%'} sx={{ borderRight: '1px solid #ddd !important' }}>Action</TableCell>
                                        <TableCell align="left" width={'30%'}>Skip Record on Failure?</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                {sensitiveFields.length === 0 &&
                                    (<StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="center" colSpan={4}>No senstive fields have been added</TableCell>
                                    </StyledTableRow>)
                                }
                                {sensitiveFields.length > 0 && sensitiveFields.map((value) => (
                                    <StyledTableRow key={value.field} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{value.field}</TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{_.capitalize(value.datatype)}</TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{_.capitalize(value.type)}</TableCell>
                                        <TableCell align="left">{value.mode === 'Strict' ? 'Yes': 'No'}</TableCell>
                                    </StyledTableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TableContainer component={Paper} sx={{width: '80%', mt: '15px'}}>
                            <Table size="small" aria-label="a dense table">
                                <TableHead>
                                    <StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" colSpan={4}>Data Transformations</TableCell>
                                    </StyledTableRow>
                                    <TableRow>
                                        <TableCell align="left" width={'45%'} sx={{ borderRight: '1px solid #ddd !important' }}>Field</TableCell>
                                        <TableCell align="left" width={'15%'} sx={{ borderRight: '1px solid #ddd !important' }}>Data Type</TableCell>
                                        <TableCell align="left" width={'10%'} sx={{ borderRight: '1px solid #ddd !important' }}>Transformation</TableCell>
                                        <TableCell align="left" width={'30%'}>Skip Record on Failure?</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                {transformFields.length === 0 &&
                                    (<StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="center" colSpan={4}>No transformation fields have been added</TableCell>
                                    </StyledTableRow>)
                                }
                                {transformFields.length > 0 && transformFields.map((value) => (
                                    <StyledTableRow key={value.field} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{value.field}</TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{_.capitalize(value.datatype)}</TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{_.capitalize(value.expr)}</TableCell>
                                        <TableCell align="left">{value.mode === 'Strict' ? 'Yes': 'No'}</TableCell>
                                    </StyledTableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TableContainer component={Paper} sx={{width: '80%', mt: '15px'}}>
                            <Table size="small" aria-label="a dense table">
                                <TableHead>
                                    <StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" colSpan={4}>Derived Fields</TableCell>
                                    </StyledTableRow>
                                    <TableRow>
                                    <TableCell align="left" width={'45%'} sx={{ borderRight: '1px solid #ddd !important' }}>Field</TableCell>
                                        <TableCell align="left" width={'15%'} sx={{ borderRight: '1px solid #ddd !important' }}>Data Type</TableCell>
                                        <TableCell align="left" width={'10%'} sx={{ borderRight: '1px solid #ddd !important' }}>Transformation</TableCell>
                                        <TableCell align="left" width={'30%'}>Skip Record on Failure?</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                {derivedFields.length === 0 &&
                                    (<StyledTableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="center" colSpan={4}>No derived fields have been added</TableCell>
                                    </StyledTableRow>)
                                }
                                {derivedFields.length > 0 && derivedFields.map((value) => (
                                    <StyledTableRow key={value.field} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{value.field}</TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{_.capitalize(value.datatype)}</TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{_.capitalize(value.expr)}</TableCell>
                                        <TableCell align="left">{value.mode === 'Strict' ? 'Yes': 'No'}</TableCell>
                                    </StyledTableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </AccordionDetails>
                </Accordion>
                <Accordion expanded={expanded === 'storage'} onChange={handleChange('storage')}>
                    <AccordionSummary aria-controls="panel4d-content" id="panel4d-header">
                        <Typography variant='h6'>Storage</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <TableContainer component={Paper} sx={{width: '100%'}}>
                            <Table size="small" aria-label="a dense table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="left" width={'15%'} sx={{ borderRight: '1px solid #ddd !important' }}>Lakehouse (Hudi)</TableCell>
                                        <TableCell align="left" width={'18%'} sx={{ borderRight: '1px solid #ddd !important' }}>Real-time Store (Druid)</TableCell>
                                        <TableCell align="left" width={'18%'} sx={{ borderRight: '1px solid #ddd !important' }}>Cache Store (Redis)</TableCell>
                                        <TableCell align="left" width={'17%'} sx={{ borderRight: '1px solid #ddd !important' }}>Primary Key</TableCell>
                                        <TableCell align="left" width={'17%'} sx={{ borderRight: '1px solid #ddd !important' }}>Timestamp Key</TableCell>
                                        <TableCell align="left" width={'15%'}>Partition Key</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}><Checkbox readOnly checked={indexingConfig?.lakehouse_enabled} /></TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}><Checkbox readOnly checked={indexingConfig?.olap_store_enabled} /></TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}><Checkbox readOnly checked={indexingConfig?.cache_enabled} /></TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{keysConfig?.data_key}</TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{keysConfig?.timestamp_key}</TableCell>
                                        <TableCell align="left">{keysConfig?.partition_key}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </AccordionDetails>
                </Accordion>
            </Box>
            }
        </Box>
    );
}

export default AllConfigurations;