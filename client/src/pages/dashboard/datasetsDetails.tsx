import { Grid, Typography } from '@mui/material';
import MainCard from 'components/MainCard';
import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router';
import { datasetRead } from 'services/dataset';
import { error } from 'services/toaster';
import * as _ from 'lodash';
import ReportCard from 'components/cards/statistics/ReportCard';
import { BarChartOutlined } from '@ant-design/icons';
import { druidQueries } from 'services/druid';
import dayjs from 'dayjs';
import chartMeta from 'data/charts';
import ApexChart from 'sections/dashboard/analytics/apex';
import ApexWithFilters from 'sections/dashboard/analytics/ChartFilters';
import filters from 'data/chartFilters';
import { DatasetStatus, DatasetType } from 'types/datasets';

const DatasetDetails = () => {
    const dispatch = useDispatch();
    const params = useParams();
    const { datasetId, datasetType } = params;
    const [datasetDetails, setDatasetDetails] = useState({ data: null, status: "loading" });
    const isMasterDataset = useMemo(() => _.get(datasetDetails, 'data.type') === DatasetType.MasterDataset, [datasetDetails]);
    const hasBatchConfig = useMemo(() => _.get(datasetDetails, ['data', 'extraction_config', 'is_batch_event',]), [datasetDetails]);

    const dateFormat = 'YYYY-MM-DDT00:00:00+05:30'

    const data = {
        small: {
            size: {
                xs: 12,
                sm: 4,
                md: 4,
                lg: 4
            },
            groups: [
                {
                    title: "Dataset Status ",
                    charts: [
                        {
                            title: "Status",
                            primary: _.get(datasetDetails, 'data.status'),
                            query: () => {
                                return { ..._.get(chartMeta, 'druid_health_status.query') }
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                        {
                            title: 'Last Synced Time',
                            query: () => {
                                const startDate = '2000-01-01';
                                const endDate = dayjs().add(1, 'day').format(dateFormat);
                                const body = druidQueries.last_synced_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, })
                                return { ..._.get(chartMeta, 'last_synced_time.query'), body }
                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                    ],
                },
                {
                    title: "Today ",
                    charts: [
                        {
                            title: 'Total Events Processed',
                            query: () => {
                                const startDate = dayjs().format(dateFormat);
                                const endDate = dayjs().add(1, 'day').format(dateFormat);
                                const body = druidQueries.total_events_processed({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, })
                                return { ..._.get(chartMeta, 'total_events_processed.query'), body }
                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />

                        },
                        {
                            title: 'Min Processing Time',
                            query: () => {
                                const startDate = dayjs().format(dateFormat);
                                const endDate = dayjs().add(1, 'day').format(dateFormat);
                                const body = druidQueries.druid_min_processing_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, });
                                return { ..._.get(chartMeta, 'minProcessingTime.query'), body }

                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: 'Average Processing Time',
                            query: () => {
                                const startDate = dayjs().format(dateFormat);
                                const endDate = dayjs().add(1, 'day').format(dateFormat);
                                const body = druidQueries.druid_avg_processing_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, });
                                return { ..._.get(chartMeta, 'avgProcessingTime.query'), body }

                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: 'Max Processing Time',
                            query: () => {
                                const startDate = dayjs().format(dateFormat);
                                const endDate = dayjs().add(1, 'day').format(dateFormat);
                                const body = druidQueries.druid_max_processing_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, });
                                return { ..._.get(chartMeta, 'maxProcessingTime.query'), body }

                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: 'Total Duplicate Batches',
                            render: hasBatchConfig,
                            query: () => {
                                const endDate = dayjs().endOf('day').unix();
                                return { ..._.get(chartMeta, 'duplicate_batches_summary.query'), time: endDate, dataset: datasetId, }
                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: 'Total Duplicate Events',
                            query: () => {
                                const endDate = dayjs().endOf('day').unix();
                                return { ..._.get(chartMeta, 'duplicate_events_summary.query'), time: endDate, dataset: datasetId, }
                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: 'Total Failed Events',
                            query: () => {
                                const endDate = dayjs().endOf('day').unix();
                                const metadata = isMasterDataset ?
                                    _.cloneDeep({ ..._.get(chartMeta, 'failed_events_summary_master_datasets.query'), time: endDate, dataset: datasetId, }) :
                                    _.cloneDeep({ ..._.get(chartMeta, 'failed_events_summary.query'), time: endDate, dataset: datasetId, });
                                return metadata;
                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />

                        },
                    ],
                },
                {
                    title: "Yesterday ",
                    charts: [
                        {
                            title: 'Total Events Processed',
                            query: () => {
                                const startDate = dayjs().subtract(1, 'day').format(dateFormat);
                                const endDate = dayjs().format(dateFormat);
                                const body = druidQueries.total_events_processed({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, })
                                return { ..._.get(chartMeta, 'total_events_processed.query'), body }
                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: 'Min Processing Time',
                            query: () => {
                                const startDate = dayjs().subtract(1, 'day').format(dateFormat);
                                const endDate = dayjs().format(dateFormat);
                                const body = druidQueries.druid_min_processing_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, });
                                return { ..._.get(chartMeta, 'minProcessingTime.query'), body }

                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: 'Average Processing Time',
                            query: () => {
                                const startDate = dayjs().subtract(1, 'day').format(dateFormat);
                                const endDate = dayjs().format(dateFormat);
                                const body = druidQueries.druid_avg_processing_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, });
                                return { ..._.get(chartMeta, 'avgProcessingTime.query'), body }

                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: 'Max Processing Time',
                            query: () => {
                                const startDate = dayjs().subtract(1, 'day').format(dateFormat);
                                const endDate = dayjs().format(dateFormat);
                                const body = druidQueries.druid_max_processing_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, });
                                return { ..._.get(chartMeta, 'maxProcessingTime.query'), body }

                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: 'Total Duplicate Batches',
                            render: hasBatchConfig,
                            query: () => {
                                const endDate = dayjs().endOf('day').subtract(1, 'day').unix();
                                return { ..._.get(chartMeta, 'duplicate_batches_summary.query'), time: endDate, dataset: datasetId, }
                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: 'Total Duplicate Events',
                            query: () => {
                                const endDate = dayjs().format(dateFormat);
                                return { ..._.get(chartMeta, 'duplicate_events_summary.query'), time: endDate, dataset: datasetId, }
                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: 'Total Failed Events',
                            query: () => {
                                const endDate = dayjs().endOf('day').subtract(1, 'day').unix();
                                const metadata = isMasterDataset ?
                                    _.cloneDeep({ ..._.get(chartMeta, 'failed_events_summary_master_datasets.query'), time: endDate, dataset: datasetId, }) :
                                    _.cloneDeep({ ..._.get(chartMeta, 'failed_events_summary.query'), time: endDate, dataset: datasetId, });
                                return metadata;
                            },
                            chart: ({ title, query }: any) => <ReportCard primary="0" secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                    ],
                },
            ]
        },
        medium: {
            size: {
                xs: 12,
                sm: 6,
                md: 6,
                lg: 6
            },
            charts: [
                {
                    title: 'Total Events Processed',
                    query: () => {
                        const metadata = isMasterDataset ?
                            _.cloneDeep(_.get(chartMeta, 'totalEventsProcessedTimeSeriesPerMasterDataset')) :
                            _.cloneDeep(_.get(chartMeta, 'totalEventsProcessedTimeSeriesPerDataset'));
                        _.set(metadata, 'query.body.query.filter.fields[1].value', datasetId);
                        return metadata;
                    },
                    chart: ({ title, query }: any) => <ApexWithFilters title={title} filters={_.get(filters, 'variant1')}>
                        <ApexChart metadata={query} interval={1140}></ApexChart>
                    </ApexWithFilters>
                },
                {
                    title: 'Events Processing Time (ms)',
                    query: () => {
                        const metadata = isMasterDataset ?
                            _.cloneDeep(_.get(chartMeta, 'minProcessingTimeSeriesPerMasterDataset')) :
                            _.cloneDeep(_.get(chartMeta, 'minProcessingTimeSeriesPerDataset'));
                        _.set(metadata, 'query.body.query.filter.fields[1].value', datasetId);
                        return metadata;
                    },
                    chart: ({ title, query }: any) => <ApexWithFilters title={title} filters={_.get(filters, 'variant1')}>
                        <ApexChart metadata={query} interval={1140}></ApexChart>
                    </ApexWithFilters>
                }
            ]
        }
    }

    const fetchDataset = async () => {
        try {
            const response = await datasetRead({ datasetId: `${datasetId}?status=${DatasetStatus.Live}` }).then(response => _.get(response, 'data.result'));
            setDatasetDetails({ data: response, status: 'success' });
        } catch (err) {
            dispatch(error({ message: 'Read Dataset Failed' }));
            setDatasetDetails({ data: null, status: 'failed' });
        }
    }

    useEffect(() => {
        fetchDataset();
    }, [])

    const renderSections = () => {
        return _.flatten(_.map(data, (value, index) => {
            const { size, charts = [], groups = [], } = value as any;
            const { xs, sm, lg, md } = size;
            const chartsData = (
                <Grid container spacing={2} key={Math.random()} marginBottom={1}>
                    {
                        _.map(charts, (chartMetadata: Record<string, any>, index: number) => {
                            const { title, query: getQuery, chart, render = true, ...rest } = chartMetadata;
                            if (render)
                                return <Grid item xs={xs} sm={sm} md={md} lg={lg} key={`${Math.random()}`} alignItems="stretch">
                                    {chart({ title, query: getQuery(), ...rest })}
                                </Grid>
                            else return null;
                        })
                    }
                </Grid>
            );
            const groupsData = _.map(groups, (group) => {
                const { charts: groupCharts, title } = group;
                return (
                    <Grid container spacing={2} key={Math.random()} alignItems="stretch" marginBottom={1}>
                        <Grid item xs={12}>
                            <Typography variant="h5">{title}</Typography>
                        </Grid>
                        {
                            _.map(groupCharts, (chartMetadata: Record<string, any>, index: number) => {
                                const { title, query: getQuery, chart, render = true, ...rest } = chartMetadata;
                                if (render)
                                    return <Grid item xs={xs} sm={sm} md={md} lg={lg} key={`${Math.random()}`} alignItems="stretch">
                                        {chart({ title, query: getQuery(), ...rest })}
                                    </Grid>
                                else return null;
                            })
                        }
                        <Grid item xs={12}></Grid>
                    </Grid>
                );
            });
            if (_.size(groups) > 0) return groupsData;
            else return chartsData;
        }))
    }

    return <>
        {renderSections()}
    </>
};

export default DatasetDetails;
