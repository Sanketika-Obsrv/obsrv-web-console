import { Grid, LinearProgress, Typography } from '@mui/material';
import MainCard from 'components/MainCard';
import { useEffect, useMemo, useState } from 'react';
import globalConfig from 'data/initialConfig'
import { fetchChartData } from 'services/clusterMetrics';
import chartMeta from '../../data/charts'
import * as _ from 'lodash';

const ClusterMetrics = () => {

    const metricsMetadata = useMemo(() => [
        {
            label: 'CPU Usage',
            metadata: chartMeta.cpu_percentage,
            value: 0,
            colors: {
                "primary": [0, 79],
                "warning": [80, 90],
                "error": [91, 100],
            }
        },
        {
            label: 'Memory Usage',
            metadata: chartMeta.memory_percentage,
            value: 0,
            colors: {
                "primary": [0, 79],
                "warning": [80, 90],
                "error": [91, 100],
            }
        },
        {
            label: 'Disk Usage',
            metadata: chartMeta.pv_usage_percent,
            value: 0,
            colors: {
                "primary": [0, 59],
                "warning": [60, 79],
                "error": [80, 100],
            }
        }
    ], [])

    const [metrics, setMetrics] = useState(metricsMetadata)

    const getColor = (metric: Record<string, any>, value: number) => {
        if (value === 0) return "error";
        const { colors } = metric;
        const color = _.findKey(colors, (range) => {
            const [start, end] = range;
            if (value >= start && value <= end) return true;
            return false;
        })

        return color || "primary"
    }

    const fetchMetrics = async () => {
        try {
            const updatedMetrics = await Promise.all(_.map(metrics, metric => fetchChartData(metric.metadata.query as any).then((value: any) => ({ ...metric, value }))));
            setMetrics(updatedMetrics);
        } catch (error) {
            setMetrics(metricsMetadata);
        }
    }

    useEffect(() => {
        const { frequency } = globalConfig.clusterMenu;
        fetchMetrics();
        const interval = setInterval(() => {
            fetchMetrics();
        }, frequency * 1000)

        return () => clearInterval(interval);
    }, [])

    return <>
        <MainCard style={{ 'background': 'inherit', 'border': 'unset' }} title="" contentSX={{ px: 2, }} >
            <Grid container spacing={3}>
                {metrics.map(metric => {
                    const { label, value = 0 } = metric;
                    return <Grid item xs={12} key={Math.random()}>
                        <Grid container alignItems="center" spacing={1}>
                            <Grid item sm zeroMinWidth>
                                <Typography variant="h6">{label}</Typography>
                            </Grid>
                            <Grid item>
                                <Typography variant="h6" align="right">
                                    {value}%
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <LinearProgress variant="determinate" value={value} color={getColor(metric, value) as any} />
                            </Grid>
                        </Grid>
                    </Grid>
                })}
            </Grid>
        </MainCard>
    </>
};

export default ClusterMetrics;
