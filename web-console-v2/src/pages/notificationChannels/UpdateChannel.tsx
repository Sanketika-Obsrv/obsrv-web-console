import React from 'react';
import * as _ from 'lodash';
import { Dialog, Grid } from '@mui/material';
import { useEffect, useState } from 'react';
import SelectChannelType from './components/SelectChannelType';
import ConfigureChannel from './components/ConfigureChannel';
import { getChannel, updateChannel } from 'services/notificationChannels';
import { useNavigate, useParams } from 'react-router';
import { renderSections } from 'pages/alertManager/services/utils';
import MainCard from 'components/MainCard';
import SendTestMessage from './components/SendTestMessage';
import { renderSkeleton } from 'services/skeleton';
import { useAlert } from 'contexts/AlertContextProvider';

const isValid = (config: Record<string, any>) => {
    if (!config) return false;
    return _.every(_.values(config), (value) => value === true);
};

const UpdateChannel = () => {
    const [formData, setFormData] = useState<Record<string, any>>({ error: {}, manager: "grafana" });
    const [channelMetadata, setChannelMetadata] = useState({});
    const [testChannelDialogOpen, setTestChannelDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [testChannel, setTestChannel] = useState<boolean>(false)
    const selectedChannelType = _.get(formData, 'type');
    const { showAlert } = useAlert();
    const commonProps = { formData, setFormData, showAlert };


    const { id } = useParams();
    const navigate = useNavigate();

    const sections = [
        {
            id: 'type',
            title: 'Select Notification Channel',
            description:
                'In order to add a notification to an alert rule you first need to add and configure a notification channel (can be Slack, Email etc)',
            componentType: 'box',
            component: (
                <SelectChannelType
                    {...{ ...commonProps, sectionLabel: 'selectChannel', existingState: _.pick(channelMetadata, ['name', 'type']) }}
                />
            )
        },
        ...(selectedChannelType
            ? [
                {
                    id: 'metadata',
                    title: 'Configure Notification Channel',
                    description: 'Configure the selected Channel Type',
                    component: (
                        <ConfigureChannel
                            {...{ ...commonProps, sectionLabel: 'configureChannel', existingState: _.get(channelMetadata, ['config']) }}
                        />
                    )
                }
            ]
            : [])
    ];

    const updateNotificationChannel = async () => {
        setLoading(true)
        try {
            if (isValid(_.get(formData, 'error'))) {
                showAlert('Notification channel update is under progress', "success")
                await updateChannel({
                    id,
                    data: { ..._.omit(formData, ['error']) }
                });

                navigate('/alertChannels');
            }
        } catch (err) {
            showAlert("Failed to update channel", "error")
        } finally {
            setLoading(false)
        }
    };

    const fetchNotificationChannel = async (id: string) => {
        try {
            const response = await getChannel({ id });
            const channelMetadata = response?.result;
            setChannelMetadata(channelMetadata);
        } catch (err) {
            showAlert('Failed to fetch channel metadata', "error")
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            setLoading(true);
            fetchNotificationChannel(id);
        }
    }, [id]);

    useEffect(() => {
        setTestChannel(false)
    }, [formData])

    const actions = [
        {
            name: 'cancel',
            label: 'Cancel',
            variant: 'contained',
            onClick: (e: any) => navigate('/alertChannels')
        }
    ];

    const testNotificationChannel = () => {
        setTestChannelDialogOpen(true);
    };

    const renderSectionProps = {
        sections: sections,
        formData: formData,
        actionHandler: updateNotificationChannel,
        actionLabel: 'Update Channel',
        notificationTestLabel: 'Test Channel',
        notificationTestHandler: testNotificationChannel,
        testChannel
    };

    const renderTestChannelDialog = () => {
        const handleClose = (context?: Record<string, any>) => setTestChannelDialogOpen(false);
        return (
            <Dialog open={testChannelDialogOpen} fullWidth={true}>
                <SendTestMessage onClose={handleClose} channel={formData} setTestChannel={setTestChannel}/>
            </Dialog>
        );
    };

    return (
        <MainCard content={false}>
            {loading ?
                renderSkeleton({ config: { type: "card", height: 80 } }) :
                (<>
                    <Grid>{renderSections(renderSectionProps)}</Grid>
                    <Grid>{renderTestChannelDialog()}</Grid></>
                )
            }
        </MainCard>
    );
};

export default UpdateChannel;
