import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { Box, Button, Card, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, styled } from '@mui/material';
import Actions from 'components/ActionButtons/Actions';
import { withTheme } from '@rjsf/core';
import { Theme as MuiTheme } from '@rjsf/mui';
import Ajv, { ErrorObject } from 'ajv';
import HelpSection from 'components/HelpSection/HelpSection';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { endpoints, useFetchDatasetsById, useReadConnectors, useUpdateDataset } from 'services/dataset';
import styles from './ConnectorConfiguration.module.css';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { http } from 'services/http';
import { v4 } from "uuid";
import { DatasetType } from 'types/datasets';
import Loader from 'components/Loader';

interface FormData {
    [key: string]: unknown;
}

interface Schema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

const CustomForm = withTheme(MuiTheme);
const ajv = new Ajv({ strict: false });
const GenericCard = styled(Card)(({ theme }) => ({
    outline: 'none',
    boxShadow: 'none',
    margin: theme.spacing(0, 6, 2, 2)
}));

const ConnectorConfiguration: React.FC = () => {
    const location = useLocation();
    const { datasetId }: any = useParams();
    const { selectedConnectorId, connectorConfig } = location.state || {};
    const searchParams = new URLSearchParams(location.search);
    const datasetType = searchParams.get('datasetType');
    const defaultFormData = connectorConfig ? _.get(connectorConfig, 'connector_config') : {}
    const defaultOpFormData = connectorConfig ? _.get(connectorConfig, 'operations_config') : {
        interval: 'Periodic',
        schedule: 'Hourly'
    }
    const [formData, setFormData] = useState<FormData>(defaultFormData);
    const [opFormData, setOpFormData] = useState<FormData>(defaultOpFormData);
    const [formErrors, setFormErrors] = useState<unknown[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [connectorType, setConnectorType] = useState<string>("stream");
    const [connectorHelpText, setConnectorHelpText] = useState<string | null>(null);
    const [isHelpSectionOpen, setIsHelpSectionOpen] = useState(true);
    const [schema, setSchema] = useState<Schema | null>(null);
    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
    const [primaryConnectorId, setPrimaryConnectorId] = useState<string | null>(null);

    const navigate = useNavigate();

    const customErrors = (errors: null | ErrorObject[] = []) => {
        if (_.isEmpty(errors)) return;

        _.forEach(errors, (error) => {
            const errorKey = _.get(error, ['params', 'missingProperty']);

            const errorMessage = {
                pattern: 'Invalid pattern',
                required: `Required ${errorKey}`
            };

            const keyword = _.get(error, 'keyword', '');
            const customMessage = _.get(errorMessage, [keyword], '');
            const defaultMessage = _.get(error, 'message', '');
            error.message = customMessage || defaultMessage;
        });
    };

    const validator = customizeValidator({}, customErrors);

    const handleFormDataChange = (data: FormData) => {

        const valid = ajv.validate(schema ? schema.schema : {}, data);
        if (valid) {
            setFormData(data)
            setFormErrors([]);
        } else {
            const errors = ajv.errors?.map((error) => error.message) || [];
            const updatedData = { ...formData, ...data };
            setFormErrors(errors);
            setFormData(updatedData);
        }
    };

    const getSchema = (sectionKey: string, sectionValue: any) => {
        const fieldSchema = {
            type: "object",
            properties: {
                [sectionKey]: sectionValue as RJSFSchema
            },
            required: schema && schema.schema.required && schema.schema.required.includes(sectionKey) ? [sectionKey] : []
        }
        return fieldSchema;
    }

    const getUISchema = (sectionKey: string) => {
        if (schema && schema.uiSchema[sectionKey]) {
            return {
                [sectionKey]: schema.uiSchema[sectionKey]
            }
        } else {
            const sectionValue: any = schema?.schema.properties?.[sectionKey];
            if (typeof sectionValue === 'object' && 'format' in sectionValue && sectionValue.format === 'password') {
                return {
                    [sectionKey]: {
                        'ui:widget': 'password'
                    }
                };
            }
            if (typeof sectionValue === 'object' && 'format' in sectionValue && sectionValue.format === 'hidden') {
                return {
                    [sectionKey]: {
                        'ui:widget': 'hidden'
                    }
                };
            }
        }
    }
    const readConnector = useReadConnectors({ connectorId: selectedConnectorId });
    const dataset = useFetchDatasetsById({datasetId, queryParams: 'status=Draft&mode=edit&fields=connectors_config,version_key'});
    useEffect(() => {
        if (dataset.data && dataset.data.connectors_config[0]) {
            const connectorId = _.get(dataset.data.connectors_config[0], 'connector_id')
            setPrimaryConnectorId(connectorId)
            http.get(`${endpoints.READ_CONNECTORS}/${connectorId}`).then((response: any) => {
                const connectorData = _.get(response, ['data', 'result'])
                if(connectorData) {
                    setConnectorType(_.toLower(connectorData.category));
                    const apiSchema = connectorData.ui_spec;
                    if (apiSchema) {
                        setSchema(transformSchema(apiSchema,_.toLower(connectorData.connector_id)));
                        setHelpSectionContent(apiSchema, _.toLower(connectorData.category));
                        setErrorMessage(null);
                        setFormErrors([])
                        setFormData(_.get(dataset.data.connectors_config[0], 'connector_config'));
                        setOpFormData(_.get(dataset.data.connectors_config[0], 'operations_config'));
                    } else {
                        setErrorMessage('uiSchema for this connector type not available.  Please contact administrator');
                    }
                }
            })
        } else if(readConnector.data) {
            setConnectorType(_.toLower(readConnector.data.category));
            const apiSchema = readConnector.data.ui_spec;
            if (apiSchema) {
                setSchema(transformSchema(apiSchema,readConnector.data.connector_id));
                setHelpSectionContent(apiSchema, _.toLower(readConnector.data.category));
                setErrorMessage(null);
            } else {
                setErrorMessage('uiSchema for this connector type not available.  Please contact administrator');
            }
        }
    }, [dataset.data, readConnector.data,selectedConnectorId]);

    const handleSectionClick = (sectionId: string) => {
        setHighlightedSection(sectionId);
    };

    const transformSchema = (apiSchema: any,connector_id:string): Schema => {
        const schema:any = {
            title: apiSchema.title,
            description: apiSchema.description,
            schema: {
                type: 'object',
                properties: apiSchema.properties,
                required: apiSchema.required
            },
            uiSchema: {}
        };

        // If this is a Kafka connector and has consumer_id field
        if (schema.schema.properties.source_kafka_consumer_id) {
            schema.schema.properties.source_kafka_consumer_id = {
                ...schema.schema.properties.source_kafka_consumer_id,
                default:datasetId === '<new>' ? `${connector_id}-${v4().slice(0,6)}` :  `${datasetId}-${connector_id}_${v4().slice(0,6)}`
            };
            schema.uiSchema.source_kafka_consumer_id = {
                'ui:disabled': true
            };
        }
        return schema;
    };

    const setHelpSectionContent = (schema: any, connectorType: string): string[] => {

        const combinedHelp: string[] = [];
        if (schema?.properties) {
            combinedHelp.push(`
                <div class="displayContent">
                    <h1 class="contentsHeader">${schema.title}</h1>
                    <div class="contentBody">${schema.helptext || schema.description}</div>
            `);

            let firstProperty: string | undefined = undefined;
            _.forIn(schema.properties, function (value, key) {
                if (!firstProperty) {
                    firstProperty = key;
                }
                if (value.format !== "hidden") {
                    combinedHelp.push(`
                        <section id="${key}" class="section">
                            <header class="displayContent">
                                <h3 class="contentsHeader">${value.title}</h3>
                            </header>
                            <div class="contentBody">
                                ${value.helptext || value.description}
                            </div>
                        </section>
                    `);
                }
            });
            // Add operations help text
            if(connectorType === 'batch') {
                combinedHelp.push(`
                    <section id="op_interval" class="section">
                        <header class="displayContent">
                            <h3 class="contentsHeader">Polling Interval</h3>
                        </header>
                        <div class="contentBody">
                            <p>Select how often the connector should poll for new data:</p>
                            <ul>
                                <li><strong>Periodic:</strong> Runs the connector at regular intervals, based on the specified polling frequency. Use this option if you need the connector to fetch data repeatedly.</li>
                                <li><strong>Once:</strong> Runs the connector a single time. Use this option for a one-time data fetch.</li>
                            </ul>
                            <p>Select the appropriate option based on your data requirements. For now only periodic is supported</p>
                        </div>
                    </section>
                    <section id="op_schedule" class="section">
                        <header class="displayContent">
                            <h3 class="contentsHeader">Polling Schedule</h3>
                        </header>
                        <div class="contentBody">
                            <p>Select the frequency at which the connector should poll for data. This setting is available only when the polling interval is set to "Periodic."</p>
                            <ul>
                                <li><strong>Hourly:</strong> The connector polls once every hour.</li>
                                <li><strong>Daily:</strong> The connector polls once a day.</li>
                                <li><strong>Weekly:</strong> The connector polls once a week.</li>
                                <li><strong>Monthly:</strong> The connector polls once a month.</li>
                            </ul>
                            <p>Choose the frequency that aligns with your data update requirements.</p>
                        </div>
                    </section>
                `);
            }
            combinedHelp.push(`</div>`);
            setConnectorHelpText(combinedHelp.join(''));
            setHighlightedSection(firstProperty || '');
        }

        return combinedHelp;
    };

    const updateDataset = useUpdateDataset();

    const handleButtonClick = () => {

        if(datasetId === '<new>') {
            const queryParams = `?step=connector&skipped=false&completed=true${datasetType === DatasetType.MasterDataset ? '&datasetType=master' : ''}`;
            navigate(`/dataset/edit/ingestion/meta/${datasetId}${queryParams}`, {
                state: {
                    connectorConfig: {
                        id: selectedConnectorId,
                        connector_id: selectedConnectorId,
                        connector_config: formData || {},
                        operations_config: connectorType === 'stream' ? {} : opFormData || {},
                    },
                    selectedConnectorId
                }
            });
        } else {
            updateDataset.mutate(
                {
                    data: {
                        dataset_id: datasetId,
                        connectors_config: [{
                            value: {
                                id: `${datasetId}-${primaryConnectorId || selectedConnectorId}`,
                                connector_id: primaryConnectorId || selectedConnectorId,
                                connector_config: formData || {},
                                operations_config: connectorType === 'stream' ? {} : opFormData || {},
                                version: 'v2'
                            },
                            action: "upsert"
                        }]
                    }
                },
                {
                    onSuccess: () => {
                        const queryParams = `?step=connector&skipped=false&completed=true${ datasetType=== DatasetType.MasterDataset ? '&datasetType=master' : ''}`;
                        navigate(`/dataset/edit/ingestion/meta/${datasetId}${queryParams}`);
                    }
                }
            );
        }
    };

    const handleHelpSectionToggle = () => {
        setIsHelpSectionOpen(!isHelpSectionOpen);
    };

    const handleBack = () => {
        const queryParams = datasetType === DatasetType.MasterDataset ? '?datasetType=master' : '';
        navigate(`/dataset/edit/connector/list/${datasetId}${queryParams}`);
    };

    const handleIntervalChange = (e: SelectChangeEvent) => {

        const newOpFormData = { ...opFormData };
        newOpFormData.interval = e.target.value;
        if (newOpFormData.interval === 'Once') {
            newOpFormData.schedule = '';
        }
        setOpFormData(newOpFormData);
    };

    const handleScheduleChange = (e: SelectChangeEvent) => {
        const newOpFormData = { ...opFormData };
        newOpFormData.schedule = e.target.value;
        setOpFormData(newOpFormData);
    };
    
    return (
        <>
        {readConnector.isLoading ? <Loader loading={true} /> : <Box ml={1}>
            {datasetId && datasetId === '<new>' && (
                <Box mx={2}>
                    <Button
                        variant="back"
                        startIcon={<KeyboardBackspaceIcon className={styles.iconStyle} />}
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                </Box>
            )}

            <Box
                className={`${styles.formContainer} ${isHelpSectionOpen ? styles.expanded : styles.collapsed}`}
                pr={2}
                sx={{ boxShadow: 'none', pb: '5rem' }}
            >
                {errorMessage ? (
                    <Typography variant="h6" color="error" textAlign="center" py={32}>
                        {errorMessage}
                    </Typography>
                ) : (
                    <>
                        <GenericCard className={styles.title}>
                            <Box className={styles?.heading}>
                                <Typography variant='h1'>{schema?.title}</Typography>
                            </Box>

                            <Grid container columnSpacing={3} className={styles?.gridContainer} justifyContent={'flex-start'}>
                                {schema && schema.schema.properties && _.sortBy(_.entries(schema.schema.properties), [([, value]) => (value as any).uiIndex]).map(([sectionKey, sectionValue]) => {
                                    return (
                                        <Grid item xs={12} sm={6} lg={6}
                                            key={sectionKey}
                                            onClick={() => handleSectionClick(sectionKey)}
                                        >
                                            <CustomForm
                                                schema={getSchema(sectionKey, sectionValue) as RJSFSchema}
                                                uiSchema={getUISchema(sectionKey)}
                                                formData={formData as FormData}
                                                validator={validator}
                                                showErrorList={false}
                                                onChange={(e) => {
                                                    handleSectionClick(sectionKey)
                                                    handleFormDataChange(e.formData);
                                                }}
                                                liveValidate={true}
                                                templates={{
                                                    ButtonTemplates: {
                                                        SubmitButton: () => null
                                                    }
                                                }}
                                                onBlur={() => handleSectionClick(sectionKey)}
                                                onFocus={() => handleSectionClick(sectionKey)}
                                            />
                                        </Grid>
                                    );
                                })}
                            </Grid>

                        </GenericCard>

                        {connectorType === 'batch' && (
                            <GenericCard className={styles.title}>
                                <Box className={styles?.heading} sx={{ mb: 2 }}>
                                    <Typography variant='h1'>Configure Fetch Settings</Typography>
                                </Box>

                                <Grid container columnSpacing={3} rowSpacing={1} className={styles?.gridContainer}>
                                    <Grid item xs={12} sm={6} lg={6}>
                                        <FormControl fullWidth required>
                                            <InputLabel id="interval-label">Polling Interval</InputLabel>
                                            <Select
                                                labelId="interval-label"
                                                id="interval"
                                                value={opFormData.interval as string}
                                                label={'Polling Interval'}
                                                variant="outlined"
                                                onChange={handleIntervalChange}
                                                onFocus={(event) => handleSectionClick("op_interval")}
                                                onBlur={(event) => handleSectionClick("op_interval")}
                                                required
                                                fullWidth
                                            >
                                                <MenuItem value={'Periodic'}>Periodic</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={6} lg={6}>
                                        <FormControl fullWidth required={opFormData.interval === 'Periodic'} disabled={opFormData.interval !== 'Periodic'}>
                                            <InputLabel id="schedule-label">Schedule</InputLabel>
                                            <Select
                                                labelId="schedule-label"
                                                id="schedule"
                                                value={opFormData.schedule as string}
                                                label={'Schedule'}
                                                variant="outlined"
                                                fullWidth
                                                onChange={handleScheduleChange}
                                                onFocus={(event) => handleSectionClick("op_schedule")}
                                                onBlur={(event) => handleSectionClick("op_schedule")}
                                            >
                                                <MenuItem value={'Hourly'}>Hourly</MenuItem>
                                                <MenuItem value={'Daily'}>Daily</MenuItem>
                                                <MenuItem value={'Weekly'}>Weekly</MenuItem>
                                                <MenuItem value={'Monthly'}>Monthly</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            </GenericCard>
                        )}
                    </>
                )}
            </Box>
            <Box
                className={`${isHelpSectionOpen ? styles.expanded : styles.collapsed}`}
                mt={8}
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    right: 0,
                    left: -50,
                    zIndex: 100
                }}
                pr={5}
            >
                <Actions
                    buttons={[
                        {
                            id: 'btn1',
                            label: 'Proceed',
                            variant: 'contained',
                            color: 'primary',
                            disabled: formErrors.length > 0
                        }
                    ]}
                    onClick={handleButtonClick}
                />
            </Box>
            <HelpSection
                helpSection={{
                    defaultHighlight: highlightedSection || "section0",
                    contents: connectorHelpText || ""
                }}
                highlightSection={highlightedSection}
                onExpandToggle={handleHelpSectionToggle}
                expand={isHelpSectionOpen}
            />
        </Box>}
        </>
    );
};

export default ConnectorConfiguration;