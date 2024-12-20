import React from 'react';
import { Box, Button, Chip, Grid, Typography, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import MainCard from 'components/MainCard';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getAlertDetail } from 'services/alerts';
import RuleHeader from '../components/ViewRuleHeader';
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
import { useAlert } from 'contexts/AlertContextProvider';
import { styled } from '@mui/material/styles';
dayjs.extend(relativeTime);

const getChipVariant = (value: string) => {
    const keyToVariantMapping = {
        status: 'filled'
    }
    return _.get(keyToVariantMapping, value?.toLowerCase()) || 'combined';
}

const ViewRule = () => {
    const { id } = useParams();
    const [alertPayload, setAlertPayload] = useState<any>();
    const [data, setData] = useState<any>();
    const [loading, setLoading] = useState(false);
    const [runQuery, setRunQuery] = useState(false);
    const [configuration, setConfiguration] = useState<Record<string, any>>({});
    const { showAlert } = useAlert();

    const getAlertInfo = async () => {
        try {
            const alertRule = await getAlertDetail({ id });
            setConfiguration(getConfiguration(alertRule));
            setAlertPayload(alertRule);
        } catch {
            showAlert('Failed to fetch alerts', "error");
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
        variant="outlined"
        sx={{ marginRight: '0.5rem' }}
    />

    const renderCell = (row: any) => {
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
                                <Chip label={value} color="info" size="small" variant="outlined" />
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

    const renderHeader = () => {
        return (
            <Box sx={{ p: 2, pb: 0 }} textAlign="end">
                <Grid item xs={12}>
                    <RuleHeader alerts={alertPayload} refresh={getAlertInfo} configuration={configuration} setLoading={setLoading} />
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

    const StyledTableRow = styled(TableRow)(({ theme }) => ({
        '&:nth-of-type(odd)': {
            backgroundColor: theme.palette.action.hover,
        },
        // hide last border
        '&:last-child td, &:last-child th': {
            border: 0,
        },
    }));

    const handleClose = () => { setRunQuery(false) }

    const renderAlerts = () => {
        return (
            <Box>
                <Grid item xs={14} sm={7} lg={7}>
                    {renderHeader && renderHeader()}
                </Grid>
                <Grid justifyContent={'flex-start'} p={3}>
                    <Grid item xs={14} sm={7} lg={7}>
                        <TableContainer component={Paper} >
                            <Table size="small" aria-label="a dense table">
                            <TableHead>
                                <TableRow>
                                    <TableCell align="left" colSpan={2}>
                                        Configuration
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell align="left" width={'50%'} sx={{ borderRight: '1px solid #ddd !important' }}>Labels</TableCell>
                                    <TableCell align="left" width={'50%'} >Value</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                            {data && data.map( (record:any) => (
                                <StyledTableRow key={_.get(record,'key')} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{_.capitalize(_.get(record,'key'))}</TableCell>
                                    <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{renderCell(record)}</TableCell>
                                </StyledTableRow>
                            ))}
                                
                            </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
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