import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Box, List, Typography } from '@mui/material';
import NavItem from './NavItem';

const NavGroup = ({ item }: any) => {
    const menu = useSelector((state: any) => state.menu);
    const { drawerOpen } = menu;
    
    const navCollapse = item.children?.map((menuItem: any) => {
        switch (menuItem.type) {
            case 'item':
                return <NavItem key={menuItem.id} item={menuItem} level={1} />;
            default:
                return (
                    <Typography key={menuItem.id} variant="h6" color="error" align="center">
                        Invalid Input
                    </Typography>
                );
        }
    });

    return (
        <List
            subheader={
                item.title &&
                drawerOpen && (
                    <Box sx={{ pl: 3, mb: 1.5 }}>
                        <Typography variant="subtitle2" color="textSecondary">
                            {item.title}
                        </Typography>
                    </Box>
                )
            }
            sx={{ mb: drawerOpen ? 1.5 : 0, py: 0, zIndex: 0 }}
        >
            {navCollapse}
        </List>
    );
};

NavGroup.propTypes = { item: PropTypes.object };
export default NavGroup;
