/*eslint-disable*/
import { useEffect, useMemo, useState } from 'react';
import { Chip, CircularProgress, Stack, Tooltip, Typography, Box } from '@mui/material';
import MainCard from 'components/MainCard';
import ScrollX from 'components/ScrollX';
import { IconButton } from '@mui/material';
import { DashboardOutlined, EyeOutlined } from '@ant-design/icons';
import FilteringTable from 'components/filtering-table';
import AlertDialog from 'components/AlertDialog';
import { useNavigate } from 'react-router';
import { fetchChartData } from 'services/clusterMetrics';
import { druidQueries } from 'services/druid';
import dayjs from 'dayjs';
import chartMeta from 'data/chartsV1';
import * as _ from 'lodash';
import interactIds from 'data/telemetry/interact.json';
import EditDatasetTags from 'components/EditDatasetTags';
import { createDraftversion, exportDataset, fetchDatasets, retireLiveDataset, updateLiveDataset } from 'services/datasetV1';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { v4 } from 'uuid';
import { renderSkeleton } from 'services/skeleton';
import { DatasetStatus, DatasetType, DatasetActions } from 'types/datasets';
import en from 'utils/locales/en.json';
import { FormattedMessage } from 'react-intl';
import { downloadJSONSchemaV1, flattenSchema } from 'services/json-schema';
import { downloadJsonFile } from 'utils/downloadUtils';
import MoreOptions from './MoreOptions';
import StyleIcon from '@mui/icons-material/Style';
import { getLiveSourceConfig, renderNoDatasetsMessage } from './datasets';
import { useAlert } from 'contexts/AlertContextProvider';

const dateFormat = 'YYYY-MM-DDT00:00:00+05:30'

const statusColors: Record<string, any> = {
    [_.toLower(DatasetStatus.Live)]: "success",
    [_.toLower(DatasetStatus.Retired)]: "secondary",
    [_.toLower(DatasetStatus.Purged)]: "secondary",
}
export const pageMeta = { pageId: 'datasetConfiguration' };

