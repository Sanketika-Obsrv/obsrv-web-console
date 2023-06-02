// material-ui
// eslint-disable-next-line
import * as Theme from '@mui/material/styles';

// project import
import { CustomShadowProps } from 'types/theme';

declare module '@mui/material/styles' {
    interface Theme {
        customShadows: CustomShadowProps;
    }
    interface TypographyVariants {
        body3: React.CSSProperties;
    }

    // allow configuration using `createTheme`
    interface TypographyVariantsOptions {
        body3?: React.CSSProperties;
    }
}

// Update the Typography's variant prop options
declare module '@mui/material/Typography' {
    interface TypographyPropsVariantOverrides {
        body3: true;
    }
}

