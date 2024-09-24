import * as _ from 'lodash';
import { Box, Avatar, Tooltip } from '@mui/material';
import IconButton from 'components/@extended/IconButton';
import grafanaIcon from 'assets/images/icons/grafana_icon.svg';
import supersetIcon from 'assets/images/icons/superset_logo.png';
import { useMemo } from 'react';
import edataIds from 'data/telemetry/interact.json'
import { getConfigValue } from 'services/configData';

const MegaMenuSection = () => {

    const navigate = (path: any) => {
        if (path) {
            window.open(path);
        }
    }

    const buttons = useMemo(() => [
        {
            icon: grafanaIcon,
            edataId: "grafana_navigate",
            tooltip: 'Navigate to Grafana Dashboard',
            url: getConfigValue("GRAFANA_URL")
        },
        {
            icon: supersetIcon,
            edataId: "superset_navigate",
            tooltip: 'Navigate to Superset Dashboard',
            url: getConfigValue("SUPERSET_URL")
        }
    ], []);

    return (
        <Box sx={{ flexShrink: 0, ml: 0.75 }}>
            {
                buttons.map((button, index) => {
                    if(!button?.url) return null;
                    return <Tooltip title={button.tooltip} key={index}>
                        <IconButton
                            data-edataid={_.get(edataIds, button.edataId)}
                            color="secondary" variant="light" sx={{ color: 'text.primary', bgcolor: 'transparent', ml: 0.75 }} onClick={_ => navigate(button.url)}>
                            <Avatar sx={{ width: 30, height: 30 }} src={button.icon}></Avatar>
                        </IconButton>

                    </Tooltip>
                })
            }
        </Box>
    );
};

export default MegaMenuSection;
