import { BarChartOutlined } from '@ant-design/icons';
import ReportCard from 'components/cards/statistics/ReportCard';
import chartMeta from 'data/charts';
import _ from 'lodash';
import ApexWithFilters from 'sections/dashboard/analytics/ChartFilters';
import ApexChart from 'sections/dashboard/analytics/apex';
import filters from 'data/chartFilters';
import dayjs from 'dayjs';
import { DatasetStatus } from 'types/datasets';
import { useEffect, useState } from 'react';
import { http } from "services/http";
import ObjectsProcessedStatus from 'sections/dashboard/analytics/objectProcessedStatus';
import apiEndpoints from 'data/apiEndpoints';


const ObjectConnectorMetrics = (props: any) => {

    const { datasetId, dataset, renderSections } = props;   

    const [objectMetadata, setObjectMetadata] = useState<any>([]);   
    const endpoint = apiEndpoints.fetchObjectMetadata.replace(':datasetId', datasetId);

    const fetchObjectMetadata = async () => {
        const response = await http.post(endpoint);
        const objectMetadata = _.get(response, 'data.result')
        setObjectMetadata(objectMetadata);
    }

    useEffect(() => {
        fetchObjectMetadata();
    }, [])

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
                    title: "Connector Status ",
                    charts: [
                        {
                            title: "Status",
                            primary: 0,
                            query: () => {  
                                const datasetId = dataset.data.dataset_id;
                                const status = DatasetStatus.Live;
                                const getQuery = _.get(chartMeta, 'objectStatus');
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
                                const getQuery = _.get(chartMeta, 'objectLastRunTime');
                                return _.get(getQuery({ status, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                let lastRunTime;
                                const inTimes = objectMetadata.map((object: any) => {
                                    if(object.dataset_id === datasetId)
                                        return dayjs(object.in_time).unix()
                                });
                                const endProcessingTimes = objectMetadata.map((object: any) => {
                                    if(object.dataset_id === datasetId) {
                                        if(object.end_processing_time)
                                            return dayjs(object.end_processing_time).unix()
                                        else {
                                            return 0;
                                        }
                                    }
                                });
                                const allTimes = inTimes.concat(endProcessingTimes);
                                if (allTimes.length > 0) {  
                                    lastRunTime = dayjs.unix(Math.max(...allTimes)).fromNow()
                                }
                                return <ReportCard primary={lastRunTime} secondary={title} iconPrimary={BarChartOutlined} query={() => {}} />
                            }
                        },
                    ]
                },
                {
                    title: "Today ",
                    charts: [
                        {
                            title: "Discovered",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().startOf('day').unix();
                                const evaluationEndTime = dayjs().endOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'objectNumberOfObjectsDiscovered');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                const objectsDiscovered = objectMetadata.filter((object: any) => dayjs(object.in_time).isBetween(dayjs().startOf('day'), dayjs().endOf('day'))).length;
                                return <ReportCard primary={objectsDiscovered} secondary={title} iconPrimary={BarChartOutlined} query={() => {}} />
                            }
                        },
                        {
                            title: "Processed",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().startOf('day').unix();
                                const evaluationEndTime = dayjs().endOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'numberOfObjectsProcessed');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                const objectsProcessed = objectMetadata.filter((object: any) => object.status === 'success' && dayjs(object.end_processing_time).isBetween(dayjs().startOf('day'), dayjs().endOf('day'))).length;
                                return <ReportCard primary={objectsProcessed} secondary={title} iconPrimary={BarChartOutlined} query={() => {}} />
                            }
                        },
                        {
                            title: "Events Processed",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().startOf('day').unix();
                                const evaluationEndTime = dayjs().endOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'numberOfEventsProcessed');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                        {
                            title: "Avg Processing Time",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().startOf('day').unix();
                                const evaluationEndTime = dayjs().endOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'objectProcessingTime');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                        {
                            title: "Avg File Size (MB)",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().startOf('day').unix();
                                const evaluationEndTime = dayjs().endOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'objectProcessedSize');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) =>
                                <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: "Authentication Failure",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().startOf('day').unix();
                                const evaluationEndTime = dayjs().endOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'cloudAuthFailureCount');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                        {
                            title: "Processing Failure",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().startOf('day').unix();
                                const evaluationEndTime = dayjs().endOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'failedObjectsCount');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                const failedObjects = objectMetadata.filter((object: any) => object.status === 'failed' && dayjs(object.in_time).isBetween(dayjs().startOf('day'), dayjs().endOf('day'))).length;
                                return <ReportCard primary={failedObjects} secondary={title} iconPrimary={BarChartOutlined} query={() => {}} />
                            }
                        },
                        {
                            title: "Number Of API Calls",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().startOf('day').unix();
                                const evaluationEndTime = dayjs().endOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'numApiCalls');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        }
                    ]
                },
                {
                    title: "Yesterday ",
                    charts: [
                        {
                            title: "Discovered",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().subtract(1, 'day').startOf('day').unix();
                                const evaluationEndTime = dayjs().startOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'objectNumberOfObjectsDiscovered');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                const objectsDiscovered = objectMetadata.filter((object: any) => dayjs(object.in_time).isBetween(dayjs().subtract(1, 'day').startOf('day'), dayjs().startOf('day'))).length;
                                return <ReportCard primary={objectsDiscovered} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                        {
                            title: "Processed",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().subtract(1, 'day').startOf('day').unix();
                                const evaluationEndTime = dayjs().startOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'numberOfObjectsProcessed');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                const objectsProcessed = objectMetadata.filter((object: any) => object.status === 'success' && dayjs(object.end_processing_time).isBetween(dayjs().subtract(1, 'day').startOf('day'), dayjs().startOf('day'))).length;
                                return <ReportCard primary={objectsProcessed} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                        {
                            title: "Events Processed",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().subtract(1, 'day').startOf('day').unix();
                                const evaluationEndTime = dayjs().startOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'numberOfEventsProcessed');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                        {
                            title: "Avg Processing Time",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().subtract(1, 'day').startOf('day').unix();
                                const evaluationEndTime = dayjs().startOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'objectProcessingTime');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                        {
                            title: "Avg File Size (MB)",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().subtract(1, 'day').startOf('day').unix();
                                const evaluationEndTime = dayjs().startOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'objectProcessedSize');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) =>
                                <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                        },
                        {
                            title: "Authentication Failure",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().subtract(1, 'day').startOf('day').unix();
                                const evaluationEndTime = dayjs().startOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'cloudAuthFailureCount');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                        {
                            title: "Processing Failure",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().subtract(1, 'day').startOf('day').unix();
                                const evaluationEndTime = dayjs().startOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'failedObjectsCount');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                const failedObjects = objectMetadata.filter((object: any) => object.status === 'failed' && dayjs(object.in_time).isBetween(dayjs().subtract(1, 'day').startOf('day').unix(), dayjs().startOf('day'))).length;
                                return <ReportCard primary={failedObjects} secondary={title} iconPrimary={BarChartOutlined} query={query} />
                            }
                        },
                        {
                            title: "Number Of API Calls",
                            primary: 0,
                            query: () => {
                                const evaluationStartTime = dayjs().subtract(1, 'day').startOf('day').unix();
                                const evaluationEndTime = dayjs().startOf('day').unix();
                                const datasetId = dataset.data.dataset_id;
                                const getQuery = _.get(chartMeta, 'numApiCalls');
                                return _.get(getQuery({ evaluationEndTime, evaluationStartTime, datasetId }), 'query');
                            },
                            chart: ({ title, query, primary }: any) => {
                                return <ReportCard primary={primary} secondary={title} iconPrimary={BarChartOutlined} query={query} />
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
                    title: 'Processing Status',
                    query: () => {
                        const datasetId = dataset.data.dataset_id;
                        const getQuery = _.get(chartMeta, 'objectProcessedCount');
                        return getQuery({ datasetId });
                    },
                    chart: ({ title, query }: any) => {
                    const objectsDiscovered = objectMetadata.filter((object: any) => object.status === 'to_be_processed');
                    const objectsProcessed = objectMetadata.filter((object: any) => object.status === 'success');
                    const objectsFailed = objectMetadata.filter((object: any) => object.status === 'failed');
                    return (
                    <ApexWithFilters description="This chart displays the progress of objects that have been processed and yet to be processed" title={title} filters={_.get(filters, 'variant1')}>
                        <ObjectsProcessedStatus objectsDiscovered={objectsDiscovered} objectsProcessed={objectsProcessed} objectsFailed={objectsFailed} filters={_.get(filters, 'variant1')} />
                    </ApexWithFilters>
                    )
                    }
                },
                {
                    title: 'Number of Files Processed',
                    query: () => {
                        const datasetId = dataset.data.dataset_id;
                        const getQuery = _.get(chartMeta, 'objectTotalNumberOfObjectsProcessed');
                        return getQuery({ datasetId });
                    },
                    chart: ({ title, query }: any) => <ApexWithFilters description="This chart displays the number of files that have been successfully processed by Obsrv" title={title} filters={_.get(filters, 'variant1')}>
                        <ApexChart metadata={query} interval={1140}></ApexChart>
                    </ApexWithFilters>
                },
                {
                    title: 'Number Of Events Processed',
                    query: () => {
                        const datasetId = dataset.data.dataset_id;
                        const getQuery = _.get(chartMeta, 'objectTotalNumberOfEventsProcessed');
                        return getQuery({ datasetId });
                    },
                    chart: ({ title, query }: any) => <ApexWithFilters description="This chart displays the total number of events from all files that have been ingested into Obsrv" title={title} filters={_.get(filters, 'variant1')}>
                        <ApexChart metadata={query} interval={1140}></ApexChart>
                    </ApexWithFilters>
                }
            ]
        }
    }


    return <>
        {renderSections(data)}
    </>
}

export default ObjectConnectorMetrics