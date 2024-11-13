import { createTheme } from '@mui/material/styles';
import '@fontsource/montserrat';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';

declare module '@mui/material/styles' {
    interface Palette {
        tertiary: Palette['primary'];
    }

    interface PaletteOptions {
        tertiary?: PaletteOptions['primary'];
    }
    interface TypeText {
        tertiary: string;
    }
    interface PaletteColor {
        lighter: string | undefined;
    }

    interface SimplePaletteColorOptions {
        lighter?: string;
    }

    interface TypographyVariants {
        majorh1: React.CSSProperties;
        majorh2: React.CSSProperties;
        majorh3: React.CSSProperties;
        majorh4: React.CSSProperties;
        majorh5: React.CSSProperties;
        h1Secondary: React.CSSProperties;
        h2Secondary: React.CSSProperties;
        h2Tertiary: React.CSSProperties;
        bodySecondary: React.CSSProperties;
        bodyBold: React.CSSProperties;
        buttonSecondaryCTA: React.CSSProperties;
        textCTAPrimary: React.CSSProperties;
        textCTASecondary: React.CSSProperties;
        captionMedium: React.CSSProperties;
        buttonContained: React.CSSProperties;
        buttonText: React.CSSProperties;
        buttonOutlined: React.CSSProperties;
    }

    interface TypographyVariantsOptions {
        majorh1?: React.CSSProperties;
        majorh2?: React.CSSProperties;
        majorh3?: React.CSSProperties;
        majorh4?: React.CSSProperties;
        majorh5?: React.CSSProperties;
        h1Secondary?: React.CSSProperties;
        h2Secondary?: React.CSSProperties;
        h2Tertiary?: React.CSSProperties;
        bodySecondary?: React.CSSProperties;
        bodyBold?: React.CSSProperties;
        buttonSecondaryCTA?: React.CSSProperties;
        textCTAPrimary?: React.CSSProperties;
        textCTASecondary?: React.CSSProperties;
        captionMedium?: React.CSSProperties;
        buttonContained?: React.CSSProperties;
        buttonText?: React.CSSProperties;
        buttonOutlined?: React.CSSProperties;
    }
}

declare module '@mui/material/Typography' {
    interface TypographyPropsVariantOverrides {
        majorh1: true;
        majorh2: true;
        majorh3: true;
        majorh4: true;
        majorh5: true;
        h1Secondary: true;
        h2Secondary: true;
        h2Tertiary: true;
        bodySecondary: true;
        bodyBold: true;
        buttonSecondaryCTA: true;
        textCTAPrimary: true;
        textCTASecondary: true;
        captionMedium: true;
        buttonContained: true;
        buttonText: true;
        buttonOutlined: true;
    }
}

declare module '@mui/material/Button' {
    interface ButtonPropsColorOverrides {
        primary: true;
        secondary: true;
        tertiary: true;
        success: true;
        error: true;
        warning: true;
        info: true;
    }

    interface ButtonPropsVariantOverrides {
        back: true
    }
}

