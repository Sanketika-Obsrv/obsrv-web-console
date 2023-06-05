import { Link } from 'react-router-dom';
import { Button, Grid, Stack, Typography } from '@mui/material';
import config from 'config';

function Error404() {
  return (
    <>
      <Grid
        container
        spacing={10}
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ minHeight: '100vh', pt: 1.5, pb: 1, overflow: 'hidden' }}
      >
        <Grid item xs={12}>
          <Stack spacing={2} justifyContent="center" alignItems="center">
            <Typography variant="h1">Page Not Found</Typography>
            <Typography color="textSecondary" align="center" sx={{ width: { xs: '73%', sm: '61%' } }}>
              The requested page does not exists.
            </Typography>
            <Button
              component={Link} to={config.defaultPath} variant="contained">
              Back To Home
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </>
  );
}

export default Error404;
