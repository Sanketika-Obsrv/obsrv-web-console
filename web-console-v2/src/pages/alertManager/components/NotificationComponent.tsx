import React from 'react';
import { Box, Button, Grid, Stack, Typography } from "@mui/material";
import MUIForm from "components/form";
import { StandardWidthButton } from "components/Styled/Buttons";
import { useEffect, useRef, useState } from "react";
import { fetchChannels } from "services/notificationChannels";
import interactIds from "data/telemetry/interact.json";
import { useNavigate } from "react-router";
import _ from 'lodash';

const NotificationComponent = (props: any) => {
    const { formData, setFormData, existingState, sectionLabel } = props;
    const existingNotifications = _.get(existingState, 'notification') || {};
    const channelId = _.get(existingNotifications, 'channels[0]');
    const [value, subscribe] = useState<any>(channelId ? { notificationChannel: channelId } : {});
    // eslint-disable-next-line
    const onSubmission = (value: any) => {};
    const [notificationFieldOptions, setNotificationFieldOptions] = useState<Record<string, any>[]>([]);
    const formikRef = useRef(null);
    const navigate = useNavigate();

    const getChannels = () => {
        return fetchChannels({ data: { "request": { "filters": { "status": "live" } } } })
            .then(response => _.get(response, 'result.notifications') || [])
            .catch(err => ([]))
    }

    const transformChannels = (channels: Record<string, any>[]) => {
        return _.map(channels, channel => {
            const { id, name, type } = channel;
            return {
                label: `${name} (${type})`,
                value: id
            }
        })
    }

    const fetchNotifications = async () => {
        const channels = await getChannels();
        const transformedChannels = transformChannels(channels);
        setNotificationFieldOptions(transformedChannels);
    }

    const fields = [
        {
            name: "notificationChannel",
            label: "Notification Channels",
            type: "autocomplete",
            required: true,
            selectOptions: notificationFieldOptions,
            tooltip: "Select the channel for notification delivery"
        },
    ];

    const subscribeToFormChanges = async () => {
        setFormData((preState: Record<string, any>) => {
            const { notificationChannel } = value;
            const existingNotifications = _.get(preState, 'notifications') || {};
            return {
                ...preState,
                ...{
                    notification: {
                        ...existingNotifications,
                        channels: [notificationChannel]
                    }
                }
            }
        })
    }

    useEffect(() => {
        subscribeToFormChanges();
    }, [value]);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const renderSelectChannelsTemplate = () => {
        return <Grid container direction='row' alignItems={"center"} spacing={2}>
            <Grid item xs={6}>
                <MUIForm
                    initialValues={value}
                    enableReinitialize={true}
                    subscribe={subscribe}
                    onSubmit={(value: any) => onSubmission(value)}
                    fields={fields}
                    ref={formikRef}
                />
            </Grid>
            <Grid item xs={6}>
                <Button variant="contained" onClick={() => navigate("/alertChannels")}>Create Notification Channel</Button>
            </Grid>
        </Grid>
    }

    const renderCreateNewChannelTemplate = () => {
        return <Grid item xs={12}>
            <Stack spacing={4} direction="column" justifyContent="center" alignItems="center">
                <Typography variant="body1" fontWeight={500}>
                    There are no live notification channels yet. Please create/publish one to proceed further
                </Typography>
                <Box>
                    <StandardWidthButton
                        data-edataid={interactIds.add_notification_channel}
                        onClick={() => navigate('/alertChannels/new')}
                        variant="contained"
                        size="large"
                        sx={{ width: 'auto' }}
                    >
                        <Typography variant="button">
                            Create Notification Channel
                        </Typography>
                    </StandardWidthButton>
                </Box>
            </Stack>
        </Grid>
    }

    const renderSection = () => {
        const channelsExists = _.get(notificationFieldOptions, 'length') > 0;
        if (!channelsExists) return renderCreateNewChannelTemplate();
        return renderSelectChannelsTemplate();
    }

    return <Grid container direction='column'>{renderSection()}</Grid>
}

export default NotificationComponent;