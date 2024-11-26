/* eslint-disable */
import * as _ from 'lodash';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery, Button, Stack } from '@mui/material';
import socialbuttons from './socialbuttons';
import interactIds from 'data/telemetry/interact.json'
import { getSystemSetting } from 'services/configData';

const LoginSocialButton = () => {

    const theme = useTheme();
    const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));
    const allowedAuthTypes = getSystemSetting("AUTHENTICATION_ALLOWED_TYPES")  || ""

    const renderSocialButtons = (option: any) => {
        return (
           ( _.includes(allowedAuthTypes, _.lowerCase(option.value))) ? 
        <Button
            data-edataid={_.get(interactIds, option.edataId)}
            key={option.value}
            variant="outlined"
            color="secondary"
            sx={{ height: 45 }}
            fullWidth={!matchDownSM}
            startIcon={option.icon}
            onClick={option.onClick}
        >
            {!matchDownSM && option.label}
        </Button> : null
        )
    }

    return (
        <Stack direction="column" spacing={matchDownSM ? 1 : 2} justifyContent={matchDownSM ? 'space-around' : 'space-between'} sx={{ '& .MuiButton-startIcon': { mr: matchDownSM ? 0 : 1, ml: matchDownSM ? 0 : -0.5 } }}
        > {socialbuttons.map(renderSocialButtons)}
        </Stack>
    );
};

export default LoginSocialButton;
