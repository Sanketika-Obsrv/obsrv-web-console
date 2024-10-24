import * as React from 'react';
import { Typography, Breadcrumbs, Grid, Box } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import styles from './Navbar.module.css';
import Grafana from 'assets/icons/Grafana';
import Superset from 'assets/icons/Superset';
import _ from 'lodash';

const OBSRV_WEB_CONSOLE = process.env.REACT_APP_OBSRV_WEB_CONSOLE as string || "/console/datasets?status=Live";

function BasicBreadcrumbs(): JSX.Element {
    const location = useLocation();
    const pathname = location.pathname;
    const pathnames = pathname.split('/').filter((x) => x);

    const formatBreadcrumb = (string: string): string =>
        string
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

    const handleNavigate = () => {
        window.location.href = OBSRV_WEB_CONSOLE;
    };

    return (
        <Grid container className={styles.navMain} role="presentation" alignItems="center">
            <Grid item xs={1.5} className={styles.logo}>
                <Box onClick={handleNavigate}>
                    <img src="/images/obsrvLogo.svg" alt="Logo" width={130} />
                </Box>
            </Grid>
            <Grid item xs={9.5} className={styles.breadcrumb}>
                <Breadcrumbs aria-label="breadcrumb">
                    {pathnames.map((name, index) => {
                        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                        const isLast = index === pathnames.length - 1;
                        const displayName = isLast ? name : name.charAt(0).toUpperCase() + name.slice(1); // Capitalize first letter for non-last items
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
            {/* <Grid item xs={1} className={styles.navIcons}>
                <div className={styles.icons}>
                    <Grafana color="secondary" />
                </div>
                <div className={styles.icons}>
                    <Superset />
                </div>
                <div className={styles.icons}>
                    <NotificationsNoneOutlinedIcon />
                </div>
            </Grid> */}
        </Grid>
    );
}

export default BasicBreadcrumbs;
