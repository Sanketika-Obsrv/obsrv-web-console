import * as _ from 'lodash';
import { Dialog, Grid } from '@mui/material';
import { useDispatch } from 'react-redux';
import { useEffect, useMemo, useState } from 'react';
import SelectChannelType from './components/SelectChannelType';
import ConfigureChannel from './components/ConfigureChannel';
import { createChannel } from 'services/notificationChannels';
import { error, success } from 'services/toaster';
import { useNavigate } from 'react-router';
import { renderSections } from 'pages/alertManager/services/utils';
import SendTestMessage from './components/SendTestMessage';
import Loader from 'components/Loader';
import { getConfigValue } from 'services/configData';

const isValid = (config: Record<string, any>) => {
    if (!config) return false;
    return _.every(_.values(config), (value) => value === true);
};

const AddChannel = () => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState<Record<string, any>>({
        error: { selectChannel: false, configureChannel: false },
        manager: getConfigValue("ALERT_MANAGER")
    });
    const [testChannelDialogOpen, setTestChannelDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const commonProps = { formData, setFormData, dispatch };
    const selectedChannelType = _.get(formData, 'type');
    const [testChannel, setTestChannel] = useState<boolean>(false)
    const navigate = useNavigate();

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

                navigate('/alertChannels');
                dispatch(success({ message: 'Notification channel created successfully' }));
            }
        } catch (err) {
            dispatch(error({ message: "Failed to create channel" }));
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
        {loading && <Loader />}
        <Grid>
            {renderSections(renderSectionProps)}
        </Grid>
        <Grid>
            {renderTestChannelDialog()}
        </Grid>
    </>
};

export default AddChannel;
