// // ==============================|| OVERRIDES - TYPOGRAPHY ||============================== //

export default function Typography() {
    return {
        MuiTypography: {
            variantMapping: {
                body3: 'p',
            },
            styleOverrides: {
                gutterBottom: {
                    marginBottom: 12
                }
            }
        }
    };
}
