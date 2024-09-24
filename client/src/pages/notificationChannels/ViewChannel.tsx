import { Box, Dialog, Grid, Tooltip } from "@mui/material";
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";
import TableWithCustomHeader from "components/TableWithCustomHeader";
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router";
import { getChannel, publishChannel, retireChannel } from "services/notificationChannels";
import { error, success } from "services/toaster";
import { Button } from '@mui/material';
import { Stack } from '@mui/material';
import _ from 'lodash';
import { Typography } from "@mui/material";
import { Chip } from "@mui/material";
import dayjs from 'dayjs';
import { DeleteOutlined, EditOutlined, MessageOutlined, PlayCircleOutlined } from "@ant-design/icons";
import SendTestMessage from "./components/SendTestMessage";
import { getKeyAlias } from "services/keysAlias";
import { dialogBoxContext } from "pages/alertManager/services/utils";
import AlertDialog from "components/AlertDialog";
import { renderSkeleton } from "services/skeleton";

const ViewChannel = () => {

    const [loading, setLoading] = useState(false);
    const { id } = useParams();
    const [channelMetadata, setChannelMetadata] = useState({});
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [testChannelDialogOpen, setTestChannelDialogOpen] = useState(false);
    const [dialogContext, setDialogContext] = useState<any>(null);

    const fetchNotificationChannel = async (id: string) => {
        try {
            const response = await getChannel({ id });
            const channelMetadata = _.omit(_.get(response, 'result'), ['manager']);
            setChannelMetadata(channelMetadata);
        } catch (err) {
            dispatch(error({ message: "Failed to fetch channel metadata" }))
        } finally {
            setLoading(false);
        }
    }

    const actions = useMemo(() => {
        return [
            {
                name: 'back',
                label: 'Back',
                variant: 'outlined',
                color: 'primary',
                isDisabled: (context: Record<string, any>) => { return false },
                onClick: () => navigate(-1)
            },
            {
                label: "Test",
                icon: <MessageOutlined />,
                isDisabled: (context: Record<string, any>) => {
                    return false;
                },
                onClick: async (context: Record<string, any>) => {
                    setTestChannelDialogOpen(true);
                }
            },
            {
                label: "Publish",
                icon: <PlayCircleOutlined />,
                isDisabled: (context: Record<string, any>) => {
                    const { payload } = context;
                    const { status } = payload;
                    if (_.toLower(status) === "live") return true;
                    return false;
                },
                color: 'success',
                onClick: async (context: Record<string, any>) => {
                    const { payload, dispatch } = context;
                    const { id } = payload;
                    const publish = async () => {
                        setLoading(true)
                        try {
                            await publishChannel({ id });
                            fetchNotificationChannel(id);
                            dispatch(success({ message: "Channel published successfully" }))
                        } catch (err) {
                            dispatch(error({ message: "Failed to publish channel" }));
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
                icon: <EditOutlined />,
                isDisabled: (context: Record<string, any>) => false,
                onClick: (context: Record<string, any>) => {
                    const { payload, navigate } = context;
                    const { id } = payload;
                    navigate(`/alertChannels/edit/${id}`);
                }
            },
            {
                label: "Retire",
                icon: <DeleteOutlined />,
                isDisabled: (context: Record<string, any>) => {
                    const { payload } = context;
                    const { status } = payload;
                    if (_.toLower(status) === "retired") return true;
                    return false;
                },
                color: 'error',
                onClick: async (context: Record<string, any>) => {
                    const { payload, dispatch } = context;
                    const { id } = payload;
                    const retire = async () => {
                        setLoading(true)
                        try {
                            await retireChannel({ id })
                            fetchNotificationChannel(id);
                            dispatch(success({ message: "Channel retired successfully" }))
                        } catch (err) {
                            dispatch(error({ message: "Failed to retire channel" }))
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
    }, []);

    const renderDialog = () => {
        if (!dialogContext) return null;
        return <AlertDialog {...{ ...dialogContext, open: true }} />;
    };

    const formatDate = (payload: string) => {
        return dayjs(payload).format('MMMM D, YYYY h:mm A');
    }

    const renderCell = (context: Record<string, any>) => {
        const row = context?.cell?.row?.original || {};
        const rowKey = row?.label;
        let rowValue = row?.value;

        if (['createdAt', 'updatedAt'].includes(rowKey)) {
            rowValue = formatDate(rowValue);
        }

        switch (typeof rowValue) {
            case 'object':
                return (
                    <Box>
                        {_.entries(rowValue).map(([key, value]: any) => (
                            <Chip key={key} label={`${key} : ${value}`} color="info" variant="combined" sx={{ marginRight: '0.5rem' }} />
                        ))}
                    </Box>
                );
            default: {
                switch (rowKey) {
                    case 'status':
                    case 'type':
                        return (
                            <Box>
                                <Chip
                                    label={rowValue.toUpperCase()}
                                    color={rowValue == 'draft' ? 'warning' : rowValue == 'retired' ? 'secondary' : 'success'}
                                    size="small"
                                    variant={rowKey == 'status' ? 'filled' : 'combined'}
                                />
                            </Box>
                        );
                    default:
                        return (
                            <Box>
                                <Typography variant="h6">{rowValue}</Typography>
                            </Box>
                        );
                }
            }
        }
    };

    const columns = useMemo(() => {
        return [
            {
                Header: 'Key',
                accessor: 'label',
                disableFilters: true,
                style: {
                    width: '20vw'
                },
                Cell(context: any) {
                    return (<Box>
                        <Typography variant='h6'>
                            {_.capitalize(getKeyAlias(context?.value))}
                        </Typography>
                    </Box>)
                }
            },
            {
                Header: 'Value',
                accessor: 'value',
                disableFilters: true,
                style: {
                    width: 'auto'
                },
                Cell: renderCell
            }
        ]
    }, []);

    const renderActionButton = (btn: Record<string, any>) => {
        const { label, isDisabled, icon, onClick, color, variant = 'contained' } = btn;
        const context = { payload: channelMetadata, dispatch, navigate };
        return <> <Button onClick={_ => onClick(context)} startIcon={icon} color={color} variant={variant} disabled={isDisabled({ payload: channelMetadata })}>{label}</Button></>
    }

    useEffect(() => {
        if (id) {
            setLoading(true);
            fetchNotificationChannel(id);
        }
    }, [id]);

    const renderActions = () => {
        return (
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                {_.map(actions, renderActionButton)}
            </Stack>
        );
    }

    const renderTitle = () => {
        const name = _.get(channelMetadata, "name") || "Loading..."
        const status = _.get(channelMetadata, 'status') || "draft";
        return < Stack direction="row" alignItems="center" >
            <Tooltip title={'Notification Channel Name'}>
                <Typography variant="h5" padding={1} mr={1}>
                    {name}
                </Typography>
            </Tooltip>
        </Stack >
    };

    const transformInput = (payload: Record<string, any>, keysToOmit: string[]) => {
        const input = _.omit(payload, keysToOmit || []);
        return _.compact(_.map(_.entries(input), (entry) => {
            const [label, value] = entry;
            if (value && typeof value === 'string') {
                return { label, value };
            }
            return null;
        }))
    }

    const tableInputData = [...transformInput(channelMetadata, ['id']), ...(transformInput(_.get(channelMetadata, 'config')! as Record<string, any>, []))]

    const renderTestChannelDialog = () => {
        const handleClose = (context?: Record<string, any>) => setTestChannelDialogOpen(false);
        return <Dialog open={testChannelDialogOpen} fullWidth={true}>
            <SendTestMessage onClose={handleClose} channel={channelMetadata} />
        </Dialog>
    }

    const renderViewTable = () => {
        return <MainCard title={renderTitle()} secondary={renderActions()} contentSX={{ px: 3, background: 'inherit' }} content={false} >
            <Grid container rowSpacing={2} columnSpacing={2}>
                <Grid item xs={12}>
                    <ScrollX>
                        <TableWithCustomHeader columns={columns} data={tableInputData} />
                    </ScrollX>
                </Grid>
                <Grid item xs={12}>
                    {renderTestChannelDialog()}
                </Grid>
                <Grid>
                    {renderDialog()}
                </Grid>
            </Grid>
        </MainCard>
    }

    return <>{loading ?
        <MainCard content={false}>
            {renderSkeleton({ config: { type: 'table', width: "100%", totallines: 6 } })}
        </MainCard> :
        renderViewTable()}
    </>
}

export default ViewChannel;