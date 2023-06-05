import { useTheme } from '@mui/material/styles';
import logoIcon from 'assets/images/obsrv-logo.svg';

const LogoIcon = () => {
    const theme = useTheme();

    return (
        <img src={theme.palette.mode === 'dark' ? logoIcon : logoIcon} width="50" />
    );
};

export default LogoIcon;
