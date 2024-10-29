import React from 'react';
import _ from 'lodash';
import { Alert, Box, Chip, Grid, Stack, Tooltip, Typography } from '@mui/material';
import { EyeOutlined, PlayCircleOutlined, DeleteFilled, EditOutlined } from '@ant-design/icons';
import IconButton from '@mui/material/IconButton';
import { useMemo, useState } from 'react';
import MainCard from 'components/MainCard';
import ScrollX from 'components/ScrollX';
import AlertDialog from 'components/AlertDialog/AlertDialog';
import { addSilence, deleteAlert, deleteSilence, publishAlert } from 'services/alerts';
import {
    alertHealthStatus,
    alertStatusColor,
    timeStampFormat,
    dialogBoxContext,
    SilenceDialog
} from '../services/utils';
import { useNavigate } from 'react-router';
import TableWithCustomHeader from 'components/TableWithCustomHeader';
import AlertTableHeader from './tableHeader';
import { NotificationsActiveOutlined, NotificationsOff } from '@mui/icons-material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Loader from 'components/Loader';
import { useAlert } from 'contexts/AlertContextProvider';

dayjs.extend(utc);
const ListAlerts = (props: any) => {
    const { alerts, fetchAlerts, configuration } = props;
    const navigate = useNavigate();
    const [dialogContext, setDialogContext] = useState<any>(null);
    const [endDate, setEndDate] = useState<Date>(dayjs.utc().add(1, 'day').toDate());
    const [loading, setLoading] = useState(false);
    const [customSilence, setCustomSilence] = useState<boolean>(false);
    const { showAlert } = useAlert();

    const handleEndDateChange = (date: Date, id: string) => {
        setDialogContext(silenceOptionsDialogContext(id, date, true));
        setEndDate(date);
    };

    const toggleCustomSilence = (id: string) => {
        setCustomSilence((prevValue) => {
            setDialogContext(silenceOptionsDialogContext(id, endDate, true));
            return true;
        });
    };

    const retireAlertHandler = (id: string) => async () => {
        setLoading(true);
        try {
            const response = await deleteAlert({ id });
            if (response) {
                fetchAlerts();
                showAlert('Alert Rule retired successfully', 'success');
            }
        } catch {
            showAlert('Failed to retire alert rule', 'error');
        } finally {
            setLoading(false);
            setDialogContext(null);
        }
    };

    const publishAlertHandler = (id: string) => async () => {
        setLoading(true);
        try {
            await publishAlert({ id }).then((res) => {
                fetchAlerts();
            });
            showAlert('Alert Rule published successfully', 'success');
        } catch {
            showAlert('Failed to publish alert rule', 'error');
        } finally {
            setDialogContext(null);
            setLoading(false)
        }
    };

    const handleClickRetire = (id: string) => {
        setDialogContext(retireDialogContext(id));
    };

    const handleClickPublish = (id: string) => {
        setDialogContext(publishDialogContext(id));
    };

    const handleAddSilence = (id: string) => {
        setDialogContext(silenceOptionsDialogContext(id, endDate, customSilence));
    };

    const handleDeleteSilence = (silenceId: string) => {
        setDialogContext(deleteSilenceDialogContext(silenceId));
    };

    const addSilenceHandler = (id: string, startDate: any, endDate: any) => async () => {
        setLoading(true)
        try {
            const payload = {
                startDate: dayjs.utc(startDate).format(),
                endDate: dayjs.utc(endDate).format(),
                alertId: id,
                manager: "grafana"
            };
            await addSilence(payload);
            fetchAlerts();
            showAlert('Alert has been muted successfully', 'success');
        } catch {
            showAlert('Failed to mute alert', 'error');
        } finally {
            setCustomSilence(false)
            setDialogContext(null);
            setLoading(false)
        }
    };

    const removeSilenceHandler = (silenceId: string) => async () => {
        setLoading(true)
        try {
            await deleteSilence(silenceId);
            fetchAlerts();
            showAlert('Alert is now unmuted', 'success');
        } catch {
            showAlert('Failed to unmute alert', 'error');
        } finally {
            setCustomSilence(false)
            setLoading(false)
            setDialogContext(null)
        }
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

    const renderNameCell = (context: Record<string, any>) => {
        const row = context?.cell?.row?.original || {};
        const { category, severity, status } = row;
        const infoField = [
            { name: 'category', label: category.toUpperCase(), tooltip: 'Alert Category', color: 'primary' },
            { name: 'severity', label: severity.toUpperCase(), tooltip: 'Severity of Alert', color: 'info' }
        ];

        return (
            <>
                <Box minWidth={'13.5rem'}>
                    {
                        <Box display="flex" alignItems="center">
                            <Typography align="left" variant='subtitle1'>{_.get(row, 'name')}</Typography>
                        </Box>
                    }
                </Box>
                <Box minWidth={'13.5rem'}>
                    {
                        <Box display="flex" alignItems="center" marginTop="0.5rem">
                            {_.map(infoField, (info: any) => {
                                return (
                                    <Grid key={Math.random()} marginRight="0.5rem">
                                        <Tooltip title={info.tooltip}>
                                            <Chip label={info.label} color={info.color} size="small" variant="filled" />
                                        </Tooltip>
                                    </Grid>
                                );
                            })}
                        </Box>
                    }
                </Box>
            </>
        );
    };

    const renderDialog = () => {
        if (!dialogContext) return null;
        return <AlertDialog {...{ ...dialogContext, open: true }} />;
    };

    const renderActionCell = (context: Record<string, any>) => {
        const row = context?.cell?.row?.original || {};
        const { id } = row;

        const getButtonDisabled = (name: string) => {
            if (name === 'publish') return row?.status === 'live';
            if (name === 'retire') return row?.status === 'retired';
            if (name === 'silence') return row?.status !== 'live';
            return false;
        };


        const silence = _.get(row, 'silenceState');
        const isSilenced: boolean = silence?.state === 'muted';
        const silenceId: string = silence?.silenceId;

        const actions = [
            {
                id: 'silence-button',
                name: 'silence',
                label: isSilenced ? 'Unsilence' : 'Silence',
                color: 'primary',
                onclick: () => {
                    if (!isSilenced) {
                        handleAddSilence(id);
                    } else {
                        handleDeleteSilence(silenceId);
                    }
                },
                icon: isSilenced ? <NotificationsOff /> : <NotificationsActiveOutlined />
            },
            {
                name: 'publish',
                label: 'Publish',
                color: 'primary',
                onclick: () => handleClickPublish(id),
                icon: <PlayCircleOutlined />
            },
            {
                name: 'view',
                label: 'View',
                color: 'primary',
                onclick: (_: any) => navigate(`/home/alertRules/view/${id}`),
                icon: <EyeOutlined />
            },
            {
                name: 'edit',
                label: 'Edit',
                color: 'primary',
                onclick: (_: any) => navigate(`/home/alertRules/edit/${id}`),
                icon: <EditOutlined />
            },
            {
                name: 'retire',
                label: 'Retire',
                color: 'error',
                onclick: () => handleClickRetire(id),
                icon: <DeleteFilled />
            }
        ];

        return (
            <Grid>
                <Stack direction="row" spacing={1}>
                    {_.map(actions, (option: any) => {
                        if (!configuration?.allowedActions?.includes(option?.name)) return null;
                        return (
                            <Grid key={'action-' + Math.random()}>
                                <Tooltip title={option.name}>
                                    <IconButton
                                        id={option.id}
                                        onClick={option.onclick}
                                        color={option.color}
                                        size="large"
                                        disabled={getButtonDisabled(option?.name)}
                                    >
                                        {option.icon}
                                    </IconButton>
                                </Tooltip>
                            </Grid>
                        );
                    })}
                </Stack>
            </Grid>
        );
    };

    const data = alerts;
    const columns = [
        {
            Header: 'Health',
            accessor: 'state',
            disableFilters: true,
            Cell: (value: any) => {
                const row = value?.cell?.row?.original || {};
                return (
                    <Box>
                        <Grid>{alertHealthStatus(row)}</Grid>
                    </Box>
                );
            }
        },
        {
            Header: 'Name',
            accessor: 'name',
            disableFilters: true,
            Cell: renderNameCell
        },
        {
            Header: 'Status',
            accessor: 'status',
            disableFilters: true,
            Cell: (value: any) => {
                const row = value?.cell?.row?.original || {};
                const { status } = row;
                return (
                    <Box minWidth={'7.5rem'}>
                        <Chip size="small" variant="filled" color={alertStatusColor(status)} label={status.toUpperCase()} />
                    </Box>
                );
            }
        },
        {
            Header: 'Time Stamp',
            accessor: 'updatedAt',
            disableFilters: true,
            Cell: (value: any) => {
                const row = value?.cell?.row?.original || {};
                const updatedOn = dayjs(row?.updatedAt).fromNow();
                return <Tooltip title={timeStampFormat(row?.updatedAt)} placement='bottom-start' >
                    <Box minWidth={"10rem"}>{updatedOn}</Box>
                </Tooltip>
            }
        },
        {
            Header: 'Actions',
            accessor: 'actions',
            disableFilters: true,
            Cell: renderActionCell
        }
    ];

    const renderHeader = (payload: Record<string, any>) => {
        return (
            <Box sx={{ p: 2, pb: 0 }} textAlign="end">
                <Grid item xs={12}>
                    <AlertTableHeader fetchAlerts={fetchAlerts} configuration={configuration} payload={payload} alerts={data} />
                </Grid>
            </Box>
        );
    };

    const renderAlertList = () => {
        return <>
            <ScrollX>
                <TableWithCustomHeader renderHeader={renderHeader} columns={columns} data={data} />
            </ScrollX>
            {renderDialog()}
            {!_.size(alerts) && <Alert severity='error'><Typography variant='body1'>{_.get(configuration, "alerts_warning_message")}</Typography></Alert>}
        </>
    }

    return (
        <Grid>
            <MainCard content={false} boxShadow>
                {loading ? <Loader loading={true} /> : renderAlertList()}
            </MainCard>
        </Grid>
    );
};

export default ListAlerts;

