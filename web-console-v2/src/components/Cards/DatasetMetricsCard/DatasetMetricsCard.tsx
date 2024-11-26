import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { Box, Grid, Tooltip } from '@mui/material';
import _ from 'lodash';
import { fetchMetricData } from '../../../services/chartMetrics';
import styles from "./DatasetMetricsCard.module.css"
import chartMeta from 'data/chartsV1';
import dayjs from 'dayjs';
import { druidQueries } from 'services/druid';
import { useParams } from 'react-router-dom';
import { useAlert } from 'contexts/AlertContextProvider';
import { DatasetStatus, DatasetType } from 'types/datasets';
import ApexWithFilters from 'pages/Dashboard/analytics/ChartFilters';
import ApexChart from 'pages/Dashboard/analytics/apex';
import filters from 'data/chartFilters';

const getQueryByType = (queryType: string, datasetId: any, isMasterDataset: boolean, interval: string) => {
    const dateFormat = 'YYYY-MM-DDT00:00:00+05:30'

    switch (queryType) {
        case 'status': {
            return { ..._.get(chartMeta, 'druid_health_status.query') }
        };
        case 'last_synced_time': {
            const startDate = '2000-01-01';
            const endDate = dayjs().add(1, 'day').format(dateFormat);
            const body = druidQueries.last_synced_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, })
            return { ..._.get(chartMeta, 'last_synced_time.query'), body }
        };

        case 'total_events_processed': {
            const startDate = interval === 'today' ? dayjs().format(dateFormat) : dayjs().subtract(1, 'day').format(dateFormat);
            const endDate = interval === 'today' ? dayjs().add(1, 'day').format(dateFormat) : dayjs().format(dateFormat);
            const body = druidQueries.total_events_processed({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, })
            return { ..._.get(chartMeta, 'total_events_processed.query'), body }
        };

        case 'min_processing_time': {
            const startDate = interval === 'today' ? dayjs().format(dateFormat) : dayjs().subtract(1, 'day').format(dateFormat);
            const endDate = interval === 'today' ? dayjs().add(1, 'day').format(dateFormat) : dayjs().format(dateFormat);
            const body = druidQueries.druid_min_processing_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, });
            return { ..._.get(chartMeta, 'minProcessingTime.query'), body }
        };

        case 'average_processing_time': {
            const startDate = interval === 'today' ? dayjs().format(dateFormat) : dayjs().subtract(1, 'day').format(dateFormat);
            const endDate = interval === 'today' ? dayjs().add(1, 'day').format(dateFormat) : dayjs().format(dateFormat);
            const body = druidQueries.druid_avg_processing_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, });
            return { ..._.get(chartMeta, 'avgProcessingTime.query'), body }
        };

        case 'max_processing_time': {
            const startDate = interval === 'today' ? dayjs().format(dateFormat) : dayjs().subtract(1, 'day').format(dateFormat);
            const endDate = interval === 'today' ? dayjs().add(1, 'day').format(dateFormat) : dayjs().format(dateFormat);
            const body = druidQueries.druid_max_processing_time({ datasetId, intervals: `${startDate}/${endDate}`, master: isMasterDataset, });
            return { ..._.get(chartMeta, 'maxProcessingTime.query'), body }
        };

        case 'total_duplicate_batches': {
            const endDate = interval === 'today' ? dayjs().endOf('day').unix() : dayjs().endOf('day').subtract(1, 'day').unix();
            return { ..._.get(chartMeta, 'duplicate_batches_summary.query'), time: endDate, dataset: datasetId, }
        };

        case 'total_duplicate_events': {
            const endDate = interval === 'today' ? dayjs().endOf('day').unix() : dayjs().format(dateFormat);;
            return { ..._.get(chartMeta, 'duplicate_events_summary.query'), time: endDate, dataset: datasetId, }
        };

        case 'total_failed_events': {
            const endDate = interval === 'today' ? dayjs().endOf('day').unix() : dayjs().endOf('day').subtract(1, 'day').unix();
            const metadata = isMasterDataset ?
                _.cloneDeep({ ..._.get(chartMeta, 'failed_events_summary_master_datasets.query'), time: endDate, dataset: datasetId, }) :
                _.cloneDeep({ ..._.get(chartMeta, 'failed_events_summary.query'), time: endDate, dataset: datasetId, });
            return metadata;
        };

        case 'total_events_processed_apex_charts': {
            const metadata = isMasterDataset ?
                _.cloneDeep(_.get(chartMeta, 'totalEventsProcessedTimeSeriesPerMasterDataset')) :
                _.cloneDeep(_.get(chartMeta, 'totalEventsProcessedTimeSeriesPerDataset'));
            _.set(metadata, 'query.body.query.filter.fields[1].value', datasetId);
            return metadata;
        };

        case 'events_processing_time_apex_charts': {
            const metadata = isMasterDataset ?
                _.cloneDeep(_.get(chartMeta, 'minProcessingTimeSeriesPerMasterDataset')) :
                _.cloneDeep(_.get(chartMeta, 'minProcessingTimeSeriesPerDataset'));
            _.set(metadata, 'query.body.query.filter.fields[1].value', datasetId);
            return metadata;
        };

        default:
            throw new Error(`Unknown query type: ${queryType}`);
    }
};

