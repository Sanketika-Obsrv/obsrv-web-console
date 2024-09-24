import { BarChartOutlined } from '@ant-design/icons';
import ReportCard from 'components/cards/statistics/ReportCard';
import chartMeta from 'data/charts';
import _ from 'lodash';
import ApexWithFilters from 'sections/dashboard/analytics/ChartFilters';
import ApexChart from 'sections/dashboard/analytics/apex';
import filters from 'data/chartFilters';
import dayjs from 'dayjs';
import { DatasetStatus } from 'types/datasets';

const JDBCConnectorMetrics = (props: any) => {
    const { datasetId, dataset, renderSections } = props;

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
                    title: "Status ",
                    charts: [
                        {
                            title: "Status",
                            primary: 0,
                            query: () => {
                                const datasetId = dataset.data.dataset_id;
                                const status = DatasetStatus.Live;
                                const getQuery = _.get(chartMeta, 'jdbcStatus');
                                return _.get(getQuery({ status, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                        {
                            title: "Last Run Time",
                            primary: 0,
                            query: () => {
                                const datasetId = dataset.data.dataset_id;
                                const status = DatasetStatus.Live;
                                const getQuery = _.get(chartMeta, 'jdbcLastRunTime');
                                return _.get(getQuery({ status, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                    ]
                },
                {
                    title: 'Today ',
                    charts: [
                        {
                            title: 'Events Processed',
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().startOf('day').unix();
                                const evaluationEndTime = dayjs().endOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'jdbcNumberOfEventsProcessed');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />;
                            }
                        },
                        {
                            title: 'Events Failed',
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().startOf('day').unix();
                                const evaluationEndTime = dayjs().endOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'jdbcNumberOfFailedEvents');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />;
                            }
                        },
                        {
                            title: 'Avg Processing Time',
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().startOf('day').unix();
                                const evaluationEndTime = dayjs().endOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'jdbcAvgProcessingTime');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />;
                            }
                        }
                    ]
                },
                {
                    title: 'Yesterday ',
                    charts: [
                        {
                            title: 'Events Processed',
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().subtract(1, 'day').startOf('day').unix();
                                const evaluationEndTime = dayjs().startOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'jdbcNumberOfEventsProcessed');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />;
                            }
                        },
                        {
                            title: 'Events Failed',
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().subtract(1, 'day').startOf('day').unix();
                                const evaluationEndTime = dayjs().startOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'jdbcNumberOfFailedEvents');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />;
                            }
                        },
                        {
                            title: 'Avg Processing Time',
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().subtract(1, 'day').startOf('day').unix();
                                const evaluationEndTime = dayjs().startOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'jdbcAvgProcessingTime');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />;
                            }
                        }
                    ]
                }
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
                    title: 'Events Processed',
                    query: () => {
                        const datasetId = dataset.data.dataset_id;
                        const getQuery = _.get(chartMeta, 'jdbcTotalNumberOfEventsProcessed');
                        return getQuery({ datasetId });
                    },
                    chart: ({ title, query }: any) => (
                        <ApexWithFilters description="This chart displays the number of events that have been successfully processed by Obsrv" title={title} filters={_.get(filters, 'variant1')}>
                            <ApexChart metadata={query} interval={1140}></ApexChart>
                        </ApexWithFilters>
                    )
                },
                {
                    title: 'Failed Events',
                    query: () => {
                        const datasetId = dataset.data.dataset_id;
                        const getQuery = _.get(chartMeta, 'jdbcTotalNumberOfFailedEvents');
                        return getQuery({ datasetId });
                    },
                    chart: ({ title, query }: any) => (
                        <ApexWithFilters description="This chart displays the number of failed events" title={title} filters={_.get(filters, 'variant1')}>
                            <ApexChart metadata={query} interval={1140}></ApexChart>
                        </ApexWithFilters>
                    )
                }
            ]
        }
    };

    return <>{renderSections(data)}</>;
};

export default JDBCConnectorMetrics;