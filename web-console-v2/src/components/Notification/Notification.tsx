import * as React from 'react';
import { useRef } from 'react';
import {
    Box, ClickAwayListener, Divider, List, ListItemButton, ListItemAvatar, ListItemText,
    Paper, Popper, Typography
} from '@mui/material';

import MainCard from 'components/MainCard';
import Transitions from 'components/@extended/Transitions';
import Avatar from 'components/@extended/Avatar';
import * as _ from 'lodash';
import dayjs from 'dayjs';
import { AlertOutlined } from '@ant-design/icons';
import styles from './Notification.module.css';

const Notification = (props: any) => {
    const { open, setOpen, alerts } = props || {}
    const anchorRef = useRef<any>(null);

    const handleClose = (event: MouseEvent | TouchEvent) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return;
        }
        setOpen(false);
    };

    const getNotification = (alert: any) => {
        const color: any = _.get(alert, ['labels', 'severity']) === 'critical' ? 'error' : 'warning'
        const { transformedDescription } = alert;
        if (!transformedDescription) return;
        return <ListItemButton>
            <ListItemAvatar>
                <Avatar
                    color={color}
                    type="filled"
                >
                    <AlertOutlined />
                </Avatar>
            </ListItemAvatar>
            <ListItemText
                primary={
                    <Typography variant="h6">
                        <Typography component="span" variant="subtitle1">
                            {transformedDescription}
                        </Typography>{' '}
                    </Typography>
                }
                secondary={dayjs(alert?.activeAt).format('MMMM D, YYYY h:mm A')}
            />
        </ListItemButton>
    }

    return (
        <Box>
            <Popper open={open} transition disablePortal className={styles.notificationPopper}>
                {({ TransitionProps }) => (
                    <Transitions type="fade" in={open} {...TransitionProps}>
                        <Paper sx={{ width: '100%', maxWidth: '420px', maxHeight: '50vh', overflow: 'auto' }}>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard title="Notifications" elevation={0} border={false} content={false} sx={{ margin: "1px" }}>
                                    <List component="nav">
                                        {_.map(alerts, getNotification)}
                                        <Divider />
                                    </List>
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Transitions>
                )}
            </Popper>
        </Box>
    );
};

export default Notification;
