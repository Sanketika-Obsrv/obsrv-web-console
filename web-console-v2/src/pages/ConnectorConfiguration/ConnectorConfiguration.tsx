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

interface ConfigureConnectorFormProps {
    schemas: Schema[];
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

const ConnectorConfiguration: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({});
    const [formErrors, setFormErrors] = useState<unknown[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

    const [isHelpSectionOpen, setIsHelpSectionOpen] = useState(true);
    const [schemas, setSchemas] = useState<Schema[]>([]);
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
    let connectorHelpText = "";

    useEffect(() => {
        if (schemas.length > 0) {
            const combinedHelpContent = generateHelpSectionContent(schemas[0].schema);
            connectorHelpText = combinedHelpContent.join('');
        }
    }, [schemas]);

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

            const apiSchema = readConnector.data.ui_spec.schema;
            if (apiSchema) {
                const transformedSchemas = transformSchema(apiSchema);
                setSchemas(transformedSchemas);
                setErrorMessage(null);
            } else {
                setErrorMessage(
                    'uiSchema for this connector type not available.  Please contact administrator'
                );
                setSchemas([]);
            }
        }
    }, [selectedCardId, readConnector.data]);

    const handleSectionClick = (sectionId: string) => {
        setHighlightedSection(sectionId);
    };

    const transformSchema = (apiSchema: any): Schema[] => {
        const schemas: Schema[] = [];

        if (apiSchema && apiSchema.properties) {
            const connectorConfig = apiSchema;

            if (connectorConfig) {
                schemas.push({
                    title: '',
                    schema: {
                        type: 'object',
                        ...connectorConfig
                    },
                    uiSchema: {}
                });
            }
        }

        return schemas;
    };

    const generateHelpSectionContent = (schema: any): string[] => {
        const combinedHelp: string[] = [];

        const processProperties = (properties: any, parentKey = '', isMainTitle = false) => {
            Object.keys(properties).forEach((key) => {
                const property = properties[key];
                const fullKey = parentKey ? `${parentKey}.${key}` : key;

                if (isMainTitle && property.title) {
                    combinedHelp.push(
                        `<h1 class="contentsHeader" id="${fullKey}">${property.title} :</h1>`
                    );
                }

                let content = '';
                if (property.title && !isMainTitle) {
                    content += `<p class="contentBody" style="padding-left: 1rem" id=${property.title}><strong> ${property.title} :  </strong>`;
                }
                if (property.fieldDescription && Array.isArray(property.fieldDescription)) {
                    const descriptions = property.fieldDescription
                        .map((descObj: { description: any }) => descObj.description)
                        .filter((desc: any) => desc)
                        .join(' ');

                    content += `${descriptions || 'Description not available'}`;
                }

                if (content) {
                    combinedHelp.push(content);
                }

                if (property.type === 'object' && property.properties) {
                    processProperties(property.properties, fullKey, false);
                }

                if (property.dependencies) {
                    Object.keys(property.dependencies).forEach((dependencyKey) => {
                        const dependency = property.dependencies[dependencyKey];

                        if (dependency.oneOf && dependency.oneOf[0]?.properties) {
                            processProperties(
                                dependency.oneOf[0].properties,
                                `${fullKey} (Dependency: ${dependencyKey})`,
                                false
                            );
                        }
                    });
                }
            });
        };

        if (schema?.properties) {
            processProperties(schema.properties, '', true);
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
                        connector_config: flattenedConnectorConfig?.source || {},
                        operations_config: flattenedConnectorConfig?.operations_config || {}
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

    const flattenData = (obj: any) => {
        const result: any = {
            source: {},
            operations_config: {}
        };
        function recursiveFlatten(currentObj: any, parentKey: any, targetKey: string): void {
            for (const [key, value] of Object.entries(currentObj)) {
                const flattenedKey = parentKey ? `${parentKey}_${key}` : key;
                if (key === 'kafka_broker_servers' && Array.isArray(value)) {
                    result[targetKey][flattenedKey] = value.join(',');
                    continue
                }
                if (typeof value === 'object' && value !== null) {
                    recursiveFlatten(value, flattenedKey, targetKey);
                } else {
                    result[targetKey][flattenedKey] = value;
                }
            }
        }
        // Flattening "source" object
        if (obj['source']) {
            recursiveFlatten(obj.source, 'source', 'source');
        }
        // Flattening "operations-config" object
        if (obj['operations-config']) {
            recursiveFlatten(obj['operations-config'], 'operations_config', 'operations_config');
        }
        return result;
    }
    const flattenedConnectorConfig = flattenData(_.get(formData, "section0") || {});

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
                        schemas={schemas}
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
                    defaultHighlight: "section0",
                    contents: connectorHelpText
                }}
                highlightSection={highlightedSection}
                onExpandToggle={handleHelpSectionToggle}
                expand={isHelpSectionOpen}
            />
        </Box>
    );
};

export default ConnectorConfiguration;
