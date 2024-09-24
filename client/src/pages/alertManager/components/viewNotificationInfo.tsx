import { Box, Button, Chip } from "@mui/material";
import _ from "lodash";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { fetchChannels } from "services/notificationChannels";

const ViewNotification = (props: any) => {
    const { value } = props;
    const [notifications, setNotifications] = useState<string | any>();
    const navigate = useNavigate();

    const getChannelId = async () => {
        const response = await fetchChannels({
            data: {
                request: {
                    filters: {
                        id: value
                    }
                }
            }
        });
        const notifications = _.get(response, "result.notifications")
        setNotifications(notifications);
    }

    useEffect(() => {
        getChannelId();
    }, [])

    const navigateToNotificationPage = (id: string) => navigate(`/alertChannels/view/${id}`);

    const renderNotificationChannel = (channel: Record<string, any>, index: any) => {
        const { type, name, id } = channel;
        const label = `${name} (${_.capitalize(type)})`
        return <Button size='small' key={index} variant="outlined" color="info" onClick={_ => navigateToNotificationPage(id)}>{label}</Button>
    }

    return <Box>
        {_.map(notifications, renderNotificationChannel)}
    </Box>
}

export default ViewNotification;