import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { Box, Button, Checkbox, FormControl, FormControlLabel, FormGroup, Grid, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import StorageHelpText from 'assets/help/storage';
import Action from 'components/ActionButtons/Actions';
import HelpSection from 'components/HelpSection/HelpSection';
import Loader from 'components/Loader';
import { GenericCard } from 'components/Styled/Cards';
import { useAlert } from 'contexts/AlertContextProvider';
import _ from 'lodash';
import styles from 'pages/DatasetCreation/ConnectorConfiguration/ConnectorConfiguration.module.css';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFetchDatasetsById, useUpdateDataset } from 'services/dataset';
import { extractTransformationOptionsWithType } from '../Processing/Processing';
import storageStyle from './Storage.module.css';
import { getSystemSetting } from 'services/configData';

export const getDatasetType = (type: string) => {
    if (type === 'event') {
        return 'Event/Telemetry Data';
    }
    if (type === 'master') {
        return 'Master Data';
    }
    if (type === 'transaction') {
        return 'Data Changes (Updates or Transactions)';
    } else {
        return 'Event/Telemetry Data';
    }
};

const Storage = () => {

    const [isHelpSectionOpen, setIsHelpSectionOpen] = useState(true);
    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
    const [timestampFields, setTimestampFields] = useState<string[]>([]);
    const [nonTimestampFields, setNonTimestampFields] = useState<string[]>([]);
    const [lakehouseEnabled, setLakehouseEnabled] = useState<boolean>(false);
    const [realtimeStoreEnabled, setRealtimeStoreEnabled] = useState<boolean>(false);
    const [cacheStoreEnabled, setCacheStoreEnabled] = useState<boolean>(false);
    const [primaryKey, setPrimaryKey] = useState<string>('');
    const [timestampKey, setTimestampKey] = useState<string>('');
    const [partitionKey, setPartitionKey] = useState<string>('');
    const [datasetType, setDatasetType] = useState<string>('event');
    const [dataSchema, setDataSchema] = useState<any>({});
    const storageTypes = JSON.parse(getSystemSetting("STORAGE_TYPES"))

    const updateDatasetMutate = useUpdateDataset();
    const { datasetId } : any = useParams();

    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const {
        data: fetchData,
        isPending: fetchPending,
        isLoading: fetchLoading
    } = useFetchDatasetsById({
        datasetId,
        queryParams: 'status=Draft&mode=edit&fields=dataset_id,data_schema,dataset_config,type,version_key'
    });
    const [canProceed, setCanProceed] = useState(false);

    const fetchDatasetType = _.get(fetchData, 'type');
    const datasetConfig = _.get(fetchData, 'dataset_config', {});
    const datasetConfig_indexing = _.get(fetchData, 'dataset_config.indexing_config', {});
    const datasetConfig_keys = _.get(fetchData, 'dataset_config.keys_config', {});
    const timeStampTypes = ['date', 'timestamp', 'date-time', 'epoch'];

    useEffect(() => {
        if(fetchDatasetType) {
            setDatasetType(fetchDatasetType)
            const getColumns: any = extractTransformationOptionsWithType(fetchData?.data_schema || {});
            const timestampKeys: any = _.compact(getColumns.map((option: any) =>{
                if (timeStampTypes.includes(option.data_type)) {
                    return option.field
                }
            }  
            ));
            const nonTimestampKeys: any =  _.compact(getColumns.map((option: any) =>{
                if (!timeStampTypes.includes(option.data_type)) {
                    return option.field
                }
            }  
            ));
            setTimestampFields([...timestampKeys, 'Event Arrival Time']);
            setNonTimestampFields(nonTimestampKeys)

            const { data_key, partition_key, timestamp_key } = datasetConfig_keys;
            const { olap_store_enabled, lakehouse_enabled, cache_enabled } = datasetConfig_indexing;
            setRealtimeStoreEnabled(_.get(storageTypes, "realtime_store") === true ? olap_store_enabled : false);
            setLakehouseEnabled(_.get(storageTypes, "lake_house") === true ? lakehouse_enabled : false);
            setCacheStoreEnabled(fetchDatasetType === 'master' ? true : cache_enabled);
            setPrimaryKey(data_key);
            setTimestampKey('obsrv_meta.syncts' === timestamp_key ? 'Event Arrival Time' : timestamp_key);
            setPartitionKey(partition_key)
            setDataSchema(fetchData?.data_schema || {});
        }
    }, [fetchDatasetType]);

    useEffect(() => {
        if (dataSchema && (primaryKey || timestampKey || partitionKey)) {
            const updatedSchema = updateRequiredFields(dataSchema, primaryKey, partitionKey, timestampKey);
            setDataSchema(updatedSchema);
        }
    }, [primaryKey, partitionKey, timestampKey]);

    const updateRequiredFields = (schema: any, primaryKey: string, partitionKey?: string, timestampKey?: string) => {
        const updateField = (obj: any, path: string) => {
            const keys = path.split('.');
            let current = obj;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (current.properties && current.properties[keys[i]]) {
                    current = current.properties[keys[i]];
                }
            }
            
            const lastKey = keys[keys.length - 1];
            if (current.properties && current.properties[lastKey]) {
                current.properties[lastKey].isRequired = true;
            }
        };

        const newSchema = _.cloneDeep(schema);

        if (primaryKey) {
            updateField(newSchema, primaryKey);
        }
        if (partitionKey) {
            updateField(newSchema, partitionKey);
        }
        if (timestampKey) {
            updateField(newSchema, timestampKey);
        }

        return newSchema;
    };

    const handleButtonClick = () => {

        const dataset_config = {
            dataset_config: {
                file_upload_path: datasetConfig.file_upload_path,
                indexing_config: {
                    olap_store_enabled: realtimeStoreEnabled,
                    lakehouse_enabled: lakehouseEnabled,
                    cache_enabled: datasetType === 'master' ? true : cacheStoreEnabled
                },
                keys_config: {
                    data_key: primaryKey,
                    partition_key: partitionKey,
                    timestamp_key: timestampKey === 'Event Arrival Time' ? 'obsrv_meta.syncts' : timestampKey
                }
            },
            dataset_id: datasetId,
            data_schema: dataSchema
        };

        updateDatasetMutate.mutate(
            {
                data: dataset_config
            },
            {
                onSuccess: () => {
                    showAlert('Storage details updated', 'success');
                    navigate(`/dataset/edit/preview/${datasetId}`);
                }
            }
        );
    };

    const handleHelpSectionToggle = () => {
        setIsHelpSectionOpen(!isHelpSectionOpen);
    };

    const handleIndexingConfigChange = (event: any, id: string) => {
        if (id === 'lakehouse') {
            setLakehouseEnabled(event.target.checked)
        }
        if (id === 'realtimeStore') {
            setRealtimeStoreEnabled(event.target.checked)
        }
        if (id === 'cacheStore') {
            setCacheStoreEnabled(event.target.checked)
        }
    }

    const handleStorageKeyChange = (event: any, id: string) => {
        if (id === 'primaryKey') {
            setPrimaryKey(event.target.value)
        }
        if (id === 'partitionKey') {
            setPartitionKey(event.target.value)
        }
        if (id === 'timestampKey') {
            setTimestampKey(event.target.value)
        }
    }

    const handleNavigate = () => {
        navigate(`/dataset/edit/processing/${datasetId}`)
    }

    useEffect(() => {
        if (!lakehouseEnabled && !realtimeStoreEnabled && !cacheStoreEnabled) return setCanProceed(false);
        if (lakehouseEnabled && (_.isEmpty(primaryKey) || _.isEmpty(partitionKey))) return setCanProceed(false);
        if (realtimeStoreEnabled && _.isEmpty(timestampKey)) return setCanProceed(false);
        if (cacheStoreEnabled && _.isEmpty(primaryKey)) return setCanProceed(false);
        setCanProceed(true)
    }, [lakehouseEnabled, realtimeStoreEnabled, cacheStoreEnabled, primaryKey, partitionKey, timestampKey])

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                zIndex: -1000
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '80px'
                }}
                mr={3}
            >
                <Box mx={4}>
                    <Button
                        variant="back"
                        startIcon={
                            <KeyboardBackspaceIcon
                                className={storageStyle.backIcon}
                            />
                        }
                        onClick={handleNavigate}
                    >
                        Back
                    </Button>
                </Box>
                <Box overflow="auto" display="flex" flexDirection="column">
                    {
                        (fetchPending || fetchLoading)
                            ?
                            <Loader loading={fetchPending || fetchLoading} descriptionText="Please wait while we process your request." />
                            :
                            <Box
                                className={`${styles.formContainer} ${isHelpSectionOpen ? styles.expanded : styles.collapsed}`}
                                pr={4}
                                pl={3}
                                sx={{ boxShadow: 'none', pb: '5rem' }}
                            >

                                <GenericCard className={styles.title}>
                                    <Box className={styles?.heading} >
                                        <Typography variant='h1'>Configure Storage Type</Typography>
                                        <Box className='contentBody' sx={{ mt: 1 }}>
                                            Select one or more storage options that match your dataset requirements: Lakehouse for data science and analytics, Real-time Store for fast, real-time queries, or Cache for rapid lookups in data denormalization
                                        </Box>
                                    </Box>

                                    <Grid container spacing={3} className={styles?.gridContainer}>
                                        <Grid item xs={24} sm={12} lg={12}>
                                            <FormGroup row >
                                                {_.get(storageTypes, "lake_house") === true && (<FormControlLabel control={<Checkbox checked={lakehouseEnabled} onChange={(event) => handleIndexingConfigChange(event, 'lakehouse')} />} label="Data Lakehouse (Hudi)" />)}
                                                {_.get(storageTypes, "realtime_store") === true && (<FormControlLabel control={<Checkbox checked={realtimeStoreEnabled} onChange={(event) => handleIndexingConfigChange(event, 'realtimeStore')} />} label="Real-time Store (Druid)" />)}
                                                {datasetType === 'master' && (
                                                    <FormControlLabel 
                                                        control={
                                                            <Checkbox 
                                                                checked={true} 
                                                                disabled={true}
                                                            />
                                                        } 
                                                        label="Cache Store (Redis)"
                                                    />
                                                )}
                                            </FormGroup>
                                        </Grid>
                                    </Grid>
                                </GenericCard>
                                <GenericCard className={styles.title} sx={{ mt: '2rem' }}>
                                    <Box className={styles?.heading} sx={{ mb: 2 }}>
                                        <Typography variant='h1'>Configure Storage Keys</Typography>
                                        <Box className='contentBody' sx={{ mt: 1 }}>
                                            Specify key fields for indexing and data management: Primary Key for unique records, Timestamp Key for time-based indexing, and Partition Key for storage optimization.
                                        </Box>
                                    </Box>

                                    <Grid container spacing={3} className={styles?.gridContainer}>
                                        <Grid item xs={8} sm={4} lg={4}>
                                            <FormControl fullWidth required={lakehouseEnabled || cacheStoreEnabled}>
                                                <InputLabel id="primary_key">Primary Key</InputLabel>
                                                <Select
                                                    labelId="primary_key"
                                                    id="primaryKey"
                                                    label={'Primary Key'}
                                                    variant="outlined"
                                                    fullWidth
                                                    value={primaryKey}
                                                    onChange={(event) => handleStorageKeyChange(event, 'primaryKey')}
                                                >
                                                    {nonTimestampFields && nonTimestampFields.map((item, index) => {
                                                        return (
                                                            <MenuItem value={item} key={item}>{item}</MenuItem>
                                                        );
                                                    })}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={8} sm={4} lg={4}>
                                            <FormControl fullWidth required={realtimeStoreEnabled}>
                                                <InputLabel id="timestamp_key">Timestamp Key</InputLabel>
                                                <Select
                                                    labelId="timestamp_key"
                                                    id="timestampKey"
                                                    label={'Timestamp Key'}
                                                    variant="outlined"
                                                    fullWidth
                                                    value={timestampKey}
                                                    onChange={(event) => handleStorageKeyChange(event, 'timestampKey')}
                                                >
                                                    {timestampFields && timestampFields.map((item, index) => {
                                                        return (
                                                            <MenuItem value={item} key={item}>{item}</MenuItem>
                                                        );
                                                    })}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={8} sm={4} lg={4}>
                                            <FormControl fullWidth required={lakehouseEnabled}>
                                                <InputLabel id="partition_key">Partition Key</InputLabel>
                                                <Select
                                                    labelId="partition_key"
                                                    id="partitionKey"
                                                    label={'Partition Key'}
                                                    variant="outlined"
                                                    fullWidth
                                                    value={partitionKey}
                                                    onChange={(event) => handleStorageKeyChange(event, 'partitionKey')}
                                                >
                                                    {nonTimestampFields && nonTimestampFields.map((item, index) => {
                                                        return (
                                                            <MenuItem value={item} key={item}>{item}</MenuItem>
                                                        );
                                                    })}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                </GenericCard>
                            </Box>
                    }
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
                    left: 0,
                    width: isHelpSectionOpen ? 'calc(100% - 23rem)' : '100%',
                    transition: 'width 0.3s ease',
                    zIndex: 100
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