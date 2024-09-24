import { DeleteOutlined } from "@ant-design/icons";
import { Stack, Box, Grid, Typography } from "@mui/material";
import BasicReactTable from "components/BasicReactTable";
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";
import { useEffect, useState } from "react";
import config from 'data/initialConfig';
import { Dialog } from "@mui/material";
import AddDenormField from "./transformationDialogs/AddDenormFields";
import IconButton from "components/@extended/IconButton";
import * as _ from 'lodash';
import { useDispatch, useSelector } from "react-redux";
import { addState } from "store/reducers/wizard";
import { useNavigate } from "react-router";
import { saveDatasetIntermediateState } from "services/dataset";
import interactIds from "data/telemetry/interact.json"
import { StandardWidthButton } from "components/styled/Buttons";
import Loader from "components/Loader";
import { DatasetStatus, DatasetType } from "types/datasets";

const { spacing } = config;

export const getMasterDatasets = (datasets: Array<any>) => {
    return _.filter(datasets, (dataset: Record<string, any>) => _.get(dataset, 'type') === DatasetType.MasterDataset && [DatasetStatus.Live,].includes(_.get(dataset, 'status')));
}

const getRedisConfig = (datasets: Array<any>) => {
    const data = _.filter(datasets, dataset => _.get(dataset, 'type') === DatasetType.MasterDataset && [DatasetStatus.Live,].includes(_.get(dataset, 'status')));
    if (data.length > 0)
        return {
            redis_db_host: _.get(data, '[0].denorm_config.redis_db_host'),
            redis_db_port: _.get(data, '[0].denorm_config.redis_db_port'),
        }
    else return {
        redis_db_host: '',
        redis_db_port: '',
    };
}

const DataDenorm = (props: any) => {
    const dispatch = useDispatch();
    const { description, id } = props;
    const datasets: any = useSelector((state: any) => _.get(state, 'dataset.data.data') || []);
    const masterDatasets = getMasterDatasets(datasets);
    const [masterDatasetsExists, setIfMasterDatasetsExists] = useState<boolean>(_.size(masterDatasets) > 0);
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const existingState: any = useSelector((state: any) => _.get(state, ['wizard', 'pages', id, 'values']));
    const datasetId: string = useSelector((state: any) => _.get(state, ['wizard', 'pages', 'datasetConfiguration', 'state', 'config', 'dataset_id']));
    const [selection, setSelection] = useState<Array<any>>(existingState || []);
    const [loading, setLoading] = useState<boolean>(false)
    const navigate = useNavigate();

    const deleteSelection: any = async (metadata: Record<string, any>) => {
        const data = selection.filter(payload => _.get(payload, 'denorm_out_field') !== _.get(metadata, 'denorm_out_field'));
        await updateDenormFields({ payload: data, metadata });
    }

    const updateDenormFields = async (configs: any) => {
        const { payload, metadata } = configs
        setSelection(payload);
        pushStateToStore({ payload, metadata });
    }

    const pushStateToStore = (value: Record<string, any>) => {
        const { payload, newData, metadata } = value
        const redisConfig = getRedisConfig(datasets);
        saveDatasetIntermediateState({ denormFields: newData, denormMetadata: metadata });
        dispatch(addState({ id, ...redisConfig, values: payload }));
    }

    useEffect(() => {
        existingState && setSelection([...existingState]);
    }, [existingState]);

    const columns = [
        {
            Header: 'Dataset Field',
            accessor: 'denorm_key'
        },
        {
            Header: 'Master Dataset',
            accessor: 'redis_db',
            Cell: ({ value, cell }: any) => {
                const masterDatasetName = _.get(cell,'row.original.dataset_id')
                return (
                    <Box>
                        <Typography>{masterDatasetName}</Typography>
                    </Box>
                );
            },
        },
        {
            Header: 'Input Field (to store the data)',
            accessor: 'denorm_out_field',
        },
        {
            Header: 'Delete',
            Cell: ({ value, cell }: any) => {
                return <IconButton
                    data-edataid={`${interactIds.delete_daatset_denorm}:master`}
                    data-objectid="deleteOutlined:masterDataset"
                    data-objecttype="masterDataset"
                    size="large"
                    onClick={(e: any) => deleteSelection(_.get(cell, 'row.original'))}>
                    <DeleteOutlined style={{ fontSize: '1.25rem' }} />
                </IconButton>
            }
        }
    ];

    const masterDatasetNotFound = () => {
        return <>
            <Grid item xs={12}>
                <Stack spacing={spacing} direction="column" justifyContent="center" alignItems="center">
                    <Typography variant="body1" fontWeight={500}>
                        There are no master datasets configured in the system. Please create one to setup data denormalization for the dataset.
                    </Typography>
                    <Box>
                        <StandardWidthButton
                            data-edataid={`${interactIds.add_dataset_denorm}:master`}
                            data-objectid="createMasterDataset"
                            data-objecttype="masterDataset"
                            onClick={_ => openCreateMasterDataset()}
                            variant="contained"
                            size="large"
                            sx={{ width: 'auto' }}
                        >
                            <Typography variant="h5">
                                Create Master Dataset
                            </Typography>
                        </StandardWidthButton>
                    </Box>
                </Stack>
            </Grid>
        </>
    }

    const renderSelectionTable = () => {
        return <>
            <MainCard content={false} headerSX={{}}>
                <ScrollX>
                    <BasicReactTable
                        columns={columns}
                        data={selection}
                        striped={true}
                        styles={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9', } }}
                    />
                </ScrollX>
            </MainCard >
        </>
    }

    const openCreateMasterDataset = () => {
        navigate(`/dataset/new/master?master=true`, { state: { replace: true, refreshMaster: true } });
    }

    const masterDatasetFound = () => {
        return <>
            <Grid item xs={12}>
                {renderSelectionTable()}
            </Grid>
            <Grid item xs={12}>
                <Stack spacing={spacing} direction="row" justifyContent="flex-end" my={2}>
                    <Box>
                        <StandardWidthButton
                            data-edataid={`${interactIds.add_dataset_denorm_field}:master`}
                            data-objectid="addDenormField"
                            data-objecttype="masterDataset"
                            variant="contained"
                            size="large"
                            onClick={_ => setDialogOpen(true)}
                            sx={{ width: 'auto' }}
                        >
                            <Typography variant="h5">
                                Add Denorm Field
                            </Typography>
                        </StandardWidthButton>
                    </Box>
                    <Box>
                        <StandardWidthButton
                            data-edataid={`${interactIds.add_dataset_denorm}:master`}
                            data-objectid="createMasterDataset"
                            data-objecttype="masterDataset"
                            onClick={_ => openCreateMasterDataset()}
                            sx={{ width: 'auto' }}
                        >
                            <Typography variant="h5">
                                Create New Master Dataset
                            </Typography>
                        </StandardWidthButton>
                    </Box>
                </Stack>
            </Grid>
            <Grid item xs={12}>
                <Dialog open={dialogOpen} onClose={_ => setDialogOpen(false)}>
                    <AddDenormField
                        selection={selection}
                        setSelection={setSelection}
                        onClose={() => setDialogOpen(false)}
                        persistState={pushStateToStore}
                        masterDatasets={masterDatasets}
                        redisConfig={getRedisConfig(datasets)}
                    />
                </Dialog>
            </Grid >
        </>
    }

    return <>
        {loading && <Loader />}
        <Grid container rowSpacing={spacing}>
            {masterDatasetsExists ? masterDatasetFound() : masterDatasetNotFound()}
        </Grid>
    </>
}

export default DataDenorm
