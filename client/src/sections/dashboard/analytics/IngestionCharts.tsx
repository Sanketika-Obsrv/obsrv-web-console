import { useEffect, useState } from "react";
import { fetchDatasets } from "services/dataset";
import ApexWithFilters from "./ChartFilters";
import * as _ from 'lodash';
import filters from 'data/chartFilters';
import chartMeta from 'data/charts';
import ApexChart from "./apex";
import { Grid } from "@mui/material";
import { v4 } from "uuid";
import Loader from "components/Loader";
import { DatasetStatus, DatasetType } from "types/datasets";

const IngestionCharts = (props: any) => {
    const { chartName, title, size = { xs: 12, sm: 6, lg: 6, md: 6 }, master = false } = props;
    const { xs, sm, md, lg } = size;
    const [charts, setCharts] = useState<any>(null);

    const getLiveDatasets = async () => {
        const type = master ? DatasetType.MasterDataset : DatasetType.Dataset;
        try {
            return fetchDatasets({ data: { filters: { type: type, status: [DatasetStatus.Live] } } });
        } catch (error) {
            return []
        }
    }

    const getMetadata = (dataset: Record<string, any>) => {
        const id = _.get(dataset, 'dataset_id');
        const metadata = _.cloneDeep(_.get(chartMeta, [chartName]));
        const url = _.get(metadata, 'query.url');
        _.set(metadata, 'query.body.query.filter.fields[1].value', id);
        _.set(metadata, 'query.url', `${url}/${id}`);
        return [id, metadata];
    }

    const render = async () => {
        const liveDatasetsRecords = await getLiveDatasets();
        const liveDatasets = _.get(liveDatasetsRecords, "data")
        const chartMetadata = _.map(liveDatasets, getMetadata);
        setCharts(chartMetadata);
    }

    const renderChart = (payload: any) => {
        const [id, metadata] = payload;
        return (
            <Grid item xs={xs} sm={sm} md={md} lg={lg} key={v4()}>
                <ApexWithFilters uuid={id} title={`${title}- (${id})`} filters={_.get(filters, 'default')}>
                    <ApexChart metadata={metadata} interval={1440} />
                </ApexWithFilters>
            </Grid>
        );
    }

    useEffect(() => {
        render();
    }, [])

    return <>
        {!charts && <Loader />}
        {charts && _.map(charts, renderChart)}
    </>
}


export default IngestionCharts;
