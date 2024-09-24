import { useEffect, useMemo, useState } from 'react';
import { Chip, Tooltip, Typography, } from '@mui/material';
import MainCard from 'components/MainCard';
import ScrollX from 'components/ScrollX';
import { Box } from '@mui/material';
import FilteringTable from 'components/filtering-table';
import dayjs from 'dayjs';
import * as _ from 'lodash';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import BackdropLoader from 'components/BackdropLoader';
import Loader from 'components/Loader';
import { renderSkeleton } from 'services/skeleton';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { fetchDatasets } from 'services/dataset';
import { DatasetStatus } from 'types/datasets';
import { getDraftSourceConfig, renderNoDatasetsMessage } from './datasets';
import { setDatasets } from 'store/reducers/dataset';
import { useDispatch } from 'react-redux';
import { error } from 'services/toaster';
import en from 'utils/locales/en.json';

const RetiredDatasets = (props: any) => {
    const { sourceConfigs } = props
    const dispatch = useDispatch();
    const [data, setData] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshData, setRefreshData] = useState<string>('false');

    const getDatasets = async () => {
        setIsLoading(true);
        try {
            const retiredRecords = await fetchDatasets({ data: { filters: { status: [DatasetStatus.Retired] } } })
            const datasets = _.get(retiredRecords, "data")
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
                                        <FiberManualRecordIcon sx={{ fontSize: '1.25rem' }} color={"secondary"} />
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
                Header: 'Retired',
                accessor: 'updated_date',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    if (row?.onlyTag) return null;
                    const retiredOn = dayjs(value).fromNow();
                    return <Tooltip title={dayjs(value).format('YYYY-MM-DD HH:mm:ss') || "-"} placement='bottom-start' >
                        <Box minWidth={"10rem"}>{retiredOn}</Box>
                    </Tooltip>
                }
            }
        ],
        []
    );

    return (
        <MainCard content={false}>
            {isLoading && <Loader />}
            <BackdropLoader open={isLoading} />
            {isLoading ? renderSkeleton({ config: { type: "table", width: "100%" } }) :
                <>
                    {_.isEmpty(data) ? renderNoDatasetsMessage(en['datasets-not-found']) : <>
                        <ScrollX>
                            <FilteringTable columns={columns} data={_.orderBy(data, ["created_date"], ["desc"])} title={"Retired Datasets"} toggleRefresh={refreshData} />
                        </ScrollX>
                    </>
                    }
                </>
            }
        </MainCard>
    );
};

export default RetiredDatasets;
