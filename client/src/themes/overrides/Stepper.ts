// material-ui
import { Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - TAB ||============================== //

export default function Stepper(theme: Theme) {
    return {
        MuiStepIcon: {
            styleOverrides: {
                root: {
                    '&.Mui-active': {
                        color: theme.palette.primary[400],
                    },
                    '&.Mui-completed': {
                        color: theme.palette.primary[400],
                    },
                }
            }
        }
    };
}
