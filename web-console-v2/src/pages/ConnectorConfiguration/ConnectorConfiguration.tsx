import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { Box, Button, Card, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, styled } from '@mui/material';
import Actions from 'components/ActionButtons/Actions';
import { withTheme } from '@rjsf/core';
import { Theme as MuiTheme } from '@rjsf/mui';
import Ajv, { ErrorObject } from 'ajv';
import HelpSection from 'components/HelpSection/HelpSection';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getConfigValue } from 'services/configData';
import { useFetchDatasetsById, useReadConnectors } from 'services/dataset';
import { theme } from 'theme';
import { deleteSessionStorageItem, fetchSessionStorageItem, storeSessionStorageItem } from 'utils/sessionStorage';
import styles from './ConnectorConfiguration.module.css';
import sampleSchema from './Schema';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { RJSFSchema, UiSchema } from '@rjsf/utils';

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

    const [opFormData, setOpFormData] = useState<FormData>({
        interval: 'Periodic',
        schedule: 'Hourly'
    });
    const [formData, setFormData] = useState<FormData>({});
    const [formErrors, setFormErrors] = useState<unknown[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [connectorType, setConnectorType] = useState<string>("stream");
    const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
    const [connectorHelpText, setConnectorHelpText] = useState<string | null>(null);
    const [isHelpSectionOpen, setIsHelpSectionOpen] = useState(true);
    const [schema, setSchema] = useState<Schema>(sampleSchema);
    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

    const location = useLocation();

    const { selectedCardId, selectedCardName } = location.state || {};
    const readConnector = useReadConnectors({ connectorId: selectedCardId });
    const navigate = useNavigate();
    const datasetId = getConfigValue('dataset_id');

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
        console.log(`data`, data)

        const valid = ajv.validate(schema.schema, data);
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
            required: schema.schema.required && schema.schema.required.includes(sectionKey) ? [sectionKey] : []
        }
        return fieldSchema;
    }

    const getUISchema = (sectionKey: string) => {
        if (schema.uiSchema[sectionKey]) {
            return {
                [sectionKey]: schema.uiSchema[sectionKey]
            }
        } else {
            const sectionValue: any = schema.schema.properties?.[sectionKey];
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

    const fetchDatasetById = useFetchDatasetsById({
        datasetId,
        queryParams: 'status=Draft&mode=edit&fields=connectors_config'
    });
    const connectionResponse = fetchDatasetById.data;

    useEffect(() => {
        if (connectionResponse) {
            const existingData = {
                ...connectionResponse.connectors_config[0]
            };
            setFormData(existingData);
        }
    }, [connectionResponse]);

    useEffect(() => {

        const connectorConfigDetails: any = fetchSessionStorageItem('connectorConfigDetails');

        if (connectorConfigDetails) {
            const connectorId = _.get(connectorConfigDetails, 'connectors_config[0].value.connector_id')
            if (selectedCardId != connectorId) {
                deleteSessionStorageItem('connectorConfigDetails')
                return
            }
            setTimeout(() => {
                const connectorConfig = connectorConfigDetails.connectors_config[0].value.connector_config;
                setFormData(connectorConfig);
                handleFormDataChange(connectorConfig);
            }, 100)

            setOpFormData(connectorConfigDetails.connectors_config[0].value.operations_config);
        }
    }, []);

    useEffect(() => {
        if (selectedCardId && readConnector.data) {
            const selectedConnectorId = readConnector.data.connector_id;
            setSelectedConnectorId(selectedConnectorId);
            setConnectorType(_.toLower(readConnector.data.category));
            const apiSchema = readConnector.data.ui_spec;
            if (apiSchema) {
                setSchema(transformSchema(apiSchema));
                setHelpSectionContent(apiSchema);
                setErrorMessage(null);
            } else {
                setErrorMessage('uiSchema for this connector type not available.  Please contact administrator');
            }
        }
    }, [selectedCardId, readConnector.data]);

    const handleSectionClick = (sectionId: string) => {
        setHighlightedSection(sectionId);
    };

    const transformSchema = (apiSchema: any): Schema => {
        return {
            title: `Configure ${selectedCardName}`,
            schema: {
                type: 'object',
                ...apiSchema
            },
            uiSchema: {}
        }
    };

    const setHelpSectionContent = (schema: any): string[] => {

        // TODO: Convert this to a JSX Element
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
            combinedHelp.push(`</div>`);
            setConnectorHelpText(combinedHelp.join(''));
            setHighlightedSection(firstProperty || '');
        }

        return combinedHelp;
    };

    const handleButtonClick = () => {

        const connectionData = {
            connectors_config: [
                {
                    value: {
                        id: selectedConnectorId,
                        connector_id: selectedCardId,
                        connector_config: formData || {},
                        operations_config: opFormData || {}
                    },
                    action: 'upsert'
                }
            ]
        };
        storeSessionStorageItem('connectorConfigDetails', connectionData);
        navigate('/home/ingestion');
    };

    const handleHelpSectionToggle = () => {
        setIsHelpSectionOpen(!isHelpSectionOpen);
    };

    const handleBack = () => {
        navigate('/home/new-dataset/connector-list');
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
        <Box>
            <Box mx={4} my={1}>
                <Button
                    variant="text"
                    sx={{ color: theme.palette.common.black }}
                    startIcon={<KeyboardBackspaceIcon className={styles.iconStyle} />}
                    onClick={handleBack}
                >
                    Back
                </Button>
            </Box>

            <Box
                className={`${styles.formContainer} ${isHelpSectionOpen ? styles.expanded : styles.collapsed}`}
                pr={4}
                pl={3}
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
                                <Typography variant='h1'>{schema.title}</Typography>
                            </Box>

                            <Grid container spacing={3} className={styles?.gridContainer} justifyContent={'flex-start'}>
                                {schema.schema.properties && _.entries(schema.schema.properties).map(([sectionKey, sectionValue]) => {
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

                                <Grid container spacing={3} className={styles?.gridContainer}>
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
                                                required
                                                fullWidth
                                            >
                                                <MenuItem value={'Periodic'}>Periodic</MenuItem>
                                                <MenuItem value={'Once'}>Once</MenuItem>
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
        </Box>
    );
};

export default ConnectorConfiguration;