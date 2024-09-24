import { Card, Stack, Typography, Breadcrumbs, } from '@mui/material';
import chartMeta from '../../data/charts'
import ApexChart from 'sections/dashboard/analytics/apex';
import ClusterMetrics from './ClusterMetrics';
import globalConfig from 'data/initialConfig'
import ClusterNodes from './ClusterNodes';

const ClusterStatus = () => {
    return (
        <Stack spacing={0}>
            <Stack direction={{ lg: "row", md: "row", sm: "row", xs: "column" }} justifyContent="flex-start" alignItems="stretch" gap={1.5} sx={{ position: 'relative', zIndex: 5 }}>
                <Card elevation={2} sx={{ width: '100%', p: 1 }}>
                    <Stack direction="row" spacing={0} justifyContent="space-between" alignItems="center" width="100%" height="100%">
                        <ClusterNodes sx={{ maxWidth: 160 }} />
                        <ClusterMetrics />
                    </Stack>
                </Card>
                <Card elevation={2} sx={{ width: '100%', p: 1 }}>
                    <ApexChart metadata={chartMeta.node_cpu} step="30s" />
                </Card>
                <Card elevation={2} sx={{ width: '100%', p: 1 }}>
                    <ApexChart metadata={chartMeta.node_memory} step="30s" />
                </Card>
            </Stack>
            <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} mt={2}>
                <Breadcrumbs aria-label="breadcrumb">
                    <Typography variant="body3">Interval: {globalConfig.clusterMenu.interval} Min</Typography>
                    <Typography variant="body3">Frequency: {globalConfig.clusterMenu.frequency} Sec</Typography>
                </Breadcrumbs>
            </Stack>
        </Stack>
    );
};

export default ClusterStatus;
