import * as _ from 'lodash';
import { Tabs, Tab, Box, Grid } from '@mui/material';
import { metricsMetadata } from 'data/metrics';
import { useState } from 'react';
import MetricsDetails from './details';
import ClusterStatus from 'sections/widgets/Cluster';

function Panel(props: any) {
    const { children, value, index, id, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`metrics-tabpanel-${index}`} aria-labelledby={`metrics-tab-${index}`} {...other}>
            {value === index && (
                <Box sx={{ pt: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const MetricsPanel = () => {

    const [value, setValue] = useState(0);
    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    const renderTabHeader = (metric: any, index: any) => {
        const { menuIcon, id, primaryLabel, rotate } = metric;
        const MenuIcon = menuIcon
        return <Tab
            data-edataid={`home:metrics:tabs:${primaryLabel.toLowerCase()}`}
            label={primaryLabel} id={id} icon={<MenuIcon rotate={rotate} />} iconPosition="start" aria-controls={`metrics-tabpanel-${index}`} key={index} />
    }

    const renderTabContent = (metric: any, index: any) => {
        const { id } = metric;
        return <Panel value={value} index={index} id={id} key={index}>
            <MetricsDetails id={id} showClusterPanel={true}></ MetricsDetails>
        </Panel>
    }

    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <ClusterStatus />
                </Grid>
                <Grid item xs={12} id="tabSectionStart">
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ }}>
                            <Tabs
                                variant="fullWidth" value={value} onChange={handleChange} aria-label="metrics tabs" sx={{'background': '#FFFFFF', padding: 1}}>
                                {metricsMetadata.map(renderTabHeader)}
                            </Tabs>
                        </Box>
                        {metricsMetadata.map(renderTabContent)}
                    </Box>
                </Grid>

            </Grid>
        </>
    )
};

export default MetricsPanel;
