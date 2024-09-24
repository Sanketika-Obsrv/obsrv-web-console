import _ from 'lodash';
import { Favorite, HeartBroken, MonitorHeart } from '@mui/icons-material';
import { Chip } from "@mui/material"
import { useEffect, useState } from "react";
import globalConfig from 'data/initialConfig';
import { fetchChartData, fetchMultipleMetrics } from "services/clusterMetrics";

const Health = (props: any) => {
    const defaults = { color: "success", label: "Loading Health..." }
    const { metadata } = props;
    const { query, transformer } = metadata;
    const [state, setState] = useState<any>(defaults);

    const updateLabel = (transformedLabel: string) => {
        if (Array.isArray(transformedLabel)) {
            const [label, color] = transformedLabel;
            setState({ color, label })
        } else {
            setState({ color: "success", label: transformedLabel });
        }
    }

    const fetchMetric = async () => {
        try {
            const response = await (Array.isArray(query) ? fetchMultipleMetrics(query as any) : fetchChartData(query));
            const transformedLabel = (transformer && transformer(response)) || response;
            updateLabel(transformedLabel);

        } catch (error) { }
    }

    const configureMetricFetcher = () => {
        const frequency = globalConfig.clusterMenu.frequency;
        fetchMetric();
        return setInterval(() => fetchMetric(), frequency * 1000)
    }

    const getIcon = () => {
        const label = _.toLower(_.get(state, 'label'));
        if (!['healthy', 'unhealthy'].includes(label)) return < MonitorHeart />;
        return label === "healthy" ? <Favorite /> : <HeartBroken />
    }

    useEffect(() => {
        setState(defaults);
        const interval = configureMetricFetcher();
        return () => interval && clearInterval(interval)
    }, [query, transformer]);

    return <div onClick={_ => fetchMetric()}>
        <Chip icon={getIcon()} color={_.get(state, 'color')} label={_.get(state, 'label')} />
    </div>
}

export default Health