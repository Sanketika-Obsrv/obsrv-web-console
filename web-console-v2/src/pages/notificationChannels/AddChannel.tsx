import React from 'react';
import * as _ from 'lodash';
import { Dialog, Grid } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import SelectChannelType from './components/SelectChannelType';
import ConfigureChannel from './components/ConfigureChannel';
import { createChannel } from 'services/notificationChannels';
import { useNavigate } from 'react-router';
import { renderSections } from 'pages/alertManager/services/utils';
import SendTestMessage from './components/SendTestMessage';
import Loader from 'components/Loader';
import { useAlert } from 'contexts/AlertContextProvider';

const isValid = (config: Record<string, any>) => {
    if (!config) return false;
    return _.every(_.values(config), (value) => value === true);
};

const AddChannel = () => {
    const [formData, setFormData] = useState<Record<string, any>>({
        error: { selectChannel: false, configureChannel: false },
        manager: "grafana"
    });
    const [testChannelDialogOpen, setTestChannelDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const selectedChannelType = _.get(formData, 'type');
    const [testChannel, setTestChannel] = useState<boolean>(false)
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const commonProps = { formData, setFormData, showAlert };

    const sections = useMemo(
        () => [
            {
                id: 'type',
                title: 'Select Notification Channel',
                description:
                    'In order to add a notification to an alert rule you first need to add and configure a notification channel (can be Slack, Email etc)',
                // componentType: 'box',
                component: <SelectChannelType {...{ ...commonProps, sectionLabel: 'selectChannel' }} />
            },
            ...(selectedChannelType
                ? [
                    {
                        id: 'metadata',
                        title: 'Configure Notification Channel',
                        description: `Configure the ${_.toUpper(selectedChannelType)} channel`,
                        component: <ConfigureChannel {...{ ...commonProps, sectionLabel: 'configureChannel' }} />
                    }
                ]
                : [])
        ],
        [selectedChannelType]
    );

    const createNotificationChannel = async () => {
        setLoading(true)
        try {
            if (isValid(_.get(formData, 'error'))) {
                await createChannel({
                    data: { ..._.omit(formData, ['error']) }
                });

                navigate('/home/alertChannels');
                showAlert('Notification channel created successfully', "success")
            }
        } catch (err) {
            showAlert( "Failed to create channel", "error")
        } finally {
            setLoading(false)
        }
    };

    useEffect(() => {
        setTestChannel(false)
    }, [formData])

    const testNotificationChannel = () => {
        setTestChannelDialogOpen(true);
    };

    const renderSectionProps = {
        sections: sections,
        formData: formData,
        actionHandler: createNotificationChannel,
        actionLabel: "Add Notification Channel",
        notificationTestLabel: "Test Channel",
        notificationTestHandler: testNotificationChannel,
        testChannel
    };

    const renderTestChannelDialog = () => {
        const handleClose = (context?: Record<string, any>) => setTestChannelDialogOpen(false);
        return (
            <Dialog open={testChannelDialogOpen} fullWidth={true}>
                <SendTestMessage onClose={handleClose} channel={formData} setTestChannel={setTestChannel} />
            </Dialog>
        );
    };

    return <>
        {loading && <Loader loading={loading}/>}
        <Grid>
            {renderSections(renderSectionProps)}
        </Grid>
        <Grid>
            {renderTestChannelDialog()}
        </Grid>
    </>
};

export default AddChannel;
