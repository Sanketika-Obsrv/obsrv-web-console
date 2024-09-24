import { useEffect } from 'react';
import MetricsTabs from '../metrics'
import { useDispatch } from 'react-redux';
import { fetchAlertsThunk } from 'store/middlewares';
import useImpression from 'hooks/useImpression';
import pageIds from 'data/telemetry/pageIds'

const HomePage = () => {
    useImpression({ type: "home", pageid: pageIds.home.home })
    const dispatch = useDispatch();
    const fetchAlerts = () => dispatch(fetchAlertsThunk({}));

    useEffect(() => {
        fetchAlerts();
    }, []);

    return <MetricsTabs />
};

export default HomePage;