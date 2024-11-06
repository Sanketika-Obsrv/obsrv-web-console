import React, { useState } from 'react';
import { Stack, Typography, Button, ListItem, ListItemText, Chip } from '@mui/material';
import styles from './Preview.module.css';
import AddIcon from '@mui/icons-material/Add';
import { Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { getConfigValue } from 'services/configData';
import { useDatasetList, useFetchDatasetsById } from 'services/dataset';
import _ from 'lodash';
import SchemaDetails from '../Ingestion/SchemaDetails/SchemaDetails';
import { useNavigate } from 'react-router-dom';
import CustomTable from 'components/CustomeTable/CustomTable';
import Loader from 'components/Loader';
import { getDatasetType } from '../Storage/Storage';

interface TransformationRow {
    field_key: string;
    transformation_function: {
        type: string;
        expr: string;
    };
}

const AllConfigurations = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const datasetId = getConfigValue('dataset_id');

    const datasetList = useDatasetList({
        status: ['Live']
    });
    const fetchDatasetById = useFetchDatasetsById({
        datasetId,
        queryParams:
            'status=Draft&mode=edit&fields=data_schema,transformations_config,connectors_config,validation_config,dedup_config,denorm_config,dataset_config,type'
    });
    const response = fetchDatasetById.data;

    const validationConfig = _.get(response, 'validation_config', {});
    const denormData = _.get(response, 'denorm_config.denorm_fields', []);
    const transformationData = _.get(response, 'transformations_config', []);
    const connectorData = _.get(response, ['connectors_config'], []);
    console.log("### response", response);

    const storageKeys = _.get(response, ['dataset_config', 'keys_config'], []);
    const storageType = _.get(response, ['dataset_config', 'indexing_config'], []);
    const datasetType = _.get(response, 'type');
    const { olap_store_enabled, lakehouse_enabled, cache_enabled } = storageType;

    const storageKeysArray = (storageKeys: { [s: string]: unknown } | ArrayLike<unknown>) => {
        return Object.entries(storageKeys).map(([key, value]) => ({
            key,
            value
        }));
    };

    const storageKeysList = storageKeysArray(storageKeys);

    const navigate = useNavigate();
    const toggleViewMore = () => {
        setIsExpanded(!isExpanded);
    };

    const ProcessingColumns = [
        {
            header: 'Dataset Field',
            id: 'Dataset Field',
            accessor: 'denorm_key'
        },
        {
            header: 'Master Dataset',
            id: 'Master Dataset',
            accessor: 'dataset_id'
        },
        {
            header: 'Master Dataset Field',
            id: 'Master Dataset Field',
            accessor: 'denorm_out_field'
        }
    ];

    const storageColumns = [
        {
            header: 'Indexing Config',
            id: 'Indexing Config',
            accessor: 'key',
            Cell: ({ value }: any) => (value ? value : '-')
        },
        {
            header: 'Value',
            id: 'Value',
            accessor: 'value',
            Cell: ({ value }: any) => (value ? value : '-')
        }
    ];

    const columnsTransformations = [
        {
            header: 'Field',
            id: "Field",
            accessor: 'field_key'
        },
        {
            header: 'Transformation',
            id: 'Transformation',
            accessor: (row: TransformationRow) => row.transformation_function.type
        },
        {
            header: 'Target field / Expression',
            id: 'Target field / Expression',
            accessor: (row: TransformationRow) => row.transformation_function.expr
        }
    ];

    const handleClick = () => {
        navigate('/home/processing');
    };

    return (
        <Box>
            <Loader
                loading={datasetList.isPending || fetchDatasetById.isPending}
                descriptionText="Loading the page"
            />

            <Stack className={styles.scrollable}>
            {!_.isEmpty(connectorData) && (
                    <Stack
                        my={2}
                        mx={2.5}
                        sx={{ backgroundColor: 'white' }}
                        className={styles.stackStyle}
                    >
                        <Stack m={2.5} spacing={2}>
                            <Typography variant="h1Secondary">Ingestion</Typography>

                            <ListItem disablePadding>
                                <span className={styles.dotCircle} />
                                <ListItemText>
                                    <Typography variant="h2Secondary">
                                        Connector Type : {connectorData[0].connector_id}
                                    </Typography>
                                </ListItemText>
                            </ListItem>
                        </Stack>
                    </Stack>
                )}

                <Stack>
                    <Stack my={2} mx={2.5} className={styles.stackStyle}>
                        <Stack m={2} spacing={1}>
                            <Typography variant="h1Secondary">Schema</Typography>
                        </Stack>
                        <Box
                            sx={{
                                height: isExpanded ? 'auto' : '400px',
                                overflow: 'hidden',
                                transition: 'height 0.3s ease'
                            }}
                        >
                            <SchemaDetails showTableOnly />
                        </Box>
                        <Button
                            onClick={toggleViewMore}
                            endIcon={
                                isExpanded ? (
                                    <KeyboardArrowUpIcon sx={{ color: 'blue' }} />
                                ) : (
                                    <ExpandMoreIcon sx={{ color: 'blue' }} />
                                )
                            }
                            sx={{ display: 'flex', alignItems: 'center' }}
                        >
                            <Typography color="primary" p={1} fontSize="18px">
                                {isExpanded ? 'View Less' : 'View More'}
                            </Typography>
                        </Button>
                    </Stack>

                    <Stack my={2} mx={2.5} className={styles.stackStyle}>
                        <Stack m={2.5} spacing={2}>
                            <Typography variant="h1Secondary">Processing</Typography>

                            <ListItem disablePadding>
                                <span className={styles.dotCircle} />
                                <ListItemText>
                                    <Typography variant="h2Secondary">
                                        Data Validation : {validationConfig.mode}
                                    </Typography>
                                </ListItemText>
                            </ListItem>
                            <ListItem disablePadding style={{ marginBottom: '0.75rem' }}>
                                <span className={styles.dotCircle} />
                                <ListItemText>
                                    <Typography variant="h2Secondary">
                                        Data Denormalization
                                    </Typography>
                                </ListItemText>
                            </ListItem>
                            {denormData.length > 0 ? (
                                <CustomTable
                                    header={true}
                                    columns={ProcessingColumns}
                                    data={denormData}
                                    striped={true}
                                />
                            ) : (
                                <Typography variant="h6" textAlign="center">
                                    No records
                                </Typography>
                            )}
                        </Stack>
                    </Stack>

                    <Stack my={2} mx={2.5} className={styles.stackStyle}>
                        <Stack m={2.5} spacing={1} gap={3}>
                            <Typography variant="h1Secondary">Transformations</Typography>

                            {transformationData.length > 0 ? (
                                <CustomTable
                                    header={true}
                                    columns={columnsTransformations}
                                    data={transformationData}
                                    striped={true}
                                />
                            ) : (
                                <Typography variant="h6" textAlign="center">
                                    No records
                                </Typography>
                            )}
                        </Stack>
                        <Stack direction="row" justifyContent="flex-end" mx={3} pb={2}>
                            <Button
                                variant="text"
                                color="primary"
                                startIcon={<AddIcon />}
                                className={styles.addButton}
                                onClick={handleClick}
                            >
                                Add Transformations
                            </Button>
                        </Stack>
                    </Stack>
                    <Stack my={2} mx={2.5} className={styles.stackStyle}>
                        <Stack m={2.5} spacing={2}>
                            <Typography variant="h1Secondary">Storage</Typography>

                            <ListItem disablePadding>
                                <span className={styles.dotCircle} />
                                <ListItemText>
                                    <Typography variant="h2Secondary">
                                        Dataset Type : {getDatasetType(datasetType)}
                                    </Typography>
                                </ListItemText>
                            </ListItem>
                            <ListItem disablePadding style={{ marginBottom: '0.75rem' }}>
                                <span className={styles.dotCircle} />
                                <ListItemText>
                                    <Typography variant="h2Secondary">
                                        Storage Type:
                                        {olap_store_enabled && (
                                            <Chip label="Real-time Store" sx={{ mx: 1 }} />
                                        )}
                                        {lakehouse_enabled && (
                                            <Chip label="Lakehouse" sx={{ mx: 1 }} />
                                        )}
                                        {cache_enabled && <Chip label="Cache" sx={{ mx: 1 }} />}
                                    </Typography>
                                </ListItemText>
                            </ListItem>
                            {storageKeysList.length > 0 ? (
                                <CustomTable
                                    header={true}
                                    columns={storageColumns}
                                    data={storageKeysList}
                                    striped={true}
                                />
                            ) : (
                                <Typography variant="h6" textAlign="center">
                                    No records
                                </Typography>
                            )}
                        </Stack>
                    </Stack>

                    
                </Stack>
            </Stack>
        </Box>
    );
};

export default AllConfigurations;
