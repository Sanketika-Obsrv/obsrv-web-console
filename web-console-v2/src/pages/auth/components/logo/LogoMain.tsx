/* eslint-disable */
import { useTheme } from '@mui/material/styles';
import logo from 'assets/images/obsrv-logo.svg';
import interactIds from 'data/telemetry/interact.json'

const LogoMain = ({ reverse, ...others }: { reverse?: boolean }) => {
    return (
        <>
            <img
                data-edataid={interactIds.logo}
                src={logo} alt="Obsrv" width="150" style={{ margin: 'auto' }} />
        </>
    );
};

export default LogoMain;
