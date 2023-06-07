// material-ui
import { Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - LIST ITEM ICON ||============================== //

export default function ListItemButton(theme: Theme) {
    return {
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    color: theme.palette.primary.main
                }
            }
        }
    };
}
