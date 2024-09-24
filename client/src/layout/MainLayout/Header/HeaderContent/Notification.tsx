import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Badge, Box, ClickAwayListener, Divider, List, ListItemButton, ListItemAvatar, ListItemText,
  Paper, Popper, Typography, useMediaQuery
} from '@mui/material';
import Avatar from 'components/@extended/Avatar';

import MainCard from 'components/MainCard';
import IconButton from 'components/@extended/IconButton';
import Transitions from 'components/@extended/Transitions';
import * as _ from 'lodash';
import dayjs from 'dayjs';
import { BellOutlined, AlertOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAlertsThunk } from 'store/middlewares';
import edataIds from 'data/telemetry/interact.json'
import { fetchFiringAlerts } from 'services/alerts';

const avatarSX = { width: 36, height: 36, fontSize: '1rem' };
const actionSX = { mt: '6px', ml: 1, top: 'auto', right: 'auto', alignSelf: 'flex-start', transform: 'none' };

const Notification = () => {
  const theme = useTheme();
  const matchesXs = useMediaQuery(theme.breakpoints.down('md'));
  const anchorRef = useRef<any>(null);
  const [open, setOpen] = useState(false);

  const dispatch = useDispatch();
  const alertsState = useSelector((state: any) => state?.alerts);
  const status = _.get(alertsState, 'status');
  const alerts = fetchFiringAlerts(alertsState?.data || []);
  const [read, setRead] = useState(_.get(alerts, 'length') || 0);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: MouseEvent | TouchEvent) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }
    setOpen(false);
  };

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchAlertsThunk({}));
    }
  }, [status]);

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

  const iconBackColorOpen = theme.palette.mode === 'dark' ? 'grey.200' : 'grey.300';
  const iconBackColor = theme.palette.mode === 'dark' ? 'background.default' : 'grey.100';

  return (
    <Box sx={{ flexShrink: 0, ml: 0.75, zIndex: 1 }}>

      <IconButton
        color="secondary"
        variant="light"
        data-edataid={edataIds.notifications}
        sx={{ color: 'text.primary', bgcolor: open ? iconBackColorOpen : iconBackColor }}
        aria-label="open profile"
        ref={anchorRef}
        aria-controls={open ? 'profile-grow' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
      >
        <Badge badgeContent={read} color="primary">
          <BellOutlined />
        </Badge>
      </IconButton>
      <Popper
        placement={matchesXs ? 'bottom' : 'bottom-end'}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        popperOptions={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [matchesXs ? -5 : 0, 9]
              }
            }
          ]
        }}
      >
        {({ TransitionProps }) => (
          <Transitions type="fade" in={open} {...TransitionProps}>
            <Paper
              sx={{
                boxShadow: theme.customShadows.z1,
                width: '100%',
                minWidth: 285,
                maxWidth: 420,
                [theme.breakpoints.down('md')]: {
                  maxWidth: 285
                }
              }}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <MainCard
                  title="Notifications"
                  elevation={0}
                  border={false}
                  content={false}
                  sx={{ overflow: 'auto', height: 'auto', maxHeight: '50vh' }}
                >
                  <List
                    component="nav"
                    sx={{
                      p: 0,
                      '& .MuiListItemButton-root': {
                        py: 0.5,
                        '&.Mui-selected': { bgcolor: 'grey.50', color: 'text.primary' },
                        '& .MuiAvatar-root': avatarSX,
                        '& .MuiListItemSecondaryAction-root': { ...actionSX, position: 'relative' }
                      }
                    }}
                  >
                    {
                      _.map(alerts, getNotification)
                    }
                    <Divider />
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
