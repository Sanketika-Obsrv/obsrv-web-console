import { useEffect, useMemo, useState } from 'react';
import { Chip, Stack, Tooltip, Typography, } from '@mui/material';
import MainCard from 'components/MainCard';
import ScrollX from 'components/ScrollX';
import { IconButton, Box } from '@mui/material';
import { PlayCircleOutlined, EditOutlined, DeleteFilled, ExportOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import FilteringTable from 'components/filtering-table';
import AlertDialog from 'components/AlertDialog';
import { useNavigate } from 'react-router';
import { publishDataset } from 'services/system';
import { error, success } from 'services/toaster';
import dayjs from 'dayjs';
import * as _ from 'lodash';
import interactIds from 'data/telemetry/interact.json';
import { exportDataset, fetchDatasets, deleteDataset, updateDataset, getDraftTagsPayload, versionKeyMap, setVersionKey } from 'services/dataset';
import EditDatasetTags from 'components/EditDatasetTags';
import StyleIcon from '@mui/icons-material/Style';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { v4 } from 'uuid';
import BackdropLoader from 'components/BackdropLoader';
import Loader from 'components/Loader';
import { renderSkeleton } from 'services/skeleton';
import PostAddIcon from '@mui/icons-material/PostAdd';
import en from 'utils/locales/en.json';
import { DatasetStatus, DatasetType } from 'types/datasets';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { downloadJSONSchema, flattenSchema } from 'services/json-schema';
import { downloadJsonFile } from 'utils/downloadUtils';
import { alertDialogContext } from './draftDatasetsList';
import { setDatasets } from 'store/reducers/dataset';
import { getDraftSourceConfig, renderNoDatasetsMessage } from './datasets';
import { http } from 'services/http';
import apiEndpoints from 'data/apiEndpoints';

const ReadyToPublishDatasetsList = ({ setDatasetType, sourceConfigs }: any) => {
    const [data, setData] = useState<any>([]);
    const [openAlertDialog, setOpenAlertDialog] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [tagSelection, setTagSelection] = useState<any>({});
    const [anchorEl, setAnchorEl] = useState<any>(null);
    const [refreshData, setRefreshData] = useState<string>('false');
    const [selection, setSelection] = useState<any>(null);
    const open = Boolean(anchorEl);
    const wizardState = useSelector((state: any) => state?.wizard);
    const versionKeyValue = _.get(wizardState, 'pages.datasetConfiguration.state.config.versionKey');

    const navigateToPath = (path: string) => {
        navigate(path);
    }

    const getDatasets = async () => {
        setIsLoading(true);
        try {
            const readyToPublishRecords = await fetchDatasets({ data: { filters: { status: [DatasetStatus.ReadyToPublish] } } })
            const datasets = _.get(readyToPublishRecords, "data")
            setVersionKey({ datasets })
            _.map(datasets, async (item: any) => getDraftSourceConfig(item, sourceConfigs));
            setData(datasets);
            dispatch(setDatasets(datasets));
        } catch (err: any) {
            dispatch(error({ "message": en['datasets-fetch-failure'] }));
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        getDatasets();
    }, [])

    const publishDraftDataset = async (datasetId: string) => {
        await publishDataset({ data: { datasetId } });
        dispatch(success({ message: en['dataset-publish-success'] }));
        getDatasets();
        setDatasetType(DatasetStatus.Live)
        navigateToPath(`?status=${DatasetStatus.Live}`)
    }

    const publish = async (payload: Record<string, any>) => {
        setIsLoading(true);
        const { dataset_id } = payload;
        try {
            await publishDraftDataset(dataset_id)
        } catch (err) {
            const errorCode = _.get(err, "response.data.error.code")
            if (errorCode === "DATASET_API_VERSION_MISMATCH") {
                try {
                    const readResponse = await http.get(`${apiEndpoints.readDataset}/${dataset_id}?mode=edit`)
                    await publishDraftDataset(dataset_id)
                }
                catch (err) {
                    dispatch(error({ message: en["dataset-publish-failure"] }));
                }
            }
            else {
                dispatch(error({ message: en["dataset-publish-failure"] }));
            }
        } finally {
            setIsLoading(false);
        }
    }

    const handleRetire = (datasetPayload: Record<string, any>) => {
        setSelection(datasetPayload)
        setOpenAlertDialog(true)
    }

    const retireDataset = async () => {
        if (selection) {
            setIsLoading(true);
            try {
                await deleteDataset({ id: _.get(selection, "dataset_id") })
                dispatch(success({ message: en["dataset-delete-success"] }));
            } catch (err: any) {
                const errMessage = _.get(err, 'response.data.params.errmsg') || en["dataset-delete-failure"];
                dispatch(error({ message: errMessage }));
            } finally {
                await getDatasets();
                setRefreshData(v4())
                setIsLoading(false);
                setSelection(null)
            }
        }
    }

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

    const handleDownloadButton = async (dataset_id: string, version: number, status: string, fileName: string) => {
        try {
            const exportDatasetResponse = await exportDataset(dataset_id, DatasetStatus.Draft);
            const jsonSchema: any = _.get(exportDatasetResponse, 'data.result')
            if (jsonSchema) {
                const data = _.get(downloadJSONSchema({ schema: jsonSchema }, { schema: flattenSchema(jsonSchema?.data_schema) }), 'schema');
                downloadJsonFile(data, fileName);
            }
        }
        catch (err) {
            console.log(err)
            dispatch(error({ message: "Unable to export dataset" }));
        }
    }

    const onSaveTags = async (dataset: any, tagsData: any) => {
        const { dataset_id, name, status, id, tags } = dataset;
        const tagPayload = getDraftTagsPayload({ tags, tagsData })
        const payload = {
            dataset_id: dataset_id,
            name,
            ...(_.size(tagPayload) && { tags: tagPayload }),
        }
        try {
            setIsLoading(true)
            const response = await updateDataset({ data: { ...payload } });
            updateDatasetProps({ dataset_id, status, id, name, tags: tagsData, });
            setRefreshData(v4());
        } catch (err: any) {
            dispatch(error({ message: en["dataset-update-tags-failure"] }));
        } finally {
            handlePopClose();
            setIsLoading(false)
        }
    }

    const resetEditTags = () => {
        setTagSelection({});
        handlePopClose();
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
                Cell: (value: any) => {
                    const row = value?.cell?.row?.original || {};
                    return <Box minWidth={'10rem'}>
                        {
                            row?.onlyTag && (
                                <Box display="flex" alignItems="center">
                                    <Chip label={
                                        <Typography align="left" variant="caption">
                                            {row?.name}
                                        </Typography>}
                                        color="secondary"
                                        variant="combined"
                                        size="small"
                                    />
                                    <Typography align="left" variant="subtitle1" ml={1}>
                                        {`(${row?.count})`}
                                    </Typography>
                                </Box>
                            )
                        }
                        {
                            row?.status && row?.type && (
                                <Box display="flex" alignItems="center" mb={1}>
                                    <Tooltip title={row?.status}>
                                        <FiberManualRecordIcon sx={{ fontSize: '1.25rem' }} color={"info"} />
                                    </Tooltip>
                                    <Tooltip title={row?.dataset_id}>
                                        <Typography align="left" variant="subtitle1">
                                            {row?.name}
                                        </Typography>
                                    </Tooltip>
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
                                            variant="combined" size="small"
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
                                    variant="combined"
                                    size="small"
                                />
                            </Tooltip>}
                            {
                                row?.tags && row?.tags?.map((tag: string, index: number) => (
                                    <Tooltip title="Custom Tag">
                                        <Chip key={index} label={
                                            <Typography align="left" variant="caption">
                                                {tag}
                                            </Typography>}
                                            color="secondary"
                                            variant="combined"
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
                Header: 'Created',
                accessor: 'created_date',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    if (row?.onlyTag) return null;
                    if (!value) return ["N/A", "primary"];
                    const createdOn = dayjs(value).fromNow();
                    return <Tooltip title={dayjs(value).format('YYYY-MM-DD HH:mm:ss') || "-"} placement='bottom-start' >
                        <Box minWidth={"10rem"}>{createdOn}</Box>
                    </Tooltip>
                }
            },
            {
                Header: 'Updated',
                accessor: 'updated_date',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    if (row?.onlyTag) return null;
                    if (!value) return ["N/A", "primary"];
                    const updatedOn = dayjs(value).fromNow();
                    return <Tooltip title={dayjs(value).format('YYYY-MM-DD HH:mm:ss') || "-"} placement='bottom-start' >
                        <Box minWidth={"10rem"}>{updatedOn}</Box>
                    </Tooltip>
                }
            },
            {
                Header: 'Actions',
                accessor: 'color',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    const fileName = `${row?.name}_${row?.status}_${row?.version}`;
                    if (row?.onlyTag) return null;
                    const status = _.toLower(row?.status)
                    const publishDataset: boolean = _.toLower(status) !== _.toLower(DatasetStatus.ReadyToPublish) || isLoading
                    return <Stack direction="row" justifyContent="flex-start" alignItems="center">
                        <Tooltip title="Publish Dataset" onClick={(e: any) => publish(row)}>
                            <IconButton
                                data-edataid={interactIds.publish_dataset}
                                data-objectid={row?.dataset_id}
                                data-objecttype={row?.type === DatasetType.MasterDataset ? 'masterDataset' : 'dataset'}
                                color="primary"
                                size="large"
                                disabled={publishDataset}>
                                <PlayCircleOutlined />
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
                            >
                                <StyleIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Dataset">
                            <IconButton
                                data-edataid={interactIds.edit_dataset}
                                data-objectid={row?.dataset_id}
                                data-objecttype={row?.type === DatasetType.MasterDataset ? 'masterDataset' : 'dataset'}
                                color="primary"
                                size="large"
                                onClick={_ => navigateToPath(`/datasets/edit/${row.dataset_id}?master=${row.type === DatasetType.MasterDataset}&status=${row.status}`)}>
                                <EditOutlined />
                            </IconButton>
                        </Tooltip>
                        {/* <Tooltip title="Rollup Management" onClick={(e: any) => navigateToPath(`/datasets/management/${row?.dataset_id}?status=${DatasetStatus.ReadyToPublish}`)}>
                            <IconButton
                                color="primary"
                                size="large"
                                data-edataid={interactIds.add_dataset_rollup}
                                data-objectid={row?.dataset_id}
                                data-objecttype={row?.type === DatasetType.MasterDataset ? 'masterDataset' : 'dataset'}
                                disabled={row?.type === DatasetType.MasterDataset || publishDataset}
                            >
                                <PostAddIcon />
                            </IconButton>
                        </Tooltip> */}
                        <Tooltip title="Export Dataset">
                            <IconButton
                                color="primary"
                                size="large"
                                onClick={(e: any) => handleDownloadButton(row?.dataset_id, row?.version, row?.status, fileName)}
                                data-objectid={row?.dataset_id}
                                data-objecttype={row?.type === DatasetType.MasterDataset ? 'masterDataset' : 'dataset'}
                                disabled={row?.type === publishDataset}
                            >
                                <ExportOutlined />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Dataset">
                            <IconButton
                                color="error"
                                size="large"
                                onClick={(e: any) => handleRetire(row)}
                                data-objectid={row?.dataset_id}
                                data-objecttype={row?.type === DatasetType.MasterDataset ? 'masterDataset' : 'dataset'}
                            >
                                <DeleteFilled />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                }
            }
        ],
        []
    );

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

    return (
        <MainCard content={false}>
            {isLoading && <Loader />}
            <BackdropLoader open={isLoading} />
            {isLoading ? renderSkeleton({ config: { type: "table", width: "100%" } }) :
                <>
                    {_.isEmpty(data) ? renderNoDatasetsMessage(en['datasets-not-found']) : <>
                        <ScrollX>
                            <FilteringTable columns={columns} data={_.orderBy(data, ["created_date"], ["desc"])} title={"Ready For Publish Datasets"} toggleRefresh={refreshData} />
                        </ScrollX>
                        <AlertDialog open={openAlertDialog} handleClose={handleClose} context={alertDialogContext(_.get(selection, "name"))} action={retireDataset}></AlertDialog>
                        <EditDatasetTags dataset={tagSelection} handleClose={resetEditTags} handleSave={onSaveTags} open={open} anchorEl={anchorEl} />
                    </>
                    }
                </>
            }
        </MainCard>
    );
};

export default ReadyToPublishDatasetsList;
