import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import _ from 'lodash'
import { useTheme } from '@mui/material/styles';
import useConfig from 'hooks/useConfig';
import ReactApexChart, { Props as ChartProps } from 'react-apexcharts';
import { fetchChartData } from 'services/clusterMetrics';
import globalConfig from 'data/initialConfig';
import { generateDatesBetweenInterval } from 'services/utils';
import Loader from 'components/Loader';

const parseResult = (interval: number, result: any = []) => {
    const resultData = _.map(result, 'data');
    const noData = _.every(resultData, (item) => _.size(item) == 0);
    if (_.size(result) === 0 || _.size(resultData) === 0 || noData) {
        const dateRange = getTimeRange(interval);
        return [[{ name: "No Data", data: dateRange }], true];
    } else {
        return [result, false];
    }
}

function getTimeRange(interval: any) {
    const datesRange = generateDatesBetweenInterval(dayjs(), dayjs().subtract(interval, 'minutes'));
    return _.map(datesRange, date => ([date, 0]));
}

const ApexChart = (props: any) => {
    const { metadata, noDataPreview = false, refresh, ...rest } = props;
    const theme = useTheme();
    const { mode } = useConfig();
    const { type, options: meta, series: chartSeries, query = {}, queries } = metadata;
    const { primary, secondary } = theme.palette.text;
    const line = theme.palette.divider;
    const [options, setOptions] = useState<ChartProps>(meta);
    const [series, setSeries] = useState(chartSeries);
    const { step, interval } = rest;
    const [loading, setLoading] = useState(false);

    const fetchMetric = async () => {
        const interval = rest.interval || globalConfig.clusterMenu.interval;
        const step = rest.step || '5m';
        const { params = {}, noParams = false } = query;
        try {
            setLoading(true);
            if (!noParams) {
                params.start = dayjs().subtract(interval, 'minutes').unix();
                params.end = dayjs().unix();
                if (step) {
                    params.step = step;
                }
            }

            const metadata = props;
            const seriesData: any = await fetchChartData(query, metadata,);
            const [chartData, noData] = parseResult(interval, seriesData);
            setSeries(chartData);
        } catch (error) {
            setSeries([]);
        } finally {
            setLoading(false);
        }
    }

    const configureMetricFetcher = () => {
        const frequency = globalConfig.clusterMenu.frequency;
        fetchMetric();
        return setInterval(() => {
            fetchMetric();
        }, frequency * 1000)
    }

    useEffect(() => {
        const interval = configureMetricFetcher();
        return () => {
            interval && clearInterval(interval)
        }
    }, [interval]);

    useEffect(() => {
        if (refresh) {
            fetchMetric();
        }
    }, [refresh])

    useEffect(() => {
        setOptions((prevState) => ({
            ...prevState,
            tooltip: {
                theme: mode === 'dark' ? 'dark' : 'light'
            }
        }));
    }, [mode, primary, secondary, line, theme]);

    const renderChart = () => {
        return <>
            {loading && <Loader />}
            <ReactApexChart key={Math.random()} options={options} series={series} type={type} {...rest} />
        </>
    }

    return renderChart();
};

export default ApexChart;
