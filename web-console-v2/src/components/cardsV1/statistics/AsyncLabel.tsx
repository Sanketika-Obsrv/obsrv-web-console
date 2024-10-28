import { Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { fetchMultipleMetrics } from "services/clusterMetrics";
import globalConfig from 'data/initialConfig';
import Loader from "components/Loader";

const AsyncLabel = (props: any) => {

    const { uuid, refresh, query, transformer, suffix = '', prefix = '', ...rest } = props;
    const [label, setLabel] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchMetric = async (query: any) => {
        setLoading(true)
        try {
            const response = await fetchMultipleMetrics(query, { uuid });
            const transformedLabel = (transformer && transformer(response)) || response;
            setLabel(transformedLabel as any);
        } catch (error) { }
        finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (refresh) {
            fetchMetric(query);
        }
    }, [refresh])

    const configureMetricFetcher = (query: any) => {
        const frequency = globalConfig.clusterMenu.frequency;
        fetchMetric(query);
        return setInterval(() => fetchMetric(query), frequency * 1000)
    }

    useEffect(() => {
        const interval = configureMetricFetcher(query);
        return () => interval && clearInterval(interval)
    }, []);

    return <>
        {loading && <Loader />}
        <Typography {...rest} >
            {prefix} {label} {suffix}
        </Typography>
    </>
};

export default AsyncLabel;
