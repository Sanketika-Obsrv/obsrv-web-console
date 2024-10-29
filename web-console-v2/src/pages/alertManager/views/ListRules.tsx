import * as _ from 'lodash';
import { useEffect, useState } from 'react';
import { Grid } from '@mui/material';
import { searchAlert } from 'services/alerts';
import ListAlerts from '../components/ListAlerts';
import Loader from 'components/Loader';

const ManagedAlerts = (props: any) => {
    const { configuration } = props;
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
            showAlert('Something went wrong', 'error');
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
                        <Loader loading={true} />
                    </Grid>
                    : renderAlerts()
                }
            </Grid>
        </>
    );
};

export default ManagedAlerts;
function showAlert(arg0: string, arg1: string) {
    throw new Error('Function not implemented.');
}

