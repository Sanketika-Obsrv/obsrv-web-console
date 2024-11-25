import * as React from 'react';
import { Typography, Breadcrumbs, Grid, Box, Badge, BadgeProps } from '@mui/material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import styles from './Navbar.module.css';
import Grafana from 'assets/icons/Grafana';
import Superset from 'assets/icons/Superset';
import _ from 'lodash';
import Notification from 'components/NotificationBar/AlertNotification';
import { useEffect, useState } from 'react';
import { fetchFiringAlerts } from 'services/alerts';
import logoIcon from 'assets/images/obsrv-logo.svg';
import { getBaseURL, getSystemSetting } from 'services/configData';
import { errorInterceptor, responseInterceptor } from 'services/http';
import { addHttpRequestsInterceptor } from 'services/http';
import { routeConfigurations } from 'router';
import { styled } from '@mui/material/styles';

const OBSRV_WEB_CONSOLE = process.env.REACT_APP_OBSRV_WEB_CONSOLE as string || "/dashboard";

function BasicBreadcrumbs(): JSX.Element {
    const location = useLocation();
    const rnavigate = useNavigate();
    const pathname = location.pathname;
    
    const [openNotification, setOpenNotification] = useState(false);
    const [alerts, setAlerts] = useState<any>(null)
    const [read, setRead] = useState<any>(_.get(alerts, 'length') || 0);

    const toggleNotification = () => {
        setOpenNotification((prev) => !prev);
    };

    const pathnames = pathname.split('/').filter((x) => x);
    const navigate = (path: any) => {
        if (path) {
            window.open(path);
        }
    }

    const handleNavigate = () => {
        rnavigate(OBSRV_WEB_CONSOLE);
    };

    useEffect(() => {
        addHttpRequestsInterceptor({ responseInterceptor, errorInterceptor: errorInterceptor({ navigate: rnavigate }) })
      }, [])
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const alertsData: any = await fetchFiringAlerts({});
                setAlerts(alertsData);
                setRead(_.size(alertsData));
            } catch {
                setAlerts([]);
            }
        };
        if(openNotification || _.isNull(alerts)) fetchAlerts();
    }, [openNotification]);
    

    // Helper function to generate a regex for dynamic paths (supports parameters like :id)
    const getDynamicRegex = (path: string) => {
        return new RegExp(
            '^' +
            path
                .split('/')
                .map(segment => (segment.startsWith(':') ? '[^/]+' : segment))
                .join('/') +
            '$'
        );
    };

    // Recursive function to find a matching route, including support for nested routes and dynamic segments
    const findRoute = (routes: any, path: string) => {
        for (const route of routes) {
            // Check for an exact match or a dynamic match
            const dynamicRegex = getDynamicRegex(route.path);
            if (dynamicRegex.test(path)) return { ...route, path: path };

            // Check nested routes if available
            if (route.children) {
                for (const childData of route.children) {
                    const dynamicRegex = getDynamicRegex(`${route.path}/${childData.path}`);
                    if (dynamicRegex.test(path)) return { ...childData, path: path };
                }
            }
        }
        return null;
    };

    const StyledBadge = styled(Badge)<BadgeProps>(({ theme }) => ({
        '& .MuiBadge-badge': {
          right: -3,
          top: 6,
          border: `2px solid ${theme.palette.background.paper}`,
          padding: '0 4px'
        },
      }));

    return (pathname !== '/login' ? (
        <Grid container className={styles.navMain} role="presentation" alignItems="center">
            <Grid item xs="auto" className={styles.logo}>
                <Box onClick={handleNavigate} sx={{width: '16.05rem', textAlign: 'center'}}>
                    <img src={logoIcon} alt="Logo" width={100} />
                </Box>
            </Grid>
            <Grid item xs={7} className={styles.breadcrumb}>
                <Breadcrumbs aria-label="breadcrumb">
                    {
                    pathnames.map((name, index) => {
                        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                        const matchedRoute = findRoute(routeConfigurations, routeTo);
                        const isLast = index === pathnames.length - 1;
                        // Capitalize first letter apart from datasetId
                        // const displayName = isLast ? name : _.capitalize(name);
                        if(matchedRoute){
                            const displayName = matchedRoute?.label !== undefined ? matchedRoute.label : _.capitalize(name);
                            return isLast ? (
                                <Typography
                                    variant="body1"
                                    color="text.primary"
                                    key={name}
                                    sx={{ fontWeight: 700 }}
                                >
                                    {displayName}
                                </Typography>
                            ) : _.isEqual(routeTo, '/home') ? (
                                <Typography
                                    variant="body1"
                                    key={name}
                                    onClick={handleNavigate}
                                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                                >
                                    {displayName}
                                </Typography>
                            ) : (
                                <NavLink className={styles.noUnderline} key={name} to={routeTo}>
                                    <Typography variant="body1" fontWeight={600}>
                                        {displayName}
                                    </Typography>
                                </NavLink>
                            );
                        }
                    })}
                </Breadcrumbs>
            </Grid>
            <Grid item xs className={styles.navIcons} justifyContent={'right'}>
                <div className={styles.icons}
                    onClick={() => { navigate(getSystemSetting("GRAFANA_URL")) }}>
                    <Grafana color="secondary" />
                </div>
                <div className={styles.icons} onClick={() => { navigate(getSystemSetting("SUPERSET_URL")) }}>
                    <Superset />
                </div>
                <div className={styles.icons} onClick={toggleNotification}>
                    <StyledBadge badgeContent={read} color="primary">
                        <NotificationsNoneOutlinedIcon />
                    </StyledBadge>
                </div>
            </Grid>
            <Grid className={styles.alertNotification}>
                {openNotification && <Notification open={openNotification} setOpen={setOpenNotification} alerts={alerts} />}
            </Grid>
        </Grid>
    ) : <></>);
}

export default BasicBreadcrumbs;