const DatasetMetricsCard: React.FC<any> = (props: any) => {
    const params = useParams();
    const { datasetId, datasetType } = params;
    const [datasetDetails, setDatasetDetails] = useState({ data: null, status: "loading" });
    const { showAlert } = useAlert();
    const isMasterDataset = useMemo(() => _.get(datasetDetails, 'data.type') === DatasetType.MasterDataset, [datasetDetails]);
    const hasBatchConfig = useMemo(() => _.get(datasetDetails, ['data', 'extraction_config', 'is_batch_event',]), [datasetDetails]);
    const { label, icon, queryType, uuid, transformer, description, refresh, interval, isApexChart } = props;
    const query = getQueryByType(queryType, datasetId, isMasterDataset, interval);
    const [value, setValue] = useState<any>('');
    const [loading, setLoading] = useState(false);
    const change = '0%';
    const isPositive = change.startsWith('+');
    const symbol = isPositive ? (
        <ArrowUpward sx={{ fontSize: 'small', color: 'success.main' }} />
    ) : (
        <ArrowDownward sx={{ fontSize: 'small', color: 'error.main' }} />
    );

    const fetchMetric = async (query: any) => {
        try {
            setLoading(true);
            const response = await fetchMetricData(query, { uuid });
            const transformedLabel =
                (await (transformer && transformer(response))) || response;
            setValue(response);
            setLoading(false);
        } catch (error) {
            console.log('error occured', error);
        }
    };

    useEffect(() => {
        fetchMetric(query);
    }, [refresh?.api]);

    return (
        !isApexChart ?
            <Tooltip title={description}>
                <Box className={styles.cardContainer}>
                    <Card
                        elevation={0}
                        className={styles.card}
                    >
                        <CardContent
                            className={styles.cardContent}
                        >
                            <span>{icon}</span>
                            <Typography variant="bodyBold" className={styles.loadingText}>
                                {loading ? 'Loading...' : _.isArray(value) ? value[0] : value}
                            </Typography>

                            <Grid
                                container
                                className={styles.labelContainer}
                            >
                                <Typography variant="captionMedium" className={styles.label}>
                                    {label}
                                </Typography>

                                {/* <Typography
                color={isPositive ? 'success.main' : 'error.main'}
                className={styles.symbol}
              >
                {symbol} {_.trimStart(change, '+-')}
              </Typography> */}
                            </Grid>
                        </CardContent>
                    </Card>
                </Box>
            </Tooltip>
            :
            <ApexWithFilters title={label} filters={_.get(filters, 'variant1')} description={description}>
                <ApexChart metadata={getQueryByType(queryType, datasetId, isMasterDataset, interval)} interval={1140}></ApexChart>
            </ApexWithFilters>
    );
};

export default DatasetMetricsCard;
