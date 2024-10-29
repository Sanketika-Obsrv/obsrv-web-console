import { Button, Grid, Stack, Typography } from '@mui/material';
import _ from 'lodash';
import { getStatusComponent, getStatus } from 'pages/alertManager/services/utils';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GlobalFilter } from 'utils/react-table';

const NotificationChannelsHeader = (props: any) => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<boolean>(false);
    const { payload, channels, getAllChannels } = props;
    const { preGlobalFilteredRows, setGlobalFilter, state } = payload;

    const renderTitle = () => {
        const channelCount = _.get(channels, 'length') || 0;
        const channelStatusData = getStatus(channels);

        const removeFilter = async () => {
            await getAllChannels();
            setFilter(false)
        }
        const channelStatusProps = { statusData: channelStatusData, fetchDataHandler: getAllChannels, toggleFilter: setFilter, removeFilter: filter && removeFilter }
        const renderChannelStatus = getStatusComponent(channelStatusProps);

        return (
            <Stack direction="column">
                <Typography variant="h5" mr={1}>
                    Notification Channels
                </Typography>
                <Stack direction="row" alignItems="center" spacing={2} marginTop="0.8rem">
                    <Typography>
                        {channelCount} {channelCount <= 1 ? 'channel' : 'channels'}
                    </Typography>
                    {renderChannelStatus()}
                </Stack>
            </Stack>
        );
    };

    const renderFilterField = () => {
        return (
            <>
                <GlobalFilter
                    preGlobalFilteredRows={preGlobalFilteredRows}
                    globalFilter={state.globalFilter}
                    setGlobalFilter={setGlobalFilter}
                />
                <Button sx={{ mx: 1 }} variant="contained" onClick={(e) => navigate('/alertChannels/new')}>
                    Add Channel
                </Button>
            </>
        );
    };

    return (
        <>
            <Grid>
                <Grid container spacing={2} direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'nowrap' }}>
                    <Grid item display="flex" margin="0.5rem">
                        {renderTitle()}
                    </Grid>
                    <Grid item alignItems="center" display="flex">
                        {renderFilterField()}
                    </Grid>
                </Grid>
            </Grid>
        </>
    );
};

export default NotificationChannelsHeader;
