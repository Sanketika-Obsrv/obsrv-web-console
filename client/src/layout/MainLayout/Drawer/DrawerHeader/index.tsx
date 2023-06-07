import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { Stack } from '@mui/material';
import DrawerHeaderStyled from './DrawerHeaderStyled';
import Logo from 'components/logo';

const DrawerHeader = ({ open }: any) => {
    const theme = useTheme();
    const props = { theme, open };

    return (
        <DrawerHeaderStyled {...props}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Logo />
            </Stack>
        </DrawerHeaderStyled>
    );
};

DrawerHeader.propTypes = { open: PropTypes.bool };
export default DrawerHeader;
