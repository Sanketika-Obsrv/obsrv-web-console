import * as _ from 'lodash';
import { useEffect, useState } from 'react';
import { error } from 'services/toaster';
import { Grid } from '@mui/material';
import { searchAlert } from 'services/alerts';
import { useDispatch } from 'react-redux';
import ListAlerts from '../components/ListAlerts';
import MainCard from 'components/MainCard';
import { renderSkeleton } from 'services/skeleton';

const ManagedAlerts = (props: any) => {
    const { configuration } = props;
    const dispatch = useDispatch();
    const [alerts, setAlert] = useState<any>([]);
    const [loading, setLoading] = useState(false);

    const fetchAlerts = async (config?: any) => {
        try {
            const requestConfig = configuration.searchQuery;
            const response = await searchAlert({ config: requestConfig })
            const { alerts } = response;
            const modifiedAlerts = _.filter(alerts, config);
            setAlert(modifiedAlerts);
        } catch {
            dispatch(error({ message: 'Something went wrong' }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchAlerts();
    }, []);

    const renderAlerts = () => {
        return <Grid item xs={12}>
            <ListAlerts alerts={alerts} fetchAlerts={fetchAlerts} configuration={configuration} />
        </Grid>
    };

    return (
        <>
            <Grid container spacing={3}>
                {loading ?
                    <Grid item xs={12}>
                        <MainCard content={false}>{renderSkeleton({ config: { type: 'table', loader: false, width: "100%", totallines: 6 } })}</MainCard>
                    </Grid>
                    : renderAlerts()
                }
            </Grid>
        </>
    );
};

export default ManagedAlerts;
