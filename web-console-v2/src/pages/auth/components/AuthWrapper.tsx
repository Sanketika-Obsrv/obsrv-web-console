import React from 'react';
import { Box, Grid } from '@mui/material';
import AuthCard from './AuthCard';

interface AuthWrapperProps {
    children?: React.ReactNode;
}

const AuthWrapper = ({
    children
}: AuthWrapperProps) => (
    <Box sx={{ minHeight: '100vh' }}>
        <Grid container direction="column" justifyContent="center" sx={{ minHeight: '100vh' }}>
            <Grid item xs={12}>
                <Grid item xs={12} container justifyContent="center" alignItems="center" sx={{ minHeight: { xs: 'calc(100vh - 134px)', md: 'calc(100vh - 112px)' } }}>
                    <Grid item>
                        <AuthCard>{children}</AuthCard>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    </Box>
);

export default AuthWrapper;
