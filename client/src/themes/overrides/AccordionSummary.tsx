// material-ui
import { Theme } from '@mui/material/styles';

// assets
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

// ==============================|| OVERRIDES - ALERT TITLE ||============================== //

export default function AccordionSummary(theme: Theme) {
    const { palette, spacing } = theme;

    return {
        MuiAccordionSummary: {
            defaultProps: {
                expandIcon: <ArrowForwardIosIcon sx={{ fontSize: '1.25rem' }} />
            },
            styleOverrides: {
                root: {
                    minHeight: 46
                },
                expandIconWrapper: {
                    '&.Mui-expanded': {
                        transform: 'rotate(90deg)'
                    }
                },
            }
        }
    };
}
