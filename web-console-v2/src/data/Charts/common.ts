import dayjs from 'dayjs';

export default {
  defaultChartConfigurations: {
    zoom: { enabled: false },
    selection: { enabled: false },
  },
  animations: {
    enabled: true,
    easing: 'linear',
    speed: 500,
    animateGradually: {
      enabled: true,
      delay: 3000,
    },
    dynamicAnimation: {
      enabled: true,
      speed: 3000,
    },
  },
  grid: {
    show: true,
    row: {
      Height: 3000,
    },
    xaxis: {
      lines: {
        show: true,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
  },
  timestampLabelFormatter(timestamp: any) {
    const givenTimestamp = dayjs.unix(timestamp);
    return givenTimestamp.format('DD MMM HH:mm');
  },
  timestampLabelFormatterv2(timestamp: any) {
    const givenTimestamp = dayjs(timestamp);
    return givenTimestamp.format('DD MMM HH:mm');
  },
};
