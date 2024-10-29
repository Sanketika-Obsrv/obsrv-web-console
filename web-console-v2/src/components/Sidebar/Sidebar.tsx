import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import { Icon, Typography } from '@mui/material';
import KeyboardDoubleArrowRightOutlinedIcon from '@mui/icons-material/KeyboardDoubleArrowRightOutlined';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import Tooltip from '@mui/material/Tooltip';
import styles from './Sidebar.module.css';
import SidebarElements from './SidebarElements';
import { useTheme } from '@mui/material/styles';
import _ from 'lodash';

interface Props {
    onExpandToggle: () => void;
    expand: boolean;
}

const OBSRV_WEB_CONSOLE = process.env.REACT_APP_OBSRV_WEB_CONSOLE as string;
const redirectUrl: any = [""];

const Sidebar: React.FC<Props> = ({ onExpandToggle, expand }) => {
    const theme = useTheme();
    const elements = SidebarElements();
    const navigate = useNavigate();
    const location = useLocation();
    const pathname = location.pathname;
    const [openParent, setOpenParent] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [selectedChildItem, setSelectedChildItem] = useState<string | null>(null);

    useEffect(() => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        if (

            pathSegments[1] === 'new-dataset' ||
            pathSegments[1] === 'ingestion' ||
            pathSegments[1] === 'processing' ||
            pathSegments[1] === 'storage' ||
            pathSegments[1] === 'preview'
        ) {
            setSelectedItem('/home/new-dataset');
        } else if (pathSegments.length > 2) {
            const mainRoute = `/${pathSegments[0]}/${pathSegments[1]}`;
            const subRoute = location.pathname;
            setOpenParent(mainRoute);
            setSelectedItem(mainRoute);
            setSelectedChildItem(subRoute);
        } else if (pathSegments.length > 1) {
            const mainRoute = `/${pathSegments[0]}/${pathSegments[1]}`;
            setOpenParent(mainRoute);
            setSelectedItem(mainRoute);
            setSelectedChildItem(null);
        } else {
            setOpenParent(null);
            setSelectedItem(null);
            setSelectedChildItem(null);
        }
    }, [location.pathname]);

    const redirectToConsole = () => {
        window.location.assign(OBSRV_WEB_CONSOLE);
    };

    const handleParentClick = (route: string) => {
        if (openParent === route) {
            setOpenParent(null);
            setSelectedChildItem(null);
            navigate('/');
        } else {
            setOpenParent(route);
            setSelectedItem(route);
            setSelectedChildItem(null);
            _.includes(redirectUrl, route) ? redirectToConsole() : navigate(route);
        }
    };

    const handleChildClick = (event: React.MouseEvent, parentRoute: string, childRoute: string) => {
        event.stopPropagation();
        setSelectedChildItem(childRoute);
        setSelectedItem(parentRoute);
        setOpenParent(parentRoute);
        setSelectedItem(parentRoute);
        setSelectedChildItem(childRoute);
        _.includes(redirectUrl, parentRoute) ? redirectToConsole() : navigate(childRoute);
    };

    const handleNavigation = (route: string, mainRoute: string) => {
        setOpenParent(mainRoute);
        setSelectedItem(mainRoute);
        setSelectedChildItem(null);
        navigate(route);
    };

    const handleLogout = () => {
        alert('logout');
    };

    const DrawerList = (
        <div
            className={`${styles.sidebarContainer} ${expand ? styles.expanded : styles.collapsed}`}
        >
            <div
                className={`${styles.sidebarButton} ${expand ? styles.expanded : styles.collapsed}`}
                id="sidebar-button"
                onClick={() => onExpandToggle()}
            >
                <div
                    className={`${styles.buttonIcon} ${expand ? styles.expanded : styles.collapse}`}
                >
                    <KeyboardDoubleArrowRightOutlinedIcon
                        className={styles.arrowIcon}
                        sx={{ backgroundColor: theme.palette.secondary.main }}
                    />
                </div>
            </div>

            <Box className={styles.box}>
                <List>
                    {elements.map((item: any) => {
                        const isSelected = item.route === selectedItem;
                        const isOpen = item.route === openParent;
                        const hasSelectedChild = isOpen && selectedChildItem;

                        return (
                            <div key={item.id}>
                                <ListItem
                                    className={`${styles.listItem} ${isSelected && !hasSelectedChild
                                            ? styles.selected
                                            : styles.unselected
                                        }`}
                                    disablePadding
                                    sx={{
                                        color:
                                            isSelected && !hasSelectedChild
                                                ? theme.palette.secondary.main
                                                : '',
                                        borderLeft:
                                            isSelected && !hasSelectedChild
                                                ? `0.25rem solid ${theme.palette.secondary.main}`
                                                : ''
                                    }}
                                >
                                    <Tooltip title={!expand ? item.title : ''} placement="right">
                                        <ListItemButton
                                            onClick={() => handleParentClick(item.route)}
                                        >
                                            <Icon>{item.icon}</Icon>
                                            {expand && (
                                                <Typography
                                                    variant="body1"
                                                    className={styles.sidebarIcons}
                                                    sx={{
                                                        color:
                                                            isSelected && !hasSelectedChild
                                                                ? theme.palette.secondary.main
                                                                : theme.palette.text.primary
                                                    }}
                                                >
                                                    {item.title}
                                                </Typography>
                                            )}
                                            {expand && item.children && (
                                                <ListItemIcon
                                                    className={styles.dropdownIcon}
                                                    sx={{
                                                        color: isSelected
                                                            ? theme.palette.secondary.main
                                                            : ''
                                                    }}
                                                >
                                                    {isOpen ? (
                                                        <ExpandLessOutlinedIcon />
                                                    ) : (
                                                        <ExpandMoreOutlinedIcon />
                                                    )}
                                                </ListItemIcon>
                                            )}
                                        </ListItemButton>
                                    </Tooltip>
                                </ListItem>

                                {((expand && isOpen) || (!expand && isOpen)) && item.children && (
                                    <List>
                                        {item.children.map((child: any) => {
                                            const isChildSelected =
                                                child.route === selectedChildItem;
                                            return (
                                                <Tooltip
                                                    key={child.id}
                                                    title={!expand ? child.title : ''}
                                                    placement="right"
                                                >
                                                    <ListItem
                                                        className={`${styles.childItem} ${isChildSelected
                                                                ? styles.selected
                                                                : styles.unselected
                                                            } ${expand ? styles.expand : styles.collapsed}`}
                                                        sx={{
                                                            borderLeft: isChildSelected
                                                                ? `0.25rem solid ${theme.palette.secondary.main}`
                                                                : ''
                                                        }}
                                                        onClick={(event) => {
                                                            handleChildClick(
                                                                event,
                                                                item.route,
                                                                child.route
                                                            );
                                                        }}
                                                    >
                                                        <Icon sx={{ color: child.color }}>
                                                            <FiberManualRecordIcon
                                                                className={styles.manualRecordIcon}
                                                                sx={{ fontSize: '0.665rem' }}
                                                            />
                                                        </Icon>

                                                        {expand && (
                                                            <Typography
                                                                variant="body1"
                                                                sx={{
                                                                    color: isChildSelected
                                                                        ? theme.palette.secondary
                                                                            .main
                                                                        : theme.palette.text.primary
                                                                }}
                                                            >
                                                                {child.title}
                                                            </Typography>
                                                        )}
                                                    </ListItem>
                                                </Tooltip>
                                            );
                                        })}
                                    </List>
                                )}
                            </div>
                        );
                    })}
                </List>

                {/* <List sx={{ marginTop: 'auto' }}>
                    <Tooltip title={!expand ? 'Settings' : ''} placement="right">
                        <ListItem
                            className={`${styles.listItem} ${
                                selectedItem === '/home/settings'
                                    ? styles.selected
                                    : styles.unselected
                            }`}
                            disablePadding={true}
                            sx={{
                                borderLeft:
                                    selectedItem === '/home/settings'
                                        ? `0.25rem solid ${theme.palette.secondary.main}`
                                        : ''
                            }}
                        >
                            <ListItemButton
                                onClick={(event) =>
                                    handleNavigation('/home/settings', '/home/settings')
                                }
                            >
                                <Icon
                                    sx={{
                                        color:
                                            selectedItem === '/home/settings'
                                                ? theme.palette.secondary.main
                                                : theme.palette.text.primary
                                    }}
                                >
                                    <SettingsOutlinedIcon />
                                </Icon>
                                {expand && (
                                    <Typography
                                        variant="body1"
                                        className={styles.sidebarIcons}
                                        sx={{
                                            color:
                                                selectedItem === '/home/settings'
                                                    ? theme.palette.secondary.main
                                                    : theme.palette.text.primary
                                        }}
                                    >
                                        Settings
                                    </Typography>
                                )}
                            </ListItemButton>
                        </ListItem>
                    </Tooltip>
                    <Tooltip title={!expand ? 'Logout' : ''} placement="right">
                        <ListItemButton onClick={handleLogout}>
                            <Icon>
                                <LogoutIcon />
                            </Icon>
                            {expand && (
                                <Typography
                                    className={styles.bottomIcons}
                                    variant="body1"
                                    color={theme.palette.text.primary}
                                >
                                    Logout
                                </Typography>
                            )}
                        </ListItemButton>
                    </Tooltip>
                </List> */}
            </Box>
        </div>
    );

    return pathname !== '/login' ? <div>{DrawerList}</div> : <></>;
};

export default Sidebar;
