import * as _ from 'lodash';
import { Grid, Tooltip, useTheme } from '@mui/material';
import MetricsCard from 'components/cards/statistics/BigNumber';
import { metricsMetadata } from 'data/metrics'
import { useNavigate } from 'react-router';

const MetricsDashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const navigateToMetrics = (metric: Record<string, any>) => navigate(`/metrics/details/${metric?.id}`);

    return (
        <>
            <Grid container rowSpacing={2} columnSpacing={2}>
                {metricsMetadata.map((metric, index) => {
                    const { icon, color, primaryLabel, secondaryLabel, description } = metric;
                    return <>
                        <Tooltip title={description}>
                            <Grid key={index} item xs={12} sm={6} md={4} lg={4}>
                                <MetricsCard onClick={(e: any) => navigateToMetrics(metric)} primary={secondaryLabel} secondary={primaryLabel} iconPrimary={icon} color={_.get(theme, ['palette', 'primary', color])} />
                            </Grid>
                        </Tooltip>
                    </>
                })}
            </Grid>
        </>
    )
};

export default MetricsDashboard;
