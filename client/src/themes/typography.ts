// material-ui
import { Theme, TypographyVariantsOptions } from '@mui/material/styles';

// types
import { FontFamily, ThemeMode } from 'types/config';

// ==============================|| DEFAULT THEME - TYPOGRAPHY  ||============================== //

const Typography = (mode: ThemeMode, fontFamily: FontFamily, theme: Theme): TypographyVariantsOptions => ({
    htmlFontSize: 16,
    fontFamily,
    fontWeightLight: 400,
    fontWeightRegular: 500,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: {
        fontWeight: 600,
        fontSize: '2.375rem',
        lineHeight: 1.21
    },
    h2: {
        fontWeight: 600,
        fontSize: '1.875rem',
        lineHeight: 1.27
    },
    h3: {
        fontWeight: 600,
        fontSize: '1.5rem',
        lineHeight: 1.33
    },
    h4: {
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.4
    },
    h5: {
        fontWeight: 500,
        fontSize: '1.125rem',
        lineHeight: '1rem'
    },
    h6: {
        fontWeight: 400,
        fontSize: '1rem',
        lineHeight: '1rem',
    },
    caption: {
        fontWeight: 400,
        fontSize: '0.75rem',
        lineHeight: 1.66
    },
    body1: {
        fontSize: '1rem',
        lineHeight: '1.375rem',
        fontWeight: 400,
    },
    body2: {
        fontSize: '0.875rem',
        lineHeight: '1rem',
        fontWeight: 400,
    },
    body3: {
        fontSize: '0.875rem',
        lineHeight: '1.25rem',
    },
    subtitle1: {
        fontSize: '0.875rem',
        lineHeight: '1.375rem',
        fontWeight: 600,
    },
    subtitle2: {
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 1.66
    },
    overline: {
        lineHeight: 1.66
    },
    button: {
        textTransform: 'capitalize'
    }
});

export default Typography;
