import { MessageOutlined } from '@ant-design/icons';
import { Favorite, HeartBroken, Block, HourglassTop, ErrorOutline } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, Grid, List, ListItemButton, ListItemText, Stack, TextField, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import _ from 'lodash';
import { validateForm } from './queryBuilder';
import { searchAlert } from 'services/alerts';
import { fetchChannels } from 'services/notificationChannels';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AccordionSection from 'components/AccordionSection';
import { getConfigValue } from 'services/configData';

export const dialogBoxContext = (context: Record<string, any>) => ({
    title: `${context.action} ${context.title} ?`,
    content: `Are you sure you want to ${context.action} this ${context.title}?`,
    component: context?.component || <></>
});

export const silenceDialogBoxContext = (context: Record<string, any>) => ({
    title: 'Silence Alert',
    content: 'Please select the start and end time for the silence period.',
    component: context?.component || <></>
});

export const timeStampFormat = (timeStamp: string) => {
    return dayjs(timeStamp).format('DD MMMM YYYY h:mm A');
};

export const alertStatusColor = (status: string) => {
    const statusToColorMapping = {
        draft: 'warning',
        live: 'success'
    };

    return _.get(statusToColorMapping, status) || 'secondary';
};

export const alertHealthStatus = (alert: Record<string, any>) => {
    const state = _.get(alert, 'alertData.state');
    const status = _.get(alert, 'status');

    const stateConfig = {
        firing: {
            icon: <HeartBroken fontSize="small" />,
            color: 'error',
            label: "UNHEALTHY"
        },
        pending: {
            icon: <HourglassTop fontSize="small" />,
            color: 'warning',
            label: _.toUpper(state)
        },
        inactive: {
            icon: <Favorite fontSize="small" />,
            color: 'success',
            label: 'HEALTHY'
        }
    };

    const props = _.get(stateConfig, state) || { icon: <ErrorOutline fontSize="small" />, label: 'ERROR', color: 'error' };

    const renderStatusChip = () => {
        return <Chip size="small" {...props} />;
    };

    return (
        <Grid justifyContent="center">
            {status == 'live' ? (
                renderStatusChip()
            ) : (
                <Chip size="small" icon={<Block fontSize="small" />} color="default" label="INACTIVE" />
            )}
        </Grid>
    );
};

export const statusAccumulator = (result: any, alert: any) => {
    const { status } = alert;
    const existing = result[status] || { count: 0, color: 'primary', onClick: () => { } };
    result[status] = {
        ...existing,
        count: existing.count + 1
    };
    return result;
};

export const getTagStatus = (payload: Record<string, any>, accumulator: any) => {
    return _.reduce(payload, accumulator, {});
};

export const transform = (value: Record<string, any>, key: string) => {
    return {
        label: `${value.count} ${key}`,
        ...value
    };
};

export const getStatus = (payload: Record<string, any>) => {
    return _.reduce(
        payload,
        (result: any, value) => {
            const { status } = value;
            result[status] = result[status] || [];
            result[status].push(value);
            return result;
        },
        {}
    );
};

export const getSilenced = (payload: Record<string, any>) => {
    return _.reduce(
        payload,
        (result: any, value) => {
            const state = _.get(value, 'silenceState.state');
            if (state === 'muted') {
                result[state] = result[state] || [];
                result[state].push(value);
                return result;
            } else {
                return result;
            }
        },
        {}
    );
};

export const renderStatusChip = (payload: Record<string, any>) => {
    const { size = 'small', variant = 'filled', sx = { padding: '0.5rem' }, label = '', onClick = () => { }, color = 'primary' } = payload;
    return (
        <>
            <Chip key={Math.random()} size={size} sx={sx} variant={variant} label={label} color={color} onClick={(_) => onClick()} />
        </>
    );
};

export const getSilenceComponent = (props: any) => {
    return () => {
        const { silenceData, setAlertStatus, fetchDataHandler, toggleFilter, removeFilter } = props;
        return _.map(silenceData, (value, state) => (
            <Chip
                key={state}
                size="small"
                sx={{ padding: '0.5rem' }}
                variant="filled"
                label={`${value.length} ${state.toUpperCase()}`}
                color={'error'}
                onClick={async () => {
                    if (fetchDataHandler) {
                        await fetchDataHandler({ silenceState: { state } });
                        toggleFilter(true);
                        setAlertStatus && setAlertStatus(false)
                    }
                }}
                onDelete={removeFilter}
            />
        ));
    };
};

export const getStatusComponent = (props: any) => {
    return () => {
        const { statusData, setSilenceStatus, fetchDataHandler, toggleFilter, removeFilter } = props;
        return _.map(statusData, (value, status) => (
            <Chip
                key={status}
                size="small"
                sx={{ padding: '0.5rem' }}
                variant="filled"
                label={`${value.length} ${status.toUpperCase()}`}
                color={alertStatusColor(status)}
                onClick={async () => {
                    if (fetchDataHandler) {
                        await fetchDataHandler({ status });
                        toggleFilter(true);
                        setSilenceStatus && setSilenceStatus(false);
                    }
                }}
                onDelete={removeFilter}
            />
        ));
    };
};