export const theme = createTheme({
    
    palette: {
        common: {
            black: '#111111',
            white: '#ffffff'
        },
        primary: {
            main: '#056ece',
            light: '#cde2f5',
            lighter: '#e6f0fa'
        },
        secondary: {
            main: '#f58601',
            dark: '#fac280',
            light: '#fde7cc',
            lighter: '#fef3e6'
        },
        tertiary: {
            main: '#4ecac1',
            dark: '#b8eae6',
            light: '#dcf4f3',
            lighter: '#edfaf9'
        },
        success: {
            main: '#4bae7f',
            light: '#eafbee'
        },
        error: {
            main: '#d96262',
            light: '#ffeeee'
        },
        warning: {
            main: '#f58601',
            light: '#fef3e6',
            dark: '#f3992e'
        },
        info: {
            main: '#5099dd',
            light: '#e9f4ff'
        },
        text: {
            primary: '#111111',
            secondary: '#777777',
            tertiary: '#056ece'
        },
        background: {
            default: '#f6f6f6',
            paper: '#ffffff'
        }
    },

    typography: {
        fontFamily: 'Montserrat',
        majorh1: {
            fontFamily: 'Montserrat',
            fontWeight: 600,
            fontSize: '2.75rem',
            color: '#111111'
        },
        majorh2: {
            fontFamily: 'Montserrat',
            fontWeight: 600,
            fontSize: '2.75rem',
            color: '#f58601'
        },
        majorh3: {
            fontFamily: 'Montserrat',
            fontWeight: 600,
            fontSize: '1.875rem',
            color: '#111111'
        },
        majorh4: {
            fontFamily: 'Montserrat',
            fontWeight: 600,
            fontSize: '1.5rem',
            color: '#111111'
        },
        majorh5: {
            fontFamily: 'Montserrat',
            fontWeight: 700,
            fontSize: '1.5rem',
            color: '#111111'
        },
        h1: {
            fontFamily: 'Montserrat',
            fontWeight: 600,
            fontSize: '1.1rem',
            color: '#111111'
        },
        h1Secondary: {
            fontFamily: 'Montserrat',
            fontWeight: 600,
            fontSize: '1.125rem',
            color: '#111111'
        },

        h2: {
            fontFamily: 'Montserrat',
            fontWeight: 600,
            fontSize: '1rem',
            color: '#111111'
        },
        h3: {
            fontFamily: 'Montserrat',
            fontWeight: 500,
            fontSize: '1rem',
            color: '#111111'
        },
        h4: {
            fontFamily: 'Montserrat',
            fontWeight: 600,
            fontSize: '0.8rem',
            color: '#111111'
        },
        h6: {
            fontFamily: 'Montserrat',
            fontWeight: 500,
            fontSize: '15px',
            color: '#111111',
            lineHeight: '1.05rem'
        },
        h2Secondary: {
            fontFamily: 'Montserrat',
            fontWeight: 500,
            fontSize: '1rem',
            color: '#111111'
        },
        h2Tertiary: {
            fontFamily: 'Montserrat',
            fontWeight: 500,
            fontSize: '1rem',
            color: '#8c8c8c'
        },
        body1: {
            fontFamily: 'Montserrat',
            fontWeight: 500,
            fontSize: '0.875rem',
            color: '#777777'
        },
        bodySecondary: {
            fontFamily: 'Montserrat',
            fontWeight: 500,
            fontSize: '1.125rem',
            color: '#ababab'
        },
        bodyBold: {
            fontFamily: 'Montserrat',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: '#111111'
        },
        caption: {
            fontFamily: 'Montserrat',
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#111111'
        },
        captionMedium: {
            fontFamily: 'Montserrat',
            fontWeight: 500,
            fontSize: '0.75rem',
            color: '#777777'
        },
        button: {
            textTransform: 'none',
            fontFamily: 'Montserrat',
            fontSize: '1.125rem',
            fontWeight: 500,
            color: '#ffffff'
        },
        buttonSecondaryCTA: {
            textTransform: 'none',
            fontFamily: 'Montserrat',
            fontSize: '1.125rem',
            fontWeight: 500,
            color: '#056ece'
        },
        textCTAPrimary: {
            fontFamily: 'Montserrat',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#056ece'
        },
        textCTASecondary: {
            fontFamily: 'Montserrat',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#056ece'
        },
        buttonContained: {
            fontFamily: 'Montserrat',
            fontSize: '1rem',
            fontWeight: 600,
            height: '2rem',
            width: '13.5rem',
            alignContent: 'center'
        },
        buttonText: {
            fontFamily: 'Montserrat',
            fontSize: '1rem',
            fontWeight: 600
        },
        buttonOutlined: {
            fontFamily: 'Montserrat',
            fontSize: '1rem',
            fontWeight: 600,
            height: '2rem',
            minWidth: '8.0625rem'
        }
    },
    components: {
        MuiButton: {
            variants: [{
                props: { variant: 'back' },
                style: {
                    fontSize: '0.8rem',
                    color: '#111111', 
                    marginBottom: '0.3rem',
                    paddingLeft: '2px'
                },
            }]
        },
        MuiTypography: {
            defaultProps: {
                variantMapping: {
                    majorh1: 'h1',
                    majorh2: 'h1',
                    majorh3: 'h1',
                    majorh4: 'h1',
                    majorh5: 'h1',
                    h1Secondary: 'h1',
                    h2Secondary: 'h2',
                    h2Tertiary: 'h2',
                    bodySecondary: 'body1',
                    bodyBold: 'body1',
                    caption: 'caption',
                    captionMedium: 'captionMedium',
                    textCTAPrimary: 'body1',
                    textCTASecondary: 'body2',
                    h5: 'h5'
                }
            }
        }
    },
    shape: {
        borderRadius: 8
    }
});
