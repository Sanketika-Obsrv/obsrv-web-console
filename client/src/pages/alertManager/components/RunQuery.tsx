import { Grid, Stack } from "@mui/material";
import _ from 'lodash';
import dayjs from 'dayjs';
import endpoints from 'data/apiEndpoints';
import ApexChart from "sections/dashboard/analytics/apex";
import MainCard from "components/MainCard";
import { Button } from "@mui/material";
import { CloseOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import Loader from "components/Loader";

const RunQuery = (props: any) => {
    const { handleClose, queryBuilderContext } = props;
    const { metric, threshold, threshold_from, threshold_to, operator } = queryBuilderContext
    const [metadata, setMetadata] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(false)

    const getFirstRangeAnnotation = () => {
        let y1, y2;

        switch (operator) {
            case 'gt': {
                y1 = +threshold;
                y2 = +threshold * 100;
                break;
            }
            case 'lt': {
                y2 = +threshold;
                y1 = 0;
                break;
            }
            case 'within_range': {
                y1 = +threshold_from;
                y2 = +threshold_to;
                break;
            }
            case 'outside_range': {
                y1 = 0;
                y2 = threshold_from;
                break;
            }
            default:
                return
        }

        return {
            y: y1,
            y2: y2,
            fillColor: '#8AFF8A',
            opacity: 0.2
        }
    }

    const getSecondRangeAnnotations = () => {
        let y1, y2;

        switch (operator) {
            case 'outside_range': {
                y1 = +threshold_to;
                y2 = +threshold_to * 100;
                break;
            }
            default:
                return
        }
        return {
            y: y1,
            y2: y2,
            fillColor: '#8AFF8A',
            opacity: 0.2
        }
    }

    const getChartQuery = () => {
        const y_axis_value = _.includes(["within_range", "outside_range"], operator) ? [threshold_from, threshold_to] : threshold
        return {
            type: 'line',
            series: [],
            options: {
                chart: {
                    type: 'line',
                    toolbar: {
                        show: false
                    }
                },
                annotations: {
                    yaxis: [
                        {
                            y: +threshold,
                            borderColor: '#FF0000',
                            strokeDashArray: 0,
                            label: {
                                borderColor: '#FF0000',
                                style: {
                                    color: 'white',
                                    background: '#FF0000',
                                    padding: {
                                        left: 2,
                                        right: 2,
                                        top: 2,
                                        bottom: 2,
                                    }
                                },
                                text: `Threshold value at ${y_axis_value}`
                            }
                        },
                        getFirstRangeAnnotation(),
                        getSecondRangeAnnotations()
                    ]
                },
                xaxis: {
                    type: 'datetime',
                    labels: {
                        formatter: function (value: any, timestamp: any) {
                            const givenTimestamp = dayjs.unix(timestamp);
                            return givenTimestamp.format('DD MMM HH:mm');
                        }
                    },
                    title: {
                        text: "Time"
                    }
                },
                yaxis: {
                    labels: {
                        formatter: function (value: any) {
                            if (typeof value === 'number') {
                                return _.round(value, 1)
                            }
                            return value;
                        }
                    }
                }
            },
            query: {
                id: 'apiResponseTimeTimeseries',
                type: 'api',
                url: endpoints.prometheusReadRange,
                method: 'GET',
                headers: {},
                body: {},
                params: {
                    query: metric,
                    step: '5m',
                    start: dayjs().unix(),
                    end: dayjs().subtract(1, 'day').unix()
                },
                parse: (response: any) => {
                    const result = _.get(response, 'data.result');
                    return _.map(result, payload => {
                        const metric = _.get(payload, 'metric');
                        return {
                            name: JSON.stringify(metric) || "Unknown",
                            data: _.get(payload, 'values')
                        }
                    })
                },
                error() {
                    return [];
                }
            }
        }
    }

    const fetchMetadata = async () => {
        setLoading(true)
        const metadata = await getChartQuery();
        setMetadata(metadata);
        setLoading(false)
    }

    useEffect(() => {
        fetchMetadata();
    }, [metric, operator, threshold, threshold_from, threshold_to]);

    const renderPrimaryTitle = () => <>Query</>

    const renderSecondaryTitle = () => {
        if (!handleClose) return null;
        return <>
            <Stack direction={'row'} spacing={2}>
                <Button startIcon={<CloseOutlined />} variant="contained" onClick={_ => handleClose(false)}>
                    Close
                </Button>
            </Stack>
        </>
    }

    const renderChart = () => {
        if (loading) return <Loader />
        if (!metadata) return null;
        let refresh = false;

        setTimeout(() => {
            refresh = true;
        })

        return <Grid item key={Math.random()} overflow="hidden">
            <ApexChart key={Math.random()} refresh={refresh} height="300" metadata={metadata} interval={1440}></ApexChart>
        </Grid>
    }

    return <>
        <Grid container direction={'column'} spacing={2}>
            {renderChart()}
        </Grid>
    </>
}

export default RunQuery;