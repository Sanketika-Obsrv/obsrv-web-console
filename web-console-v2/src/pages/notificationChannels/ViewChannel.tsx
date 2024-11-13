import React from 'react';
import { Box, Dialog, Grid, Tooltip, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";
import TableWithCustomHeader from "components/TableWithCustomHeader";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getChannel, publishChannel, retireChannel } from "services/notificationChannels";
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
import { useAlert } from "contexts/AlertContextProvider";
import { styled } from '@mui/material/styles';

const ViewChannel = () => {

    const [loading, setLoading] = useState(false);
    const { id } = useParams();
    const [channelMetadata, setChannelMetadata] = useState({});
    const navigate = useNavigate();
    const [testChannelDialogOpen, setTestChannelDialogOpen] = useState(false);
    const [dialogContext, setDialogContext] = useState<any>(null);
    const { showAlert } = useAlert();

    const fetchNotificationChannel = async (id: string) => {
        try {
            const response = await getChannel({ id });
            const channelMetadata = _.omit(_.get(response, 'result'), ['manager']);
            setChannelMetadata(channelMetadata);
        } catch (err) {
            showAlert("Failed to fetch channel metadata", "error")
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
                    const { payload, showAlert } = context;
                    const { id } = payload;
                    const publish = async () => {
                        setLoading(true)
                        try {
                            await publishChannel({ id });
                            fetchNotificationChannel(id);
                            showAlert("Channel published successfully", "success")
                        } catch (err) {
                            showAlert("Failed to publish channel","error")
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
                            showAlert("Channel retired successfully", "success")
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
    }, []);

    const renderDialog = () => {
        if (!dialogContext) return null;
        return <AlertDialog {...{ ...dialogContext, open: true }} />;
    };

    const formatDate = (payload: string) => {
        return dayjs(payload).format('MMMM D, YYYY h:mm A');
    }

    const renderCell = (row: Record<string, any>) => {
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
                            <Chip key={key} label={`${key} : ${value}`} color="info" variant="outlined" sx={{ marginRight: '0.5rem' }} />
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
                                    variant={rowKey == 'status' ? 'filled' : "outlined"}
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

    const renderActionButton = (btn: Record<string, any>) => {
        const { label, isDisabled, icon, onClick, color, variant = 'contained' } = btn;
        const context = { payload: channelMetadata, showAlert, navigate };
        return <> <Button size="small" onClick={_ => onClick(context)} startIcon={icon} color={color} variant="outlined" disabled={isDisabled({ payload: channelMetadata })}>{label}</Button></>
    }

    useEffect(() => {
        if (id) {
            setLoading(true);
            fetchNotificationChannel(id);
        }
    }, [id]);

    const renderActions = () => {
        return (
            <Stack direction="row" justifyContent="right" alignItems="center" p={1} spacing={1}>
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
            <SendTestMessage onClose={handleClose} channel={channelMetadata} setTestChannel={setTestChannelDialogOpen}/>
        </Dialog>
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

    return <>{loading ?
        <MainCard content={false}>
            {renderSkeleton({ config: { type: 'table', width: "100%", totallines: 6 } })}
        </MainCard> :
        (
            <Box>
                <Grid item xs={14} sm={7} lg={7}>
                    {renderActions && renderActions()}
                </Grid>
                <Grid justifyContent={'flex-start'} p={3}>
                    <Grid item xs={14} sm={7} lg={7}>
                        <TableContainer component={Paper} >
                            <Table size="small" aria-label="a dense table">
                            <TableHead>
                                <TableRow>
                                    <TableCell align="left" colSpan={2}>
                                        {renderTitle()}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell align="left" width={'50%'} sx={{ borderRight: '1px solid #ddd !important' }}>Key</TableCell>
                                    <TableCell align="left" width={'50%'} >Value</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tableInputData && tableInputData.map( (record:any) => (
                                    <StyledTableRow key={_.get(record,'label')} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{_.capitalize(_.get(record,'label'))}</TableCell>
                                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{renderCell(record)}</TableCell>
                                    </StyledTableRow>
                                ))}
                            </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                </Grid>
                <Grid item xs={12}>
                    {renderTestChannelDialog()}
                </Grid>
                <Grid>
                    {renderDialog()}
                </Grid>
            </Box>
        )
        }
    </>
}

export default ViewChannel;