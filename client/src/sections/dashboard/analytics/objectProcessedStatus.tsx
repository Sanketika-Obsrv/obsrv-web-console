import { ApexOptions } from "apexcharts";
import _ from "lodash";
import { useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import dayjs from 'dayjs';

const ObjectsProcessedStatus = (props: any) => {
    const { objectsDiscovered, objectsProcessed, objectsFailed, filters, ...rest } = props;
    const { interval } = rest;
    const startDate = dayjs().unix();
    let endDate = dayjs().subtract(interval, 'minutes').unix();

    const options: ApexOptions = {
        chart: {
            toolbar: {
                show: false
            }
        },
        labels: ['Processed', 'Discovered', 'Failed'],
        dataLabels: {
            enabled: true,
        }
    };

    useEffect(() => {
        endDate = dayjs().subtract(interval, 'minutes').unix();
    }, [interval])

    const series = [
        objectsProcessed.filter((object: any) => dayjs(object.end_processing_time).isBetween(dayjs.unix(endDate), dayjs.unix(startDate))).length,
        objectsDiscovered.filter((object: any) => dayjs(object.end_processing_time).isBetween(dayjs.unix(endDate), dayjs.unix(startDate))).length,
        objectsFailed.filter((object: any) => dayjs(object.end_processing_time).isBetween(dayjs.unix(endDate), dayjs.unix(startDate))).length
    ]

    return <>
        <ReactApexChart options={options} series={series} type="pie" />
    </>
}

export default ObjectsProcessedStatus;