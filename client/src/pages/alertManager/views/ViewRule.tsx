import { Box, Button, Chip, Grid, Typography } from '@mui/material';
import MainCard from 'components/MainCard';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getAlertDetail } from 'services/alerts';
import RuleHeader from '../components/ViewRuleHeader';
import { useDispatch } from 'react-redux';
import { error } from 'services/toaster';
import ScrollX from 'components/ScrollX';
import TableWithCustomHeader from 'components/TableWithCustomHeader';
import { getKeyAlias } from 'services/keysAlias';
import { getStatusColor, timeStampFormat } from '../services/utils';
import { Stack } from '@mui/system';
import RunQuery from '../components/RunQuery';
import { PlayCircle } from '@mui/icons-material';
import QueryChart from '../components/QueryChartDialog';
import ViewNotification from '../components/viewNotificationInfo';
import { getConfiguration } from '../services/configuration';
import { renderSkeleton } from 'services/skeleton';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const getChipVariant = (value: string) => {
    const keyToVariantMapping = {
        status: 'filled'
    }
    return _.get(keyToVariantMapping, value?.toLowerCase()) || 'combined';
}

const ViewRule = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const [alertPayload, setAlertPayload] = useState<any>();
    const [data, setData] = useState<any>();
    const [loading, setLoading] = useState(false);
    const [runQuery, setRunQuery] = useState(false);
    const [configuration, setConfiguration] = useState<Record<string, any>>({});

    const getAlertInfo = async () => {
        try {
            const alertRule = await getAlertDetail({ id });
            setConfiguration(getConfiguration(alertRule));
            setAlertPayload(alertRule);
        } catch {
            dispatch(error({ message: 'Failed to fetch alerts' }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        getAlertInfo();
    }, [id]);

    const filterPayload = (alertPayload: Record<string, any>) => {
        return _.omit(alertPayload, ['manager', 'id', 'name', 'metadata', 'alertData', 'annotations', 'labels', 'context', 'notification', 'inhibitedBy', 'silenceState']);
    };

    const getData = (alertPayload: Record<string, any>) => {
        const filteredMetadata = filterPayload(alertPayload);
        const alertState = _.get(alertPayload, 'alertData.state');
        const alerts = _.filter(_.get(alertPayload, 'alertData.alerts') || [], ['state', 'Alerting']);
        const alertsCount = _.size(alerts);
        const metricAlias = _.get(alertPayload, "metadata.queryBuilderContext.metricAlias")
        const channels = _.compact(_.get(alertPayload, 'notification.channels')) || [];
        const silenceEndTime = _.get(alertPayload, 'silenceState.endTime');
        const input = {
            ...filteredMetadata,
            ...(alertState && { alert_state: alertState }),
            ...(alertsCount && { alerts_count: alertsCount }),
            ...(metricAlias && { expression: metricAlias }),
            ...((_.size(channels) > 0) && { notificationChannel: channels }),
            ...(silenceEndTime && { silenceEndTime: dayjs(silenceEndTime).fromNow() })
        };
        return _.map(_.entries(input), (payload) => {
            const [key, value] = payload;
            return { key, value };
        });
    };

    useEffect(() => {
        const result = getData(alertPayload);
        setData(result);
    }, [alertPayload]);

    const runQueryHandler = (flag = true) => {
        setRunQuery(flag)
    }

    const renderChip = ({ key, value }: any) => <Chip
        key={key}
        label={value}
        color="info"
        variant="combined"
        sx={{ marginRight: '0.5rem' }}
    />

    const renderCell = (context: Record<string, any>) => {
        const row = context?.cell?.row?.original || {};
        const key = row?.key;
        let value = row?.value;

        if (['createdAt', 'updatedAt'].includes(key)) {
            value = timeStampFormat(value);
        }
        switch (typeof value) {
            case 'object':
                switch (key) {
                    case 'notificationChannel': {
                        return <ViewNotification value={value} />
                    }
                    default: {
                        return (
                            <Box>
                                {_.entries(value).map(([key, value]: any) => renderChip({ key, value }))}
                            </Box>
                        );
                    }
                }

            default: {
                switch (key) {
                    case 'status':
                    case 'alert_state': {
                        return (
                            <Box>
                                <Chip
                                    label={value.toUpperCase()}
                                    color={getStatusColor(value)}
                                    size="small"
                                    variant={getChipVariant(key)}
                                />
                            </Box>
                        );
                    }
                    case 'frequency':
                    case 'interval':
                        return (
                            <Box>
                                <Chip label={value} color="info" size="small" variant="combined" />
                            </Box>
                        );
                    case 'expression':
                        return (
                            <Stack spacing={2} direction='row' alignItems='center'>
                                <Typography variant="h6">{value}</Typography>
                                <Button startIcon={<PlayCircle />} variant='contained' size='small' onClick={_ => runQueryHandler()}>Run Query</Button>
                            </Stack>
                        )
                    default:
                        return (
                            <Box>
                                <Typography variant="h6">{value}</Typography>
                            </Box>
                        );
                }
            }
        }
    };

    const columns = [
        {
            Header: 'Labels',
            accessor: 'key',
            disableFilters: true,
            style: {
                width: '20vw'
            },
            Cell: (value: any) => {
                const row = value?.cell?.row?.original || {};
                const rowValue = row?.key;
                return (
                    <Box>
                        <Typography variant='h6'>{_.capitalize(getKeyAlias(rowValue))}</Typography>
                    </Box>)
            }
        },
        {
            Header: 'Value',
            accessor: 'value',
            style: {
                width: 'auto'
            },
            disableFilters: true,
            Cell: renderCell
        }
    ];

    const renderHeader = () => {
        return (
            <Box sx={{ p: 2, pb: 0 }} textAlign="end">
                <Grid item xs={12}>
                    <RuleHeader alerts={alertPayload} refresh={getAlertInfo} configuration={configuration} />
                </Grid>
            </Box>
        );
    };

    const renderQueryChart = () => {
        return <Grid item xs={12}>
            <MainCard content={false} boxShadow><RunQuery random={Math.random()} handleClose={runQueryHandler} queryBuilderContext={_.get(alertPayload, "metadata.queryBuilderContext")} /></MainCard>
        </Grid>
    }

    const dialogContext = {
        title: _.get(alertPayload, "metadata.queryBuilderContext.metricAlias"),
        content: renderQueryChart()
    }

    const handleClose = () => { setRunQuery(false) }

    const renderAlerts = () => {
        return (
            <Box>
                <Grid>
                    <MainCard content={false} boxShadow>
                        <ScrollX>
                            <TableWithCustomHeader renderHeader={renderHeader} columns={columns} data={data || []} />
                        </ScrollX>
                    </MainCard>
                </Grid>
                <QueryChart open={runQuery} handleClose={handleClose} context={dialogContext}></QueryChart>
            </Box>
        );
    };

    return (
        <>
            <Grid>
                {loading ?
                    <Grid>
                        <MainCard content={false}>{renderSkeleton({ config: { type: 'table', loader: false, width: "100%" } })}</MainCard>
                    </Grid> :
                    renderAlerts()
                }
            </Grid>
        </>
    );
};

export default ViewRule;