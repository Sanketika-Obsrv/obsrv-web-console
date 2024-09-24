import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { AppBar, AppBarProps, Toolbar, useMediaQuery } from '@mui/material';
import AppBarStyled from './AppBarStyled';
import HeaderContent from './HeaderContent';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { ReactNode, useMemo } from 'react';
import IconButton from 'components/@extended/IconButton';
import interactIds from 'data/telemetry/interact.json'

const Header = ({ open, handleDrawerToggle }: any) => {
    const theme = useTheme();
    const matchDownMD = useMediaQuery(theme.breakpoints.down('lg'));
    const iconBackColor = 'grey.100';
    const headerContent = useMemo(() => <HeaderContent />, []);
    const iconBackColorOpen = 'grey.200';

    const mainHeader: ReactNode = (
        <Toolbar>
            <IconButton
                data-edataid={!open ? interactIds.sidebar_open : interactIds.sidebar_close}
                aria-label="open drawer"
                onClick={handleDrawerToggle}
                edge="start"
                color="secondary"
                variant="light"
                sx={{ color: 'text.primary', bgcolor: open ? iconBackColorOpen : iconBackColor, ml: { xs: 0, lg: -2 } }}
            >
                {!open ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </IconButton>
            {headerContent}
        </Toolbar>
    );

    const appBar: AppBarProps = {
        position: 'fixed',
        color: 'inherit',
        elevation: 0,
        sx: {
            borderBottom: `1px solid ${theme.palette.divider}`,
            zIndex: 1200
        }
    };

    const appBarStyledProps = { ...appBar, open }

    return (
        <>
            {!matchDownMD ? (
                <AppBarStyled {...appBarStyledProps}>
                    {mainHeader}
                </AppBarStyled>
            ) : (
                <AppBar {...appBar}>
                    {mainHeader}
                </AppBar>
            )}
        </>
    );
};

Header.propTypes = { open: PropTypes.bool, handleDrawerToggle: PropTypes.func };
export default Header;