export const renderSections = (context: Record<string, any>) => {
    const { testChannel = true } = context;
    return (
        <Card sx={{ minWidth: 275, padding: 0 }}>
            <CardContent>
                <Grid sx={{ padding: '1rem' }} container justifyContent="flex-start" alignItems="center">
                    <Grid item sm={12}>
                        <AccordionSection sections={context.sections}></AccordionSection>
                    </Grid>
                    <Grid item xs={12}>
                        <Stack direction="row" spacing={2}>
                            {context.actionHandler && context.actionLabel &&
                                <Button variant="contained" disabled={!validateForm(_.get(context.formData, 'error')) || !testChannel} onClick={(_) => context.actionHandler()}>
                                    {context.actionLabel}
                                </Button>
                            }
                            {context.notificationTestHandler && (
                                <Button
                                    variant="contained"
                                    disabled={!validateForm(_.get(context.formData, 'error'))}
                                    onClick={(_) => context.notificationTestHandler()}
                                    startIcon={<MessageOutlined />}
                                >
                                    {context.notificationTestLabel}
                                </Button>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export const transformRulePayload = (formData: Record<string, any>) => {
    const {
        name,
        description,
        category,
        frequency,
        interval,
        labels,
        queryBuilderContext,
        notification = {},
        config = {},
        context,
        severity
    } = formData;
    const { threshold, threshold_from, threshold_to, operator } = queryBuilderContext
    const updatedThreshold = !_.includes(["within_range", "outside_range"], operator) ? [threshold] : [threshold_from, threshold_to]
    const rulePayload = {
        name,
        manager: getConfigValue("ALERT_MANAGER"),
        description,
        category,
        frequency: `${frequency}m`,
        interval: `${interval}m`,
        severity,
        labels: {
            ...labels,
            component: "obsrv",
            type: category
        },
        metadata: {
            queryBuilderContext: { ...queryBuilderContext, threshold: updatedThreshold }
        },
        context: {
            ...context
        },
        notification
    };
    return rulePayload;
};

export const getStatusColor = (value: string) => {
    const valueToColorMapping = {
        draft: 'warning',
        retired: 'secondary',
        firing: 'error',
        pending: 'warning'
    };
    return _.get(valueToColorMapping, value?.toLowerCase()) || 'success';
};

export const asyncValidation = () => {
    const cache = new Map();

    const fetchData = _.debounce(async (payload: Record<string, any>, fetchFunction: any) => {
        const key = JSON.stringify(payload);
        let data = cache.get(key);
        if (!data) {
            try {
                data = await fetchFunction(payload);
                cache.set(key, data);
            } catch (error) {
                console.log(error);
            }
        }
        return data;
    }, 500);

    return {
        checkUniqueRule: (alertname: string) => async (value: any) => {
            if (alertname === value) return true
            const alertPayload = { config: { request: { filters: { name: value } } } };
            const alerts = await fetchData(alertPayload, searchAlert);
            return alerts?.count === 0;
        },
        checkUniqueChannel: (channelName: string) => async (value: any) => {
            if (channelName === value) return true
            const channelPayload = { data: { request: { filters: { name: value } } } };
            const channels = await fetchData(channelPayload, fetchChannels);
            return _.size(_.get(channels, 'result.notifications')) === 0
        }
    };
};

export const SilenceDialog = (props: any) => {
    const { customSilence, alertId, endDate, handleEndDateChange, addSilenceHandler, toggleCustomSilence } = props;

    const silenceMenuOptions = [
        {
            primary: 'For 1 hour',
            onClick: () => {
                const result = addSilenceHandler(alertId, dayjs.utc(), dayjs.utc().add(1, 'hour'));
                result();
            }
        },
        {
            primary: 'For 2 hours',
            onClick: () => {
                const result = addSilenceHandler(alertId, dayjs.utc(), dayjs.utc().add(2, 'hour'));
                result();
            }
        },
        {
            primary: 'For 8 hours',
            onClick: () => {
                const result = addSilenceHandler(alertId, dayjs.utc(), dayjs.utc().add(8, 'hour'));
                result();
            }
        },
        {
            primary: 'For 1 day',
            onClick: () => {
                const result = addSilenceHandler(alertId, dayjs.utc(), dayjs.utc().add(1, 'day'));
                result();
            }
        },
        {
            primary: 'Silence Alert Until...',
            onClick: () => toggleCustomSilence(alertId)
        }
    ];
    return (
        <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
            <List>
                {_.map(silenceMenuOptions, (option: any) => {
                    return (
                        <ListItemButton alignItems="flex-start" key={option.primary} onClick={option.onClick}>
                            <ListItemText primary={option.primary} />
                        </ListItemButton>
                    );
                })}
            </List>
            {customSilence && <DateRangePickers endDate={endDate} handleEndDateChange={handleEndDateChange} alertId={alertId} />}
        </Box>
    );
};

export const DateRangePickers = (props: any) => {
    const { endDate, handleEndDateChange, alertId } = props;
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid direction="row" container spacing={4} sx={{ paddingTop: '1.5rem' }} alignItems="center" justifyContent="center">
                <Grid item>
                    <DatePicker label="End Date" date={endDate} setDate={handleEndDateChange} alertId={alertId} />
                </Grid>
            </Grid>
        </LocalizationProvider>
    );
};

const DatePicker = (props: any) => {
    const { date, setDate, label, alertId } = props;

    return (
        <DateTimePicker
            label={label}
            value={date}
            onChange={(newValue) => {
                setDate(newValue, alertId);
            }}
            renderInput={(params) => <TextField {...params} />}
        />
    );
};