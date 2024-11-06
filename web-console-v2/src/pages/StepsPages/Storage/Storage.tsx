import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { Box, Button } from '@mui/material';
import { UiSchema } from '@rjsf/utils';
import StorageHelpText from 'assets/help/storage';
import Action from 'components/ActionButtons/Actions';
import ConfigureConnectorForm from 'components/Form/DynamicForm';
import HelpSection from 'components/HelpSection/HelpSection';
import Loader from 'components/Loader';
import { useAlert } from 'contexts/AlertContextProvider';
import _ from 'lodash';
import styles from 'pages/ConnectorConfiguration/ConnectorConfiguration.module.css';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetchDatasetsById, useUpdateDataset } from 'services/dataset';
import { extractTransformationOptions } from '../Processing/Processing';
import schemas, { CustomSchema, STORE_TYPE } from './Schema';

interface FormData {
    [key: string]: unknown;
}

interface Schema {
    title: string;
    schema: CustomSchema;
    uiSchema: UiSchema;
}

interface ConfigureConnectorFormProps {
    schema: Schema;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

export const getDatasetType = (type: string) => {
    if (type === 'event') {
        return 'Events';
    }
    if (type === 'master') {
        return 'Master';
    }
    if (type === 'transaction') {
        return 'Transactional';
    } else {
        return 'Events';
    }
};

const Storage = () => {

    const [formErrors, setFormErrors] = useState<unknown[]>([]);
    const [formData, setFormData] = useState<{ [key: string]: unknown }>({});
    const [isHelpSectionOpen, setIsHelpSectionOpen] = useState(true);
    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

    const [datasetType, setDatasetType] = useState<string>('');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [uiSchema, setUiSchema] = useState<Schema>(schemas);
    const updateDatasetMutate = useUpdateDataset();
    const sessionData = sessionStorage.getItem('configDetails');
    const configData = sessionData ? JSON.parse(sessionData) : null;
    const { dataset_id: datasetId } = configData || {};

    const navigate = useNavigate();
    const { showAlert } = useAlert();

    const {
        data: fetchData,
        isPending: fetchPending,
        isLoading: fetchLoading
    } = useFetchDatasetsById({
        datasetId,
        queryParams: 'status=Draft&mode=edit&fields=data_schema,dataset_config,type'
    });
    const [canProceed, setCanProceed] = useState(false);

    const type = _.get(fetchData, 'type');
    const schema = _.get(fetchData, 'data_schema.properties', {});
    const schemaProperties = _.omit(schema, ['configurations', 'dataMappings']);
    const datasetConfig = _.get(fetchData, 'dataset_config', {});
    const datasetConfig_indexing = _.get(fetchData, 'dataset_config.indexing_config', {});
    const datasetConfig_keys = _.get(fetchData, 'dataset_config.keys_config', {});

    const timeStampTypes = ['date', 'timestamp', 'datetime'];

    useEffect(() => {
        const getColumns = extractTransformationOptions(fetchData?.data_schema || {});

        const timestampKeys = getColumns.filter((option) =>
            timeStampTypes.some((keyword) => option.toLowerCase().includes(keyword))
        );

        const nonTimestampKeys = getColumns.filter((key) => !timestampKeys.includes(key));
        _.set(
            schemas,
            ['schema', 'properties', 'section3', 'properties', 'timestamp', 'enum'],
            [...timestampKeys, 'Event Arrival Time']
        );

        _.set(
            schemas,
            ['schema', 'properties', 'section3', 'properties', 'partition', 'enum'],
            nonTimestampKeys
        );

        _.set(
            schemas,
            ['schema', 'properties', 'section3', 'properties', 'primary', 'enum'],
            nonTimestampKeys
        );
    }, [schemaProperties]);

    useEffect(() => {
        if (type !== '' || type !== 'undefined') {
            const typeValue = getDatasetType(type);
            setDatasetType(typeValue);
        }

        const { data_key, partition_key, timestamp_key } = datasetConfig_keys;
        const { olap_store_enabled, lakehouse_enabled, cache_enabled } = datasetConfig_indexing;

        if (
            (data_key !== '' || data_key !== 'undefined') &&
            (partition_key !== '' || partition_key !== 'undefined')
        ) {
            const existingData = {
                section1: {
                    datasetType: getDatasetType(type),
                    lakehouse: lakehouse_enabled,
                    realTimeStore: olap_store_enabled
                },
                section2: {
                    storageType: [
                        lakehouse_enabled && STORE_TYPE.LAKEHOUSE,
                        olap_store_enabled && STORE_TYPE.REAL_TIME_STORE,
                        cache_enabled && STORE_TYPE.CACHE
                    ]
                },
                section3: {
                    ...(data_key !== '' && { primary: data_key }),
                    ...(timestamp_key !== '' && {
                        timestamp: timestamp_key === 'obsrv_meta.syncts' ? 'Event Arrival Time' : timestamp_key
                    }),
                    ...(partition_key !== '' && { partition: partition_key })
                }
            };
            setFormData(existingData);
        } else {
            const existingData = {
                section1: {
                    datasetType: getDatasetType(type)
                },
                section2: {
                    storageType: [
                        lakehouse_enabled && STORE_TYPE.LAKEHOUSE,
                        olap_store_enabled && STORE_TYPE.REAL_TIME_STORE,
                        cache_enabled && STORE_TYPE.CACHE
                    ]
                }
            };
            setFormData(existingData);
        }
    }, [datasetConfig_indexing, datasetConfig_keys, type]);

    const handleButtonClick = (id: string) => {
        const storageTypeSelected = _.get(formData, 'section2.storageType') as
            | string[]
            | undefined;

        const primaryOption = _.get(formData, 'section3.primary');
        const timestampOption = _.get(formData, 'section3.timestamp');
        const partitionOption = _.get(formData, 'section3.partition');

        if (formErrors.length > 0) {
            showAlert('Failed to update storage', 'error');
        } else {
            const dataset_config = {
                type:
                    datasetType === 'Events'
                        ? 'event'
                        : datasetType === 'Master'
                            ? 'master'
                            : 'transaction',
                dataset_config: {
                    file_upload_path: datasetConfig.file_upload_path,
                    indexing_config: {
                        olap_store_enabled: storageTypeSelected?.includes(
                            STORE_TYPE.REAL_TIME_STORE
                        ),
                        lakehouse_enabled: storageTypeSelected?.includes(STORE_TYPE.LAKEHOUSE),
                        cache_enabled: storageTypeSelected?.includes(STORE_TYPE.CACHE)
                    },
                    keys_config: {
                        data_key: primaryOption,
                        partition_key: partitionOption,
                        timestamp_key: timestampOption === 'Event Arrival Time' ? 'obsrv_meta.syncts' : timestampOption
                    }
                }
            };

            updateDatasetMutate.mutate(
                {
                    data: dataset_config
                },
                {
                    onSuccess: () => {
                        showAlert('Storage details updated', 'success');
                        navigate(`/home/preview/${datasetId}`);
                    }
                }
            );
            setFormData(formData);
        }
    };

    const handleChange: ConfigureConnectorFormProps['onChange'] = (formData, errors) => {
        setFormData(formData);
        setFormErrors([]);
    };

    const handleHelpSectionToggle = () => {
        setIsHelpSectionOpen(!isHelpSectionOpen);
    };

    const updateRequiredCacheKeys = (
        storageTypeSelected: string | string[],
        required: string[],
        requiredValues: boolean
    ) => {
        if (storageTypeSelected?.includes(STORE_TYPE.CACHE) && !required.includes('primary')) {
            required.push('primary');
        }
        requiredValues = required.every(
            (field) => _.get(formData, `section3.${field}`) !== undefined
        );
        setCanProceed(requiredValues);
    };

    useEffect(() => {
        const selectedDatasetType = _.get(formData, 'section1.datasetType') as string;
        if (selectedDatasetType) setDatasetType(selectedDatasetType);

        const storageTypeSelected = _.get(formData, 'section2.storageType') as string[];

        if (storageTypeSelected?.length <= 0) setCanProceed(false);
        const updatedUiSchema: UiSchema = {
            ...schemas.uiSchema,

            section3: {
                ...schemas.uiSchema.section3,
                primary: {
                    ...schemas.uiSchema.section3.primary
                },
                partition: {
                    ...schemas.uiSchema.section3.partition
                },
                timestamp: {
                    ...schemas.uiSchema.section3.timestamp
                }
            }
        };

        let required: string[] = [];
        let requiredValues = false;
        switch (true) {
            case selectedDatasetType === 'Master':
                if (storageTypeSelected?.includes(STORE_TYPE.LAKEHOUSE)) {
                    if (storageTypeSelected?.includes(STORE_TYPE.REAL_TIME_STORE)) {
                        required = ['primary', 'partition', 'timestamp'];
                    } else {
                        required = ['primary', 'partition'];
                    }
                } else if (storageTypeSelected?.includes(STORE_TYPE.REAL_TIME_STORE)) {
                    required = ['primary', 'timestamp'];
                } else {
                    required = ['primary'];
                }

                updateRequiredCacheKeys(storageTypeSelected, required, requiredValues);

                break;

            case storageTypeSelected?.includes(STORE_TYPE.LAKEHOUSE) &&
                storageTypeSelected?.includes(STORE_TYPE.REAL_TIME_STORE):
                required = ['primary', 'partition', 'timestamp'];

                updateRequiredCacheKeys(storageTypeSelected, required, requiredValues);

                break;

            case storageTypeSelected?.includes(STORE_TYPE.LAKEHOUSE):
                required = ['primary', 'partition'];

                updateRequiredCacheKeys(storageTypeSelected, required, requiredValues);

                break;

            case storageTypeSelected?.includes(STORE_TYPE.REAL_TIME_STORE):
                required = ['timestamp'];

                updateRequiredCacheKeys(storageTypeSelected, required, requiredValues);

                break;

            case storageTypeSelected?.includes(STORE_TYPE.CACHE):
                required = ['primary'];
                requiredValues = _.get(formData, 'section3.primary') !== undefined;
                setCanProceed(requiredValues);
                break;

            default:
                required = [];
                setCanProceed(false);
                break;
        }

        const updatedSchema: CustomSchema = {
            ...schemas.schema,
            properties: {
                ...schemas.schema.properties,
                section3: {
                    ...(schemas.schema.properties?.section3 as any),
                    required: required
                }
            }
        };

        setUiSchema({ title: '', schema: updatedSchema, uiSchema: updatedUiSchema });
    }, [formData, datasetType]);

    const handleDatasetNameClicks = (id: any) => {
        setHighlightedSection(id);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                zIndex: -1000
            }}
        >
            <Loader loading={fetchPending || fetchLoading} descriptionText="Loading the page" />
            <Box
                mx={2.2}
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '80px',
                    paddingTop: '4rem'
                }}
            >
                <Button
                    variant="text"
                    className={styles.button}
                    startIcon={
                        <KeyboardBackspaceIcon
                            sx={{ color: 'black', width: '1.5rem', height: '1.5rem' }}
                        />
                    }
                    sx={{ fontSize: '1rem', ml: 2 }}
                    onClick={() => {
                        navigate(-1);
                    }}
                >
                    Back
                </Button>
                <Box overflow="auto" display="flex" flexDirection="column">
                    <Box
                        className={`${styles.formContainer} ${isHelpSectionOpen ? styles.expanded : styles.collapsed}`}
                        sx={{
                            '& .MuiFormHelperText-root': {
                                display: 'none'
                            },
                            '& .MuiFormControlLabel-root .MuiFormControlLabel-label': {
                                fontSize: '16px',
                                color: '#111111'
                            },
                        }}
                    >
                        <ConfigureConnectorForm
                            schema={uiSchema!}
                            formData={formData}
                            setFormData={setFormData}
                            onChange={handleChange}
                            highlightedSection={highlightedSection}
                            handleClick={(sectionId) => handleDatasetNameClicks(sectionId)}
                            styles={{
                                sectionContainer: { marginTop: '-0.9375rem' },
                                connectorName: { marginTop: '6.5625rem' },
                                sectionContainers: { marginTop: '-4.6875rem' }
                            }}
                        />
                    </Box>
                    <HelpSection
                        helpSection={{
                            defaultHighlight: "section1"
                        }}
                        helpText={<StorageHelpText />}
                        onExpandToggle={handleHelpSectionToggle}
                        highlightSection={highlightedSection}
                        expand={isHelpSectionOpen}
                    />
                </Box>
            </Box>

            {/* Fixed Action Button Section */}
            <Box
                className={`${styles.actionContainer} ${isHelpSectionOpen ? styles.expandedAction : styles.collapsedAction}`}
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    right: 0,
                    left: -30,
                    width: isHelpSectionOpen ? 'calc(100% - 400px)' : '102%',
                    transition: 'width 0.3s ease',
                    zIndex:100
                }}
            >
                <Action
                    buttons={[
                        {
                            id: 'btn2',
                            label: 'Proceed',
                            variant: 'contained',
                            color: 'primary',
                            disabled: !canProceed
                        }
                    ]}
                    onClick={handleButtonClick}
                />
            </Box>
        </Box>
    );
};

export default Storage;
