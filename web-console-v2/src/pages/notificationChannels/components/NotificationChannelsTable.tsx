import React from 'react';
import { useMemo, useState } from 'react';
import { Alert, Grid, Stack, Tooltip, Typography } from '@mui/material';
import MainCard from 'components/MainCard';
import ScrollX from 'components/ScrollX';
import { IconButton } from '@mui/material';
import { PlayCircleOutlined, EyeOutlined, EditOutlined, DeleteFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';
import * as _ from 'lodash';
import { Box } from '@mui/system';
import TableWithCustomHeader from 'components/TableWithCustomHeader';
import { Chip } from '@mui/material';
import { publishChannel, retireChannel } from 'services/notificationChannels';
import NotificationChannelsHeader from './NotificationChannelsHeader';
import { alertStatusColor, dialogBoxContext } from 'pages/alertManager/services/utils';
import AlertDialog from 'components/AlertDialog';
import { renderSkeleton } from 'services/skeleton';
import { useAlert } from 'contexts/AlertContextProvider';

const actions = [
    {
        label: "View",
        color: "primary",
        size: "small",
        isDisabled: (context: Record<string, any>) => false,
        icon: <EyeOutlined />,
        onClick: (context: Record<string, any>) => {
            const { payload, navigate } = context;
            const { id } = payload;
            navigate(`/alertChannels/view/${id}`);
        }
    },
    {
        label: "Publish",
        color: "primary",
        size: "small",
        icon: <PlayCircleOutlined />,
        isDisabled: (context: Record<string, any>) => {
            const { payload } = context;
            const { status } = payload;
            if (_.toLower(status) === "live") return true;
            return false;
        },
        onClick: (context: Record<string, any>) => {
            const { payload, showAlert, getAllChannels, setDialogContext, setLoading } = context;
            const { id } = payload;

            const publish = async () => {
                setLoading(true)
                try {
                    await publishChannel({ id });
                    showAlert("Channel published successfully", "success")
                    getAllChannels();
                } catch (err) {
                    showAlert("Failed to publish channel", "error")
                } finally {
                    setLoading(false)
                }
            }

            setDialogContext({
                action: publish,
                handleClose: () => {
                    setDialogContext(null)
                },
                context: dialogBoxContext({ action: "Publish", title: "channel" })
            })
        }
    },
    {
        label: "Edit",
        color: "primary",
        size: "small",
        isDisabled: (context: Record<string, any>) => false,
        icon: <EditOutlined />,
        onClick: (context: Record<string, any>) => {
            const { payload, navigate } = context;
            const { id } = payload;
            navigate(`/alertChannels/edit/${id}`);
        }
    },
    {
        label: "Retire",
        color: "error",
        size: "small",
        isDisabled: (context: Record<string, any>) => {
            const { payload } = context;
            const { status } = payload;
            if (_.toLower(status) === "retired") return true;
            return false;
        },
        icon: <DeleteFilled />,
        onClick: async (context: Record<string, any>) => {
            const { payload, showAlert, getAllChannels, setDialogContext, setLoading } = context;
            const { id } = payload;
            const retire = async () => {
                setLoading(true)
                try {
                    await retireChannel({ id });
                    showAlert("Channel retired successfully", "success")
                    getAllChannels();
                } catch (err) {
                    showAlert("Failed to retire channel", "error")
                } finally {
                    setLoading(false)
                }
            }
            setDialogContext({
                action: retire,
                handleClose: () => {
                    setDialogContext(null)
                },
                context: dialogBoxContext({ action: "Retire", title: "channel" })
            })
        }
    }
]

const NotificationChannelsTable = (props: any) => {
    const { channels, getAllChannels } = props;
    const [refreshData, setRefreshData] = useState<string>('false');
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const [dialogContext, setDialogContext] = useState<any>(null);

    // eslint-disable-next-line
    const renderAction = (payload: Record<string, any>) => (action: Record<string, any>) => {
        const { label, color, size, icon, onClick, isDisabled } = action;
        return (
            <Tooltip key={Math.random()} title={label} onClick={(e: any) => onClick({ payload, showAlert, getAllChannels, navigate, setDialogContext, setLoading })}>
                <IconButton color={color} size={size} disabled={isDisabled({ payload })}>
                    {icon}
                </IconButton>
            </Tooltip>
        );
    };

    const columns = useMemo(
        () => [
            {
                Header: 'Name',
                accessor: 'name',
                disableFilters: true,
                Cell(value: any) {
                    const row = value?.cell?.row?.original || {};
                    const status = row?.status
                    return <>
                        <Box display="flex" alignItems="center" mb={1}>
                            &nbsp;
                            <Typography align="left" variant="subtitle1">
                                {row?.name}
                            </Typography>
                        </Box>
                    </>
                }
            },
            {
                Header: 'Type',
                accessor: 'type',
                disableFilters: true,
                Cell({ value }: any) {
                    return _.toUpper(value);
                }
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
                            <Chip
                                size="small"
                                variant="outlined"
                                color={alertStatusColor(status)}
                                label={status.toUpperCase()}
                            />
                        </Box>
                    );
                }
            },
            {
                Header: 'Created On',
                accessor: 'createdAt',
                disableFilters: true,
                disableGroupBy: true,
                Aggregated: () => null,
                Cell: ({ value, cell }: any) => {
                    return dayjs(value).format('DD MMMM YYYY h:mm A') || "-"
                }
            },
            {
                Header: 'Updated On',
                accessor: 'updatedAt',
                disableFilters: true,
                disableGroupBy: true,
                Aggregated: () => null,
                Cell: ({ value, cell }: any) => {
                    return dayjs(value).format('DD MMMM YYYY h:mm A') || "-"
                }
            },
            {
                Header: 'Actions',
                accessor: 'color',
                disableFilters: true,
                Cell: ({ value, cell }: any) => {
                    const row = cell?.row?.original || {};
                    if (row?.onlyTag) return null;
                    return <Stack direction="row" justifyContent="flex-start" alignItems="center">
                        {_.map(actions, renderAction(row))}
                    </Stack>
                }
            }
        ],
        []
    );

    const renderHeader = (payload: Record<string, any>) => {
        return (
            <Box sx={{ p: 2, pb: 0 }}>
                <Grid item xs={12}>
                    <NotificationChannelsHeader payload={payload} channels={channels} getAllChannels={getAllChannels} />
                </Grid>
            </Box>
        );
    };

    const renderDialog = () => {
        if (!dialogContext) return null;
        return <AlertDialog {...{ ...dialogContext, open: true }} />;
    };

    const renderListChannels = () => {
        return <>
            <ScrollX>
                <TableWithCustomHeader columns={columns} data={channels} renderHeader={renderHeader} toggleRefresh={refreshData} />
            </ScrollX>
            {renderDialog()}
            {!_.size(channels) &&
                <Alert severity='error'><Typography variant='body1'>{"No Notification Channels configured. Click on Add Channel to create a new notification channel"}</Typography></Alert>
            }
        </>
    }

    return (
        <Grid>
            <Box sx={{ padding: "1rem" }}>
                <MainCard content={false} >
                    {loading ? renderSkeleton({ config: { type: 'table', width: "100%", totallines: 6 } }) : renderListChannels()}
                </MainCard>
            </Box>
        </Grid>
    );
};

export default NotificationChannelsTable;