import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { Box, Button, Card, FormControl, Grid, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, styled } from '@mui/material';
import Actions from 'components/ActionButtons/Actions';
import ConfigureConnectorForm, { FormData, Schema } from 'components/Form/ConnectorForm';
import HelpSection from 'components/HelpSection/HelpSection';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getConfigValue } from 'services/configData';
import { useFetchDatasetsById, useReadConnectors } from 'services/dataset';
import { theme } from 'theme';
import { fetchSessionStorageItem, storeSessionStorageItem } from 'utils/sessionStorage';
import styles from './ConnectorConfiguration.module.css';
import sampleSchema from './Schema';

const GenericCard = styled(Card)(({ theme }) => ({
    outline: 'none',
    boxShadow: 'none',
    margin: theme.spacing(0, 6, 2, 2)
}));

interface ConfigureConnectorFormProps {
    schema: Schema;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

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

    const fetchDatasetById = useFetchDatasetsById({
        datasetId,
        queryParams: 'status=Draft&mode=edit&fields=connectors_config'
    });
    const connectionResponse = fetchDatasetById.data;

    useEffect(() => {
        if (connectionResponse) {
            const existingData = {
                section0: {
                    ...connectionResponse.connectors_config[0]
                }
            };
            setFormData(existingData);
        }
    }, [connectionResponse]);

    useEffect(() => {

        const connectorConfigDetails: any = fetchSessionStorageItem('connectorConfigDetails');
        if (connectorConfigDetails) {
            setFormData(connectorConfigDetails.connectors_config[0].value.connector_config);
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
                    <p class="contentBody">${schema.helptext || schema.description}</p>
            `);

            let firstProperty: string | undefined = undefined;
            _.forIn(schema.properties, function (value, key) {
                if (!firstProperty) {
                    firstProperty = key;
                }
                combinedHelp.push(`
                    <section id="${key}" class="section">
                        <header class="displayContent">
                            <h3 class="contentsHeader">${value.title}</h3>
                        </header>
                        <p class="contentBody">
                            ${value.helptext || value.description}
                        </p>
                    </section>
                `);
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
    const handleChange: ConfigureConnectorFormProps['onChange'] = (formData, errors) => {
        setFormData(formData);
        if (errors) {
            setFormErrors(errors);
        } else {
            setFormErrors([]);
        }
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
                sx={{ boxShadow: 'none' }}
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

                            <ConfigureConnectorForm
                                schema={schema!}
                                formData={formData}
                                setFormData={setFormData}
                                onChange={handleChange}
                                highlightedSection={highlightedSection}
                                handleClick={(sectionId: string) => handleSectionClick(sectionId)}
                                styles={styles}
                            />

                        </GenericCard>

                        {connectorType === 'batch' && (
                            <GenericCard className={styles.title}>
                                <Box className={styles?.heading}>
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
                    backgroundColor: theme.palette.background.paper,
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