import { Grid, Stack } from '@mui/material';
import AuthLogin from 'pages/auth/components/AuthLogin';
import AuthWrapper from './components/AuthWrapper';
import Logo from 'components/logo';

const Login = () => (
    <AuthWrapper>
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Stack direction="column" justifyContent="center" alignItems="center" sx={{ mb: { xs: -0.5, sm: 0.5 } }}>
                    <Logo />
                </Stack>
            </Grid>
            <Grid item xs={12}>
                <AuthLogin />
            </Grid>
        </Grid>
    </AuthWrapper>
);

export default Login;
