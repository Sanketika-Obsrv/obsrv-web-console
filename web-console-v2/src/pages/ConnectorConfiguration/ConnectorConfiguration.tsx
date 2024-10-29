import React, { useEffect, useState } from 'react';
import ConfigureConnectorForm, { FormData, Schema } from 'components/Form/DynamicForm';
import { Box, Button, Typography } from '@mui/material';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './ConnectorConfiguration.module.css';
import Actions from 'components/ActionButtons/Actions';
import HelpSection from 'components/HelpSection/HelpSection';
import { useFetchDatasetsById, useReadConnectors } from 'services/dataset';
import _ from 'lodash';
import { theme } from 'theme';
import { storeSessionStorageItem } from 'utils/sessionStorage';
import { getConfigValue } from 'services/configData';
import sampleSchema from './Schema';

interface ConfigureConnectorFormProps {
    schema: Schema;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

const ConnectorConfiguration: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({});
    const [formErrors, setFormErrors] = useState<unknown[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        if (selectedCardId && readConnector.data) {
            const selectedConnectorId = readConnector.data.connector_id;
            setSelectedConnectorId(selectedConnectorId);
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
            title: '',
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
        const connectorConfig: any = formData || {};
        const connectionData = {
            connectors_config: [
                {
                    value: {
                        id: selectedConnectorId,
                        connector_id: selectedCardId,
                        connector_config: connectorConfig || {},
                        operations_config: {}
                    },
                    action: 'upsert'
                }
            ]
        };
        console.log("#### connectionData", connectionData)
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


    return (
        <Box>
            <Box mx={4}>
                <Button
                    variant="text"
                    sx={{ color: theme.palette.common.black }}
                    startIcon={<KeyboardBackspaceIcon className={styles.iconStyle} />}
                    onClick={handleBack}
                >
                    Back
                </Button>
                <Typography variant="h1" mx={1} mt={1.9}>
                    Configure {selectedCardName}
                </Typography>
            </Box>

            <Box
                className={`${styles.formContainer} ${isHelpSectionOpen ? styles.expanded : styles.collapsed}`}
                pr={4}
                pl={3}
                sx={{ boxShadow: 'none', marginBottom: '30rem' }}
            >
                {errorMessage ? (
                    <Typography variant="h6" color="error" textAlign="center" py={32}>
                        {errorMessage}
                    </Typography>
                ) : (
                    <ConfigureConnectorForm
                        schema={schema!}
                        formData={formData}
                        setFormData={setFormData}
                        onChange={handleChange}
                        highlightedSection={highlightedSection}
                        handleClick={(sectionId: string) => handleSectionClick(sectionId)}
                    />
                )}
            </Box>
            <Box
                className={`${isHelpSectionOpen ? styles.expanded : styles.collapsed}`}
                mt={4}
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