const DatasetsList = ({ setDatasetType, sourceConfigs }: any) => {
    const { showAlert } = useAlert();
    const [openAlertDialog, setOpenAlertDialog] = useState(false);
    const [data, setData] = useState<any>([]);
    const [tagSelection, setTagSelection] = useState<any>({});
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [refreshData, setRefreshData] = useState<string>('false');
    const [loading, setLoading] = useState(false);
    const open = Boolean(anchorEl);
    const [selection, setSelection] = useState<any>(null);
    const navigate = useNavigate();
    const navigateToPath = (path: string) => {
        navigate(path);
    }
    const [executeAction, setExecuteAction] = useState<string>("");
    const alertDialogContext = (datasetName: string = "") => {
        switch (executeAction) {
            case DatasetActions.Retire:
                return { title: <FormattedMessage id="retire-dataset-title" />, content: <FormattedMessage id="retire-dataset-context" values={{ id: datasetName }} /> };
            case DatasetActions.Edit:
                return { title: <FormattedMessage id="edit-dataset-title" />, content: <FormattedMessage id="edit-dataset-context" values={{ id: datasetName }} /> };
            case DatasetActions.AddRollup:
                return { title: <FormattedMessage id="add-rollup-title" />, content: <FormattedMessage id="add-rollup-context" values={{ id: datasetName }} /> };
            default:
                break;
        }
    }

    const getDatasets = async () => {
        setLoading(true);
        try {
            const liveDatasetRecord = await fetchDatasets({ data: { filters: { status: [DatasetStatus.Live] } } })
            const liveDatasets = _.get(liveDatasetRecord, "data")
            _.map(liveDatasets, async (item: any) => getLiveSourceConfig(item, sourceConfigs));
            setData(liveDatasets);
        } catch (err: any) {
            showAlert(en['datasets-fetch-failure'], 'error');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getDatasets();
    }, [])

    const AsyncColumnData = (query: Record<string, any>, datasetId: any, cellKey: string) => {
        const [isLoading, setIsLoading] = useState(false);

        useEffect(() => {
            const fetchData = async (value: any) => {
                setIsLoading(true);
                try {
                    let data = await fetchChartData(value);
                    const responseData = _.isArray(data) ? _.first(data) : data;

                    // Always store the successful response in localStorage under datasetId and cellKey
                    const storedData: any = localStorage.getItem(datasetId);
                    const parsedData = !_.isEmpty(storedData) ? JSON.parse(storedData) : {};
                    parsedData[cellKey] = responseData;
                    localStorage.setItem(datasetId, JSON.stringify(parsedData));
                } catch (error) {
                    // Check if localStorage already has a value for cellKey, and only store the error if no value exists
                    const storedData: any = localStorage.getItem(datasetId);
                    const parsedData = !_.isEmpty(storedData) ? JSON.parse(storedData) : {};
                    if (!parsedData[cellKey]) {
                        // If localStorage doesn't contain a value for this cellKey, store 0 as value
                        parsedData[cellKey] = 0;
                        localStorage.setItem(datasetId, JSON.stringify(parsedData));
                    }
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData(query);
        }, []);

        if (isLoading) {
            return <CircularProgress size={20} color="success" />;
        }

        // Always read from localStorage on render, specific to the current cellKey
        const storedData = localStorage.getItem(datasetId);
        let parsedData = null;
        try {
            parsedData = storedData ? JSON.parse(storedData) : null;
        } catch (error) {
            console.error("Failed to parse stored data:", error);
            parsedData = null;
        }
        const cellData = parsedData ? parsedData[cellKey] : null;

        // Check if the stored data is an error
        if (cellData?.error) return cellData.error;

        if ([null, undefined].includes(cellData)) return "N/A";

        const hoverValue = _.get(cellData, "hoverValue") || "";
        const value: any = _.get(cellData, "value") || cellData;

        return (
            <div>
                <Tooltip title={hoverValue}>{value}</Tooltip>
            </div>
        );
    };

    const updateDatasetProps = ({ dataset_id, status, id, name, tags }: any) => {
        setData((prevState: any) => {
            let prevData = _.cloneDeep(prevState);
            const index = _.findIndex(prevData, (data: any) => {
                return dataset_id === _.get(data, 'dataset_id') && status === _.get(data, 'status') && id === _.get(data, 'id') && name === _.get(data, 'name')
            });
            _.set(prevData[index], 'tags', tags);
            return prevData;
        });
        resetEditTags();
    }

    const onSaveTags = async (dataset: any, tagsData: any) => {
        const { dataset_id, name, status, id } = dataset;
        const payload = {
            dataset_id,
            name,
            status,
            tags: tagsData,
        }
        try {
            setLoading(true)
            await updateLiveDataset({ data: { ...payload } });
            updateDatasetProps({ dataset_id, status, id, name, tags: tagsData, });
            setRefreshData(v4());
        } catch (err: any) {
            showAlert("Failed to update tags", "error");
        } finally {
            handlePopClose();
            setLoading(false)
        }
    }

    const resetEditTags = () => {
        setTagSelection({});
        handlePopClose();
    }

    const handleDownloadButton = async (dataset_id: string, version: number, status: string, fileName: string) => {
        try {
            const exportDatasetResponse = await exportDataset(dataset_id, DatasetStatus.Live);
            const jsonSchema: any = _.get(exportDatasetResponse, 'data.result')
            if (jsonSchema) {
                downloadJsonFile(jsonSchema, fileName);
            }
        }
        catch (err) {
            showAlert("Unable to export dataset", "error");
        }
    }

    const handleLiveRollups = async () => {
        await createDraftversion({ selection: _.get(selection, "dataset_id") || "", navigateToPath, rollupRedirect: true, showAlert })
    }

    const execute = () => {
        switch (executeAction) {
            case DatasetActions.Retire:
                retireDataset();
                break;
            case DatasetActions.Edit:
                editLiveDataset();
                break;
            case DatasetActions.AddRollup:
                handleLiveRollups();
                break;
            default:
                break;
        }
    }

    const columns = useMemo(
        () => [
            {
                Header: () => null,
                id: 'expander',
                className: 'cell-center',
                tipText: '',
                editable: 'false',
                Cell: ({ row }: any) => {
                    const collapseIcon = row.isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />;
                    return row.canExpand && row.depth === 0 && (
                        <Box sx={{ fontSize: '1rem', }} {...row.getToggleRowExpandedProps()}>
                            {collapseIcon}
                        </Box>
                    );
                },
                SubCell: () => null
            },
            {
                Header: 'Name',
                accessor: 'id',
                disableFilters: true,
                disableGroupBy: true,
                Aggregated: () => null,
                Cell: (value: any) => {
                    const row = value?.cell?.row?.original || {};
                    return <Box minWidth={'13.5rem'}>
                        {
                            row?.status && row?.type && (
                                <Box display="flex" alignItems="center" mb={1}>
                                    <Tooltip title={row?.status}>
                                        <FiberManualRecordIcon sx={{ fontSize: '1.25rem' }} color={_.get(statusColors, _.toLower(row?.status)) || "secondary"} />
                                    </Tooltip>
                                    <Tooltip title={row?.id}>
                                        <Typography align="left" variant="subtitle1">
                                            {row?.name}
                                        </Typography>
                                    </Tooltip>
                                </Box>
                            )
                        }
                        {
                            row?.onlyTag && (
                                <Box display="flex" alignItems="center">
                                    <Chip label={
                                        <Typography align="left" variant="caption">
                                            {row?.name}
                                        </Typography>}
                                        color="secondary"
                                        variant="outlined"
                                        size="small"
                                    />
                                    <Typography align="left" variant="subtitle1" ml={1}>
                                        {`(${row?.count})`}
                                    </Typography>
                                </Box>
                            )
                        }
                        <Box display="flex" flexDirection="row" gap={1} flexWrap="wrap" flexGrow={1} alignItems="center">
                            {
                                row?.sources && row?.sources.map((connector: string, index: number) => (
                                    <Tooltip title="Source Connector">
                                        <Chip key={index} label={
                                            <Typography align="left" variant="caption">
                                                {connector}
                                            </Typography>}
                                            color="primary"
                                            variant="outlined" size="small"
                                        />
                                    </Tooltip>
                                ))
                            }
                            {row?.type && <Tooltip title="Dataset Type">
                                <Chip label={
                                    <Typography align="left" variant="caption">
                                        {_.toUpper(row?.type)}
                                    </Typography>}
                                    color={row?.type == "dataset" ? "success" : "info"}
                                    variant="outlined"
                                    size="small"
                                /></Tooltip>}
                            {
                                row?.tags && row?.tags?.map((tag: string, index: number) => (
                                    <Tooltip title="Custom Tags">
                                        <Chip key={index} label={
                                            <Typography align="left" variant="caption">
                                                {tag}
                                            </Typography>}
                                            color={"secondary"}
                                            variant="outlined"
                                            size="small"
                                        />
                                    </Tooltip>
                                ))
                            }
                        </Box>
                    </Box>
                }
            },
            {
                Header: () => null,
                accessor: 'tags',
                disableFilters: true,
            },
            {
                Header: 'Total Events (Today)',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    const isMasterDataset = _.get(row, 'type') === DatasetType.MasterDataset;
                    const datasetId = row?.dataset_id;
                    const startDate = dayjs().format(dateFormat);
                    const endDate = dayjs().add(1, 'day').format(dateFormat);
                    const body = druidQueries.total_events_processed({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, })
                    const query = _.get(chartMeta, 'total_events_processed.query');
                    if (row?.onlyTag) return null;
                    return AsyncColumnData({ ...query, body }, datasetId, "total_events");
                }
            },
            {
                Header: 'Total Events (Yesterday)',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    const isMasterDataset = _.get(row, 'type') === DatasetType.MasterDataset;
                    const datasetId = row?.dataset_id;
                    const startDate = dayjs().subtract(1, 'day').format(dateFormat);
                    const endDate = dayjs().format(dateFormat);
                    const body = druidQueries.total_events_processed({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, })
                    const query = _.get(chartMeta, 'total_events_processed.query');
                    if (row?.onlyTag) return null;
                    return AsyncColumnData({ ...query, body }, datasetId, "total_events_yesterday");
                }
            },
            {
                Header: 'Avg Processing Time (Today)',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    const isMasterDataset = _.get(row, 'type') === DatasetType.MasterDataset;
                    const datasetId = row?.dataset_id;
                    const startDate = dayjs().format(dateFormat);
                    const endDate = dayjs().add(1, 'day').format(dateFormat);
                    const body = druidQueries.druid_avg_processing_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, })
                    const query = _.get(chartMeta, 'druid_avg_processing_time.query');
                    if (row?.onlyTag) return null;
                    return AsyncColumnData({ ...query, body }, datasetId, "average_processing_time");
                }
            },
            {
                Header: 'Avg Processing Time (Yesterday)',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    const isMasterDataset = _.get(row, 'type') === DatasetType.MasterDataset;
                    const datasetId = row?.dataset_id;
                    const startDate = dayjs().subtract(1, 'day').format(dateFormat);
                    const endDate = dayjs().format(dateFormat);
                    const body = druidQueries.druid_avg_processing_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, })
                    const query = _.get(chartMeta, 'druid_avg_processing_time.query');
                    if (row?.onlyTag) return null;
                    return AsyncColumnData({ ...query, body }, datasetId, "average_processing_time_yesterday");
                }
            },
            {
                Header: 'Last Synced Time',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    const isMasterDataset = _.get(row, 'type') === DatasetType.MasterDataset;
                    const datasetId = row?.dataset_id;
                    const startDate = dayjs().subtract(10, 'day').format(dateFormat);
                    const endDate = dayjs().add(1, 'day').format(dateFormat);
                    const body = druidQueries.last_synced_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, })
                    const query = _.get(chartMeta, 'last_synced_relative_time.query');
                    if (row?.onlyTag) return null;
                    return AsyncColumnData({ ...query, body }, datasetId, "last_synced_time");
                }
            },
            {
                Header: 'Event Failed (Today)',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    const isMasterDataset = _.get(row, 'type') === DatasetType.MasterDataset;
                    const datasetId = _.get(row, 'dataset_id');
                    const endDate = dayjs().endOf('day').unix();
                    const query = isMasterDataset ?
                        _.get(chartMeta, 'failed_events_summary_master_datasets.query') :
                        _.get(chartMeta, 'failed_events_summary.query');
                    if (row?.onlyTag) return null;
                    return AsyncColumnData({ ...query, time: endDate, dataset: datasetId, master: isMasterDataset, }, datasetId, "events_failed");
                }
            },
            {
                Header: 'Actions',
                accessor: 'color',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    if (row?.onlyTag) return null;
                    const isMaster: boolean = row?.type == DatasetType.MasterDataset;
                    const fileName = `${row?.name}_${row?.status}_${row?.version}`;
                    return <Stack direction="row" justifyContent="flex-start" alignItems="center">
                        <Tooltip title="View Dataset" onClick={(e: any) => navigateToPath(`/home/datasets/view/${row?.dataset_id}?master=${isMaster}&status=${DatasetStatus.Live}`)}>
                            <IconButton
                                data-objectid={row?.dataset_id}
                                data-objecttype="dataset"
                                color="primary"
                                size="large"
                            >
                                <EyeOutlined />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="View Metrics" onClick={(e: any) => navigateToPath(`/home/datasets/metrics/${row?.dataset_id}`)}>
                            <IconButton
                                data-edataid={interactIds.view_dataset_metrics}
                                data-objectid={row?.dataset_id}
                                data-objecttype="dataset"
                                color="primary"
                                size="large"
                            >
                                < DashboardOutlined />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Tags">
                            <IconButton
                                data-edataid={interactIds.edit_dataset_tags}
                                data-objectid={row?.dataset_id}
                                data-objecttype="dataset_tags"
                                color="primary"
                                size="large"
                                onClick={(e) => handleClick(e, row)}
                                disabled={true}
                            >
                                <StyleIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="View More Actions" >
                            <MoreOptions
                                row={row}
                                handleEdit={handleEdit}
                                handleDownloadButton={handleDownloadButton}
                                handleRetire={handleRetire}
                                navigateToPath={navigateToPath}
                                interactIds={interactIds}
                                DatasetType={DatasetType}
                                fileName={fileName}
                                setExecuteAction={setExecuteAction}
                                DatasetActions={DatasetActions} />
                        </Tooltip>
                    </Stack>
                }
            }
        ],
        []
    );

    const retireDataset = async () => {
        if (selection) {
            setLoading(true);
            try {
                await retireLiveDataset({ id: _.get(selection, "dataset_id") })
                setDatasetType(DatasetStatus.Retired)
                navigateToPath(`?status=${DatasetStatus.Retired}`)
                showAlert("Dataset retired successfully", "success");

            } catch (err: any) {
                const errMessage = _.get(err, 'response.data.params.errmsg') || en["dataset-retire-failure"];
                showAlert(errMessage, "error");
            } finally {
                getDatasets();
                setLoading(false);
                setSelection(null)
            }
        }
    }

    const handleRetire = (datasetPayload: Record<string, any>) => {
        setSelection(datasetPayload)
        setOpenAlertDialog(true)
    }

    const handleEdit = (datasetPayload: Record<string, any>) => {
        setSelection(datasetPayload)
        setOpenAlertDialog(true)
    }

    const handleClose = (status: boolean) => {
        setOpenAlertDialog(false)
    }

    const handlePopClose = () => {
        setAnchorEl(null);
    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>, dataset: any) => {
        setAnchorEl(event.currentTarget);
        setTagSelection(dataset);
    };

    const editLiveDataset = async () => {
        setOpenAlertDialog(true)
        const response = await createDraftversion({ selection: _.get(selection, "dataset_id") || "", navigateToPath, showAlert })
    }

    return (
        <MainCard content={false} border={false}>
            {loading ? renderSkeleton({ config: { type: "table", width: "100%" } }) :
                <>
                    {_.isEmpty(data) ? renderNoDatasetsMessage(en['datasets-not-found']) : <>
                        <ScrollX>
                            <FilteringTable columns={columns} data={_.orderBy(data, ["published_date"], ["desc"])} title={"Live Datasets"} toggleRefresh={refreshData} />
                        </ScrollX>
                        <AlertDialog open={openAlertDialog} handleClose={handleClose} context={alertDialogContext(_.get(selection, "name"))} action={execute} ></AlertDialog>
                        <EditDatasetTags dataset={tagSelection} handleClose={resetEditTags} handleSave={onSaveTags} open={open} anchorEl={anchorEl} /></>
                    }
                </>
            }
        </MainCard>
    );
};

export default DatasetsList;
