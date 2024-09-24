import { DeleteOutlined, EditOutlined, PlusOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { Alert, Button, Dialog, DialogTitle, Grid, Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router";
import _ from 'lodash';
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";
import BasicReactTable from "components/BasicReactTable";
import { IconButton, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { fetchDatasources } from "services/dataset";
import { useDispatch } from "react-redux";
import { error, success } from 'services/toaster';
import { deleteDraftRollupDatasources } from "services/datasource";
import { Box } from "@mui/system";
import AlertDialog from "components/AlertDialog";
import Loader from "components/Loader";
import BackdropLoader from "components/BackdropLoader";
import { granularityOptions } from "../utils/commonUtils";
import { DatasetStatus } from "types/datasets";
import en from 'utils/locales/en.json';
import AnimateButton from "components/@extended/AnimateButton";
import { StandardWidthButton } from "components/styled/Buttons";

const ListRollups = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const params = useParams();
    const theme = useTheme();
    const { datasetId } = params;
    const [draftDatasets, setDraftDatasets] = useState([]);
    const [open, setOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [datasourceIdForDelete, setDatasourceIdForDelete] = useState('');

    const getRollupDatasourceList = async () => {
        try {
            setLoading(true)
            const response = await fetchDatasources({ data: { filters: { status: [DatasetStatus.Draft, DatasetStatus.ReadyToPublish, DatasetStatus.Live], dataset_id: `${datasetId}` } } })
            setDraftDatasets(response)
        }
        catch (err) {
            dispatch(error({ "message": en.faildToFetch }));
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        getRollupDatasourceList()
    }, [])

    const rollupGranularityOption = _.map(draftDatasets, (obj: any) => {
        if (_.get(obj, 'ingestion_spec.spec.dataSchema.granularitySpec.rollup') === true) {
            const granularity = obj?.metadata?.granularity;
            return granularity;
        }
    });

    const getAggregationLevel = (dataset: any) => {
        const aggregationLevelLable = dataset?.metadata?.granularity
        return aggregationLevelLable;
    }

    const rollups: Record<string, any>[] =
        _.filter(draftDatasets, (dataset: any) => {
            if (_.get(dataset, 'ingestion_spec.spec.dataSchema.granularitySpec.rollup') === true) {
                return dataset
            }
        })

    const rollupTableData = _.map(rollups, (dataset: any) => {
        return { name: dataset?.dataset_id, datasourceId: dataset?.datasource, id: dataset?.id, aggregation: getAggregationLevel(dataset), aggregationLable: _.capitalize(getAggregationLevel(dataset).replaceAll("_", " ")) }
    })

    const addNewRollup = () => {
        navigate(`/datasets/configurerollups/${datasetId}`, { state: { rollupGranularityOption: rollupGranularityOption, edit: false } })
    }

    const handleClose = () => {
        setOpen(false);
    };

    const handleAction = async () => {
        try {
            await deleteDraftRollupDatasources(datasourceIdForDelete, DatasetStatus.Draft)
            dispatch(success({ "message": en.datasourceDeleted }));
            getRollupDatasourceList();
            setOpen(false);
        }
        catch (err) {
            dispatch(error({ "message": en.faildToDeleteDatasource }));
        }
    };

    const renderActions = (value: any) => {
        const rollupDatasourceId = value.row.original.id;
        const datasourceId = value.row.original.datasourceId;

        return <Box sx={{ marginLeft: -1.5 }}>
            <IconButton color="primary" size="large"
                onClick={() => {
                    navigate(`/datasets/configurerollups/${datasetId}`,
                        { state: { rollupGranularityOption: rollupGranularityOption, edit: true, rollupDatasourceName: value.row.original.datasourceId, aggregationLevel: value.row.original.aggregation } })
                }}
            >
                <EditOutlined style={{ color: theme.palette.primary.main }} />
            </IconButton>
            <IconButton color="primary" size="large"
                onClick={() => {
                    setOpen(true)
                    setDatasourceIdForDelete(rollupDatasourceId)
                }}
            >
                <DeleteOutlined style={{ color: theme.palette.error.main }} />
            </IconButton>
        </Box>
    }

    const columns = [
        {
            Header: "Datasource name",
            accessor: 'name'
        },
        {
            Header: "Aggregation level",
            accessor: "aggregationLable"
        },
        {
            Header: "Actions",
            accessor: 'actions',
            Cell: renderActions
        }
    ];

    const dialogContext = { title: 'Delete rollup datasource', content: 'Are you sure you want to delete this rollup datasource ?' };

    const renderRollups = () => {
        if (!_.get(rollups, 'length')) return null;
        return <Grid item xs={12}>
            <MainCard content={false} headerSX={{}}>
                <ScrollX>
                    <BasicReactTable header={true} columns={columns} data={rollupTableData} striped={true} />
                </ScrollX>
            </MainCard >
        </Grid>
    }

    return <>
        {loading && <Loader />}
        <BackdropLoader open={loading} />
        <Grid container>
            {_.isEmpty(rollupTableData) ? <>
                <Alert sx={{ display: "flex", alignItems: "center" }} severity="error">{en.clickToCreateRollup}</Alert>
            </> : renderRollups()}
            <Grid item xs={12}>
                {rollups.length === granularityOptions.length ? <></> : <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
                    <Button size="medium" startIcon={<ArrowLeftOutlined />} sx={{ fontWeight: 500 }} onClick={() => navigate(`/datasets?status=${DatasetStatus.ReadyToPublish}`)}>
                        Previous
                    </Button>
                    <Button size="medium" startIcon={<PlusOutlined />} sx={{ fontWeight: 500 }} onClick={addNewRollup}>
                        Add Rollup
                    </Button>
                </Stack>}
                <AlertDialog open={open} handleClose={handleClose} action={handleAction} context={dialogContext} />
            </Grid>
        </Grid>
    </>
}


export default ListRollups;
