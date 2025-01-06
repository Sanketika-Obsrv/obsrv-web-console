import React from 'react';
import { Box, Button, Card, CardContent, Chip, Grid, List, ListItemButton, ListItemText, Stack, TextField } from '@mui/material';
import _ from 'lodash';
import AccordionSection from 'components/Accordian/AccordionSection';
import { Block, ErrorOutline, Favorite, HeartBroken, HourglassTop } from '@mui/icons-material';
import dayjs from 'dayjs';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { searchAlert } from 'services/alerts';
import { fetchChannels } from 'services/notificationChannels';
import { getMetricsGroupedByComponents } from './queryBuilder';

export const validateForm = (config: Record<string, any>) => {
    if (!config) return false;
    return _.every(_.values(config), (value) => value === true);
};

export const renderSections = (context: Record<string, any>) => {
    const { testChannel = true } = context;
    return (
        <Card sx={{ minWidth: 275, padding: 0 }}>
            <CardContent sx={{ background: '#f9f9f9' }}>
                <Grid
                    sx={{ padding: '1rem' }}
                    container
                    justifyContent="flex-start"
                    alignItems="center"
                >
                    <Grid item sm={12}>
                        <AccordionSection sections={context.sections}></AccordionSection>
                    </Grid>
                    <Grid item xs={12}>
                        <Stack direction="row" spacing={2}>
                            {context.actionHandler && context.actionLabel && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        '&:hover': {
                                            backgroundColor: 'primary.main',
                                            color: 'white',
                                            borderColor: 'primary.main',
                                        },
                                    }}
                                    disabled={
                                        !validateForm(_.get(context.formData, 'error')) ||
                                        !testChannel
                                    }
                                    onClick={(_) => context.actionHandler()}
                                >
                                    {context.actionLabel}
                                </Button>
                            )}
                            {context.notificationTestHandler && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        '&:hover': {
                                            backgroundColor: 'primary.main',
                                            color: 'white',
                                            borderColor: 'primary.main',
                                        },
                                    }}
                                    disabled={!validateForm(_.get(context.formData, 'error'))}
                                    onClick={(_) => context.notificationTestHandler()}
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

export const timeStampFormat = (timeStamp: string) => {
    return dayjs(timeStamp).format('DD MMMM YYYY h:mm A');
};

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
            onChange={(newValue: any) => {
                setDate(newValue, alertId);
            }}
            slotProps={{
                textField: {
                    fullWidth: true
                }
            }}
        />
    );
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

export const getStatusComponent = (props: any) => {
    return () => {
        const { statusData, setSilenceStatus, fetchDataHandler, toggleFilter, removeFilter } = props;
        return _.map(statusData, (value: any, status: any) => (
            <Chip
                key={status}
                size="small"
                sx={{ padding: '0.5rem' }}
                variant="outlined"
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

export const getSilenceComponent = (props: any) => {
    return () => {
        const { silenceData, setAlertStatus, fetchDataHandler, toggleFilter, removeFilter } = props;
        return _.map(silenceData, (value: any, state: any) => (
            <Chip
                key={state}
                size="small"
                sx={{ padding: '0.5rem' }}
                variant="outlined"
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

export const getStatusColor = (value: string) => {
    const valueToColorMapping = {
        draft: 'warning',
        retired: 'secondary',
        firing: 'error',
        pending: 'warning'
    };
    return _.get(valueToColorMapping, value?.toLowerCase()) || 'success';
};

export const transformRulePayload = async (formData: Record<string, any>) => {
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
    const { threshold, threshold_from, threshold_to, operator, metric } = queryBuilderContext
    const components = await getMetricsGroupedByComponents();
    const selectedComponent = _.get(components, category)
    const metricValue = _.filter(selectedComponent, field => _.get(field, "id") == metric)
    const updatedThreshold = !_.includes(["within_range", "outside_range"], operator) ? [threshold] : [threshold_from, threshold_to]
    const rulePayload = {
        name,
        manager: "grafana",
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
            queryBuilderContext: { ...queryBuilderContext, threshold: updatedThreshold, metric: _.get(metricValue, [0, "metric"]), id: metric }
        },
        context: {
            ...context
        },
        notification
    };
    return rulePayload;
};
