import { Box, Stack, Typography, Paper, Tooltip, Grid } from '@mui/material';
import MainCard from 'components/MainCard';
import { ReloadOutlined } from '@ant-design/icons';
import globalConfig from 'data/initialConfig';
import React, { useState } from 'react';
import _ from 'lodash';

const AnalyticsDataCard = (props: any) => {
    const { uuid, title, tasks = [], children, description = '' } = props;
    const [refresh, setRefresh] = useState(0);

    const renderTask = (task: any) => {
        return <Grid item xs={12} textAlign="center" alignSelf="flex-end" mb={1}>
            {React.cloneElement(task, { uuid, refresh })}
        </Grid>
    }

    return <Paper elevation={globalConfig.elevation} sx={{ height: '100%', position: 'relative' }}>
        <Tooltip title={description}>
            <MainCard content={false} style={{ height: '100%' }}>
                <Box p={2.25} height="100%">
                    <Stack spacing={0.5} height="100%">
                        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2}>
                            <Tooltip title={'Refresh'}>
                                <ReloadOutlined onClick={_ => setRefresh(pre => pre + 1)} />
                            </Tooltip>
                        </Stack>
                        <Typography align='center' variant="h5" mb={2}>
                            {title}
                        </Typography>
                        <Grid container height="100%">
                            {_.map(tasks, renderTask)}
                        </Grid>
                        {children}
                    </Stack>
                </Box>
            </MainCard>
        </Tooltip>
    </Paper>
};

export default AnalyticsDataCard;
