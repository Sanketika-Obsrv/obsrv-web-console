import * as React from 'react';
import { Typography, Breadcrumbs, Grid, Box, Badge } from '@mui/material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import styles from './Navbar.module.css';
import Grafana from 'assets/icons/Grafana';
import Superset from 'assets/icons/Superset';
import _ from 'lodash';
import { getConfigValue } from 'services/dataset';
import Notification from 'components/NotificationBar/AlertNotification';
import { useEffect, useState } from 'react';
import { fetchFiringAlerts } from 'services/alerts';
import logo from 'assets/images/obsrvLogo.svg';
import { getBaseURL, getConfigValueV1 } from 'services/configData';
import { errorInterceptor, responseInterceptor } from 'services/http';
import { addHttpRequestsInterceptor } from 'services/http';

const OBSRV_WEB_CONSOLE = process.env.REACT_APP_OBSRV_WEB_CONSOLE as string || "/console/home/dashboards";

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
        rnavigate("/home/dashboard");
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

    return (pathname !== '/login' ? (
        <Grid container className={styles.navMain} role="presentation" alignItems="center">
            <Grid item xs={1.5} className={styles.logo}>
                <Box onClick={handleNavigate}>
                    <img src={`${getBaseURL()}/images/obsrvLogo.svg`} alt="Logo" width={130} />
                </Box>
            </Grid>
            <Grid item xs={9.5} className={styles.breadcrumb}>
                <Breadcrumbs aria-label="breadcrumb">
                    {pathnames.map((name, index) => {
                        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                        const isLast = index === pathnames.length - 1;
                        // Capitalize first letter apart from datasetId
                        const displayName = isLast ? name : _.capitalize(name);
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
                    })}
                </Breadcrumbs>
            </Grid>
            <Grid item xs={1} className={styles.navIcons}>
                <div className={styles.icons}
                    onClick={() => { navigate(getConfigValueV1("GRAFANA_URL")) }}>
                    <Grafana color="secondary" />
                </div>
                <div className={styles.icons} onClick={() => { navigate(getConfigValueV1("SUPERSET_URL")) }}>
                    <Superset />
                </div>
                <div className={styles.icons} onClick={toggleNotification}>
                    <Badge badgeContent={read} color="primary">
                        <NotificationsNoneOutlinedIcon />
                    </Badge>
                </div>
            </Grid>
            <Grid className={styles.alertNotification}>
                {openNotification && <Notification open={openNotification} setOpen={setOpenNotification} alerts={alerts} />}
            </Grid>
        </Grid>
    ) : <></>);
}

export default BasicBreadcrumbs;
