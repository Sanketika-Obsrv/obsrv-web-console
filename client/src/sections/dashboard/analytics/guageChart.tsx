import { useEffect, useState } from 'react';
import Chart from 'react-gauge-chart'
import { v4 } from 'uuid'
import globalConfig from 'data/initialConfig';
import { fetchChartData } from 'services/clusterMetrics';

const GaugeChart = (props: any) => {
    const { uuid, refresh, textColor = 'black', nrOfLevels = 100, arcsLength = [80, 10, 10], colors = ['#5BE12C', '#F5CD19', '#EA4228'], percentage = 0, query = {}, className = '', ...rest } = props
    const [percent, setPercent] = useState(0);

    const fetchMetrics = async () => {
        try {
            const percent = await fetchChartData(query as any, { uuid });
            setPercent((percent as any) * 0.01);
        } catch (error) { }
    }

    useEffect(() => {
        if (refresh) {
            fetchMetrics();
        }
    }, [refresh])

    const configureMetricFetcher = () => {
        const frequency = globalConfig.clusterMenu.frequency;
        fetchMetrics();
        return setInterval(() => {
            fetchMetrics();
        }, frequency * 1000)
    }

    useEffect(() => {
        let interval: NodeJS.Timer;
        if (!percentage) {
            interval = configureMetricFetcher();
        }

        return () => {
            interval && clearInterval(interval);
        }
    }, [])

    return <>
        <Chart 
            id={v4()}
            nrOfLevels={nrOfLevels}
            arcsLength={arcsLength}
            colors={colors}
            percent={percentage || percent}
            textColor={textColor}
            className={className}
            needleColor={'#6a727a'}
        />
    </>
}

export default GaugeChart
