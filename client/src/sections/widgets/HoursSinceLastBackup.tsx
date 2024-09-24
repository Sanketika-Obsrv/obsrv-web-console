import { Grid } from "@mui/material";
import BasicReactTable from "components/BasicReactTable";
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";
import _ from 'lodash';
import chartMeta from '../../data/charts'
import { useEffect, useState } from "react";
import globalConfig from 'data/initialConfig';
import { fetchChartData } from "services/clusterMetrics";
import AlertMessage from "components/AlertMessage";
import { BugFilled } from "@ant-design/icons";
import en from 'utils/locales/en.json'
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from 'dayjs';
dayjs.extend(relativeTime);

const HoursSinceLastBackup = (prop: any) => {
    
    const { refresh } = prop;
    const metric = chartMeta.hoursSinceLastBackup;
    const [backups, setBackups] = useState<any>([]);

    const transform = (input: any) => {
        return _.map(input, payload => ({
            backup: _.get(payload, 'metric.schedule') || _.get(payload, 'metric.__name__'),
            hours: dayjs.unix(_.get(payload, 'value[1]')).fromNow()
        }))
    }

    const fetchMetric = async () => {
        try {
            const hoursSinceLastBackupResponse = await fetchChartData(metric.query as any);
            setBackups(transform(hoursSinceLastBackupResponse))
        } catch (error) { }
    }

    const configureMetricFetcher = () => {
        fetchMetric();
        const frequency = globalConfig.clusterMenu.frequency;
        return setInterval(() => fetchMetric(), frequency * 1000)
    }

    useEffect(() => {
        const interval = configureMetricFetcher();
        return () => interval && clearInterval(interval)
    }, [])

    useEffect(() => {
        fetchMetric()
    }, [refresh])

    const columns: any = [
        {
            Header: () => null,
            accessor: 'backup'
        },
        {
            Header: () => null,
            accessor: 'hours'
        }
    ];

    const renderTable = () => {
        if (!_.get(backups, 'length')) return <AlertMessage color='error' messsage={en["no-information-display-error"]} icon={BugFilled} />;
        return <Grid item xs={12}>
            <MainCard content={false} headerSX={{}}>
                <ScrollX>
                    <BasicReactTable header={false} columns={columns} data={backups} striped={true} />
                </ScrollX>
            </MainCard >
        </Grid>
    }

    return renderTable()

}



export default HoursSinceLastBackup