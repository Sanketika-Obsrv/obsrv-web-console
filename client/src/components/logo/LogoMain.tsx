import { useTheme } from '@mui/material/styles';
import logo from 'assets/images/obsrv-logo.svg';

const LogoMain = ({ reverse, ...others }: { reverse?: boolean }) => {
    const theme = useTheme();
    return (
        <>
            <img
                src={theme.palette.mode === 'dark' ? logo : logo} alt="Obsrv" width="150" style={{ margin: 'auto' }} />
        </>
    );
};

export default LogoMain;
