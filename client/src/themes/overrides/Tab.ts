// material-ui
import { Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - TAB ||============================== //

export default function Tab(theme: Theme) {
    return {
        MuiTab: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                    minHeight: 46,
                    color: theme.palette.text.primary,
                    borderRadius: 4,
                    border: "1px solid #E3E3E3",
                    '&:hover': {
                        backgroundColor: theme.palette.primary.lighter + 60,
                        color: theme.palette.primary.main
                    },
                    '&:focus-visible': {
                        borderRadius: 4,
                        outline: `2px solid ${theme.palette.secondary.dark}`,
                        outlineOffset: -3
                    }
                }
            }
        }
    };
}
