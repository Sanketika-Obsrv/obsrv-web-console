import _, { set } from 'lodash';
import { DeleteOutlined, EditOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Box, Button, Grid, Stack, Tooltip, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { addSilence, deleteAlert, deleteSilence, publishAlert } from 'services/alerts';
import { useMemo, useState } from 'react';
import AlertDialog from 'components/AlertDialog';
import { alertHealthStatus, dialogBoxContext, SilenceDialog } from '../services/utils';
import { useDispatch } from 'react-redux';
import { error, success } from 'services/toaster';
import { NotificationsActiveOutlined, NotificationsOff, RefreshOutlined } from '@mui/icons-material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Loader from 'components/Loader';
import { getConfigValue } from 'services/configData';

dayjs.extend(utc);
const RuleHeader = (props: any) => {
    const { alerts, refresh, configuration } = props;
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [dialogContext, setDialogContext] = useState<any>(null);
    const [endDate, setEndDate] = useState<Date>(dayjs.utc().add(1, 'day').toDate());
    const pathToNavigate = _.toLower(_.get(alerts, 'context.alertType'));
    const [loading, setLoading] = useState(false);
    const [customSilence, setCustomSilence] = useState<boolean>(false);

    const silence = _.get(alerts, 'silenceState');
    const isSilenced = silence?.state === 'unmuted';

    const handleEndDateChange = (date: Date) => {
        setDialogContext(silenceOptionsDialogContext(alerts?.id, date, true));
        setEndDate(date);
    };

    const toggleCustomSilence = () => {
        setCustomSilence((prevValue) => {
            setDialogContext(silenceOptionsDialogContext(alerts?.id, endDate, true));
            return true;
        });
    };

    const retireAlertHandler = (id: string) => async () => {
        setLoading(true);
        try {
            const res = await deleteAlert({ id });
            if (res) {
                navigate(`/alertRules/${pathToNavigate}`);
                dispatch(success({ message: 'Alert Rule retired successfully' }));
            }
        } catch {
            dispatch(error({ message: 'Failed to retire alert rule' }));
        } finally {
            setLoading(false);
        }
    };

    const publishAlertHandler = (id: string) => async () => {
        setLoading(true);
        try {
            await publishAlert({ id }).then((res) => navigate(`/alertRules/${pathToNavigate}`));
            dispatch(success({ message: 'Alert Rule published successfully' }));
        } catch {
            dispatch(error({ message: 'Failed to publish alert rule' }));
        } finally {
            setLoading(false)
        }
    };

    const addSilenceHandler = (id: string, startDate: any, endDate: any) => async () => {
        setLoading(true);
        try {
            const payload = {
                startDate: dayjs.utc(startDate).format(),
                endDate: dayjs.utc(endDate).format(),
                alertId: id,
                manager: getConfigValue("ALERT_MANAGER")
            };
            await addSilence(payload);
            refresh();
            dispatch(success({ message: 'Alert has been muted successfully' }));
        } catch {
            dispatch(error({ message: 'Failed to mute alert' }));
        } finally {
            setCustomSilence(false)
            setLoading(false)
            setDialogContext(null)
        }
    };

    const removeSilenceHandler = (silenceId: string) => async () => {
        setLoading(true);
        try {
            await deleteSilence(silenceId);
            refresh();
            dispatch(success({ message: 'Alert is now unmuted' }));
        } catch {
            dispatch(error({ message: 'Failed to unmute alert' }));
        } finally {
            setCustomSilence(false)
            setLoading(false)
            setDialogContext(null)
        }
    };

    const handleRetire = (id: string) => {
        setDialogContext(retireDialogContext(id));
    };

    const handlePublish = (id: string) => {
        setDialogContext(publishDialogContext(id));
    };

    const handleAddSilence = (id: string, endDate: any) => {
        setDialogContext(silenceOptionsDialogContext(id, endDate, customSilence));
    };

    const handleDeleteSilence = (silenceId: string) => {
        setDialogContext(deleteSilenceDialogContext(silenceId));
    };

    const silenceOptionsDialogContext = (id: string, endDate: any, customSilence: boolean) => ({
        action: addSilenceHandler(id, dayjs.utc().toDate(), endDate),
        handleClose: () => {
            setDialogContext(null);
        },
        context: {
            show: customSilence,
            title: 'Silence Alert for:',
            component: (
                <SilenceDialog
                    alertId={id}
                    customSilence={customSilence}
                    endDate={endDate}
                    handleEndDateChange={handleEndDateChange}
                    addSilenceHandler={addSilenceHandler}
                    toggleCustomSilence={toggleCustomSilence}
                />
            )
        }
    });

    const deleteSilenceDialogContext = (silenceId: string) => ({
        action: removeSilenceHandler(silenceId),
        handleClose: () => {
            setDialogContext(null);
        },
        context: dialogBoxContext({ action: 'unmute', title: 'alert' })
    });

    const publishDialogContext = (id: string) => ({
        action: publishAlertHandler(id),
        handleClose: () => {
            setDialogContext(null);
        },
        context: dialogBoxContext({ action: 'Publish', title: 'rule' })
    });

    const retireDialogContext = (id: string) => ({
        action: retireAlertHandler(id),
        handleClose: () => {
            setDialogContext(null);
        },
        context: dialogBoxContext({ action: 'Retire', title: 'rule' })
    });

    const refreshData = async () => {
        setLoading(true)
        await refresh()
        setLoading(false)
    }

    const action = useMemo(
        () => [
            {
                name: 'back',
                label: 'Back',
                variant: 'outlined',
                color: 'primary',
                onClick: () => navigate(`/alertRules/${pathToNavigate}`)
            },
            {
                id: 'silence-button',
                name: 'silence',
                label: isSilenced ? 'Mute' : 'Unmute',
                variant: 'outlined',
                color: 'primary',
                icon: isSilenced ? <NotificationsOff /> : <NotificationsActiveOutlined />,
                onClick: () => (isSilenced ? handleAddSilence(alerts?.id, endDate) : handleDeleteSilence(silence?.silenceId))
            },
            {
                name: 'edit',
                label: 'Edit',
                variant: 'contained',
                color: 'primary',
                icon: <EditOutlined />,
                onClick: () => navigate(`/alertRules/edit/${alerts?.id}`)
            },
            {
                name: 'publish',
                label: 'Publish',
                color: 'success',
                variant: 'contained',
                icon: <PlayCircleOutlined />,
                onClick: () => handlePublish(alerts?.id)
            },
            {
                name: 'retire',
                label: 'Retire',
                variant: 'contained',
                color: 'error',
                icon: <DeleteOutlined />,
                onClick: () => handleRetire(alerts?.id)
            },
            {
                name: 'refresh',
                label: 'Refresh',
                color: 'info',
                variant: 'contained',
                icon: <RefreshOutlined />,
                onClick: () => refreshData()
            }
        ],
        [isSilenced]
    );

    const getButtonDisabled = (name: any) => {
        if (name === 'publish') return alerts?.status === 'live';
        if (name === 'retire') return alerts?.status === 'retired';
        if (name === 'silence') return alerts?.status !== 'live';
        return false;
    };

    const alertStateChips = () => {
        return (
            <Box>
                <Grid>{alertHealthStatus(alerts)}</Grid>
            </Box>
        );
    };

    const renderRuleName = () => {
        const ruleName = _.get(alerts, 'name');
        return (
            <Stack display="flex" direction="row" alignItems="center">
                <Tooltip title={ruleName}>
                    <Typography variant="h5" padding={1} mr={1} textOverflow="ellipsis" maxWidth="65%" noWrap={true}>
                        {ruleName || 'Loading...'}
                    </Typography>
                </Tooltip>
                <Grid>{alertStateChips()}</Grid>
            </Stack>
        );
    };

    const renderButtons = () => {
        return (
            <Grid>
                <Stack direction="row" spacing={1}>
                    {action.map((button: any) => {
                        if (!configuration?.allowedActions?.includes(button.name)) return null;
                        return (
                            <Button
                                id={button.id}
                                key={button.name}
                                variant={button.variant}
                                startIcon={button.icon}
                                onClick={button.onClick}
                                color={button.color}
                                disabled={getButtonDisabled(button?.name)}
                            >
                                {button.label}
                            </Button>
                        );
                    })}
                </Stack>
                {renderDialog()}
            </Grid>
        );
    };

    const renderDialog = () => {
        if (!dialogContext) return null;
        return <AlertDialog {...{ ...dialogContext, open: true }} />;
    };

    return (
        <Box alignItems="center" bgcolor="white">
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Grid>{renderRuleName()}</Grid>
                <Grid>{renderButtons()}</Grid>
            </Stack>
            {loading && <Loader />}
        </Box>
    );
};

export default RuleHeader;
