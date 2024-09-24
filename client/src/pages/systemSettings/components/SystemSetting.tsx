import _ from 'lodash';
import { CardContent, Grid, InputLabel, TextField, FormHelperText } from '@mui/material';
import MainCard from 'components/MainCard';

const SystemSetting = (props: any) => {
  const { settings = [] } = props;

  const renderSetting = (setting: Record<string, any>) => {
    const { key, value, description = '' } = setting;
    return <>
      <Grid item xs={12} sm={3} lg={4} sx={{ pt: { xs: 2, sm: '0 !important' } }}>
        <InputLabel sx={{ textAlign: { xs: 'left', sm: 'right' } }}>{key} :</InputLabel>
      </Grid>
      <Grid item xs={12} sm={9} lg={6}>
        <TextField value={value} fullWidth placeholder="Enter the Setting Value" />
        <FormHelperText>{description}</FormHelperText>
      </Grid>
    </>
  }

  return <>
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <MainCard content={false} >
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12}>
                <Grid container spacing={2} alignItems="center">
                  {_.map(settings, renderSetting)}
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </MainCard>
      </Grid>
    </Grid>
  </>
}

export default SystemSetting