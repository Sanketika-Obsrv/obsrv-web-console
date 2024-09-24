import * as _ from 'lodash';
import { Button, Grid, Stack, Typography } from '@mui/material';
import { GlobalFilter } from 'utils/react-table';
import { useNavigate } from 'react-router';
import { getSilenceComponent, getSilenced, getStatus, getStatusComponent } from '../services/utils';
import { useState } from 'react';

const AlertTableHeader = (props: any) => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<boolean>(false);
    const [alertStatus, setAlertStatus] = useState<boolean>(true);
    const [silenceStatus, setSilenceStatus] = useState<boolean>(true);
    const { payload, fetchAlerts, alerts, configuration = {} } = props;
    const { preGlobalFilteredRows, setGlobalFilter, state } = payload;

    const renderHeader = () => {
        const alertsCount = _.get(alerts, 'length') || 0;
        const alertsStatusData = getStatus(alerts);
        const silencedAlerts = getSilenced(alerts);

        const removeFilter = async () => {
            await fetchAlerts();
            setFilter(false)
            setAlertStatus(true)
            setSilenceStatus(true)
        }

        const alertStatusProps = {
            statusData: alertsStatusData, setSilenceStatus, fetchDataHandler: fetchAlerts, toggleFilter: setFilter, removeFilter: filter && removeFilter
        }
        const alertSilenceStatusProps = {
            silenceData: silencedAlerts, setAlertStatus, fetchDataHandler: fetchAlerts, toggleFilter: setFilter, removeFilter: filter && removeFilter
        }

        const renderAlertStatus = getStatusComponent(alertStatusProps);
        const renderSilencedAlerts = getSilenceComponent(alertSilenceStatusProps);

        return (
            <Stack direction="row" alignItems="center" spacing={2} padding="0.5rem">
                <Typography>
                    {alertsCount} {alertsCount <= 1 ? 'rule' : 'rules'}
                </Typography>
                {alertStatus && renderAlertStatus()}
                {silenceStatus && renderSilencedAlerts()}
            </Stack>
        );
    };

    const renderFilterForm = () => {
        return (
            <>
                <GlobalFilter
                    preGlobalFilteredRows={preGlobalFilteredRows}
                    globalFilter={state.globalFilter}
                    setGlobalFilter={setGlobalFilter}
                />
                {configuration?.list?.showAddAlertBtn && <Button sx={{ mx: 1 }} variant="contained" onClick={(e) => navigate('/alertRules/add')}>
                    Add Alert Rule
                </Button>}
            </>
        );
    };

    return (
        <Grid container spacing={2} direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'nowrap' }}>
            <Grid item display="flex">
                {renderHeader()}
            </Grid>
            <Grid item alignItems="center" display="flex">
                {renderFilterForm()}
            </Grid>
        </Grid>
    );
};

export default AlertTableHeader;
