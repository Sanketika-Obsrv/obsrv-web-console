import { Box, Paper, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import ReactApexChart, { Props as ChartProps } from 'react-apexcharts';
import globalConfig from '../../../data/initialConfigs';
import dayjs from 'dayjs';
import _ from 'lodash';
import { generateDatesBetweenInterval } from '../../../services/utils';
import { fetchMetricData } from 'services/chartMetrics';
import styles from "./AnalyticsCard.module.css"
import Loader from 'components/Loader';

const parseResult = (interval: number, result: any = []) => {
  const resultData = _.map(result, 'data');
  const noData = _.every(resultData, (item) => _.size(item) === 0);
  if (_.size(result) === 0 || _.size(resultData) === 0 || noData) {
    const dateRange = getTimeRange(interval);
    return [[{ name: 'No Data', data: dateRange }], 0];
  } else {
    return [result, false];
  }
};

function getTimeRange(interval: any) {
  const datesRange = generateDatesBetweenInterval(
    dayjs(),
    dayjs().subtract(interval, 'minutes'),
  );
  return _.map(datesRange, (date) => [date, 0]);
}

const AnalyticsCard = (props: any) => {
  const { metaData, refresh, ...rest } = props;

  const { options: meta, series: chartSeries, query = {} } = metaData;

  const { step, interval } = rest;

  const [options, setOptions] = useState<ChartProps>(meta);
  const [series, setSeries] = useState([
    {
      data: [],
    },
  ]);
  const [loading, setLoading] = useState(true);

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

      const seriesData: any = await fetchMetricData(query, metadata);
      const [chartData, noData] = parseResult(interval, seriesData);
      setSeries(chartData);
    } catch (error) {
      setSeries([]);
    }
    finally{
      setLoading(false)
    }
  };

  const configureMetricFetcher = () => {
    const frequency = globalConfig.clusterMenu.frequency;
    fetchMetric();
    return setInterval(() => {
      fetchMetric();
    }, frequency * 1000);
  };

  useEffect(() => {
    const interval = configureMetricFetcher();
    return () => {
      interval && clearInterval(interval);
    };
  }, [interval]);

  useEffect(() => {
    fetchMetric();
  }, []);

  useEffect(() => {
    setOptions((prevState: any) => ({
      ...prevState,
      xaxis: {
        ...prevState.xaxis,
        type: 'datetime',
        tickAmount: 4,
        labels: {
          formatter: function (value: any, timestamp: any) {
            return dayjs.unix(timestamp).format('HH:mm');
          },
        },
      },
    }));
  }, []);

  return (
    <Paper elevation={0} className={styles.mainCard}>
     {loading ? <Loader loading ={loading}/> :  <Box >
        <Typography
          variant="bodyBold"
          className={styles.title}
        >
          {rest.title}
        </Typography>
        <div>
          <ReactApexChart
            options={options}
            series={series}
            height={200}
            {...rest}
          />
        </div>

        <Typography className={styles.frequency}>
          Interval:{' '}
          {rest.interval ? rest.interval : globalConfig.clusterMenu.interval}min
          / Frequency: {globalConfig.clusterMenu.frequency} sec
        </Typography>
      </Box>}
    </Paper>
  );
};

export default AnalyticsCard;
