/* eslint-disable */
import { Box, Grid, Tab, Tabs } from "@mui/material";
import { useState, cloneElement, useEffect } from "react";
import { useParams } from "react-router";
import _ from 'lodash';
import { DotChartOutlined } from "@ant-design/icons";
import DatasetDetails from "./DatasetsDetails";
import MainCard from "components/MainCard";
import { Typography } from "@mui/material";
import Skeleton from "components/Skeleton";
import { useAlert } from "contexts/AlertContextProvider"
import { datasetRead } from "services/datasetV1";


const DatasetMetrics = () => {
    const [value, setValue] = useState(0);
    const [tabs, setTabs] = useState<Record<string, any>[]>([]);
    const [dataset, setDataset] = useState({ data: null, status: "" });
    const params = useParams();
    const { datasetId } = params;
    const { showAlert } = useAlert();

    const updateTabs = (payload: Record<string, any> | Record<string, any>[]) => {
        const tabs = Array.isArray(payload) ? payload : [payload];
        setTabs((preState: Record<string, any>[]) => {
            return [
                ...preState,
                ...tabs
            ]
        })
    }

    const renderSections = (data: Record<string, any>) => {
        return _.flatten(_.map(data, (value, index) => {
            const { size, charts = [], groups = [], } = value as any;
            const { xs, sm, lg, md } = size;
            const chartsData = (
                <Grid container spacing={2} key={Math.random()} marginBottom={1}>
                    {
                        _.map(charts, (chartMetadata: Record<string, any>, index: number) => {
                            const { title, query: getQuery, chart, render = true, ...rest } = chartMetadata;
                            if (render)
                                return <Grid item xs={xs} sm={sm} md={md} lg={lg} key={`${Math.random()}`} alignItems="stretch">
                                    {chart({ title, query: getQuery(), ...rest })}
                                </Grid>
                            else return null;
                        })
                    }
                </Grid>
            );
            const groupsData = _.map(groups, (group) => {
                const { charts: groupCharts, title } = group;
                return (
                    <Grid container spacing={2} key={Math.random()} alignItems="stretch" marginBottom={1}>
                        <Grid item xs={12}>
                            <Typography variant="h5">{title}</Typography>
                        </Grid>
                        {
                            _.map(groupCharts, (chartMetadata: Record<string, any>, index: number) => {
                                const { title, query: getQuery, chart, render = true, ...rest } = chartMetadata;
                                if (render)
                                    return <Grid item xs={xs} sm={sm} md={md} lg={lg} key={`${Math.random()}`} alignItems="stretch">
                                        {chart({ title, query: getQuery(), ...rest })}
                                    </Grid>
                                else return null;
                            })
                        }
                        <Grid item xs={12}></Grid>
                    </Grid>
                );
            });
            if (_.size(groups) > 0) return groupsData;
            else return chartsData;
        }))
    }


    const fetchDataset = async () => {
        return datasetRead({ datasetId }).then(response => _.get(response, 'data.result'));
    }

    const configureTabs = async () => {
        try {
            const dataset = await fetchDataset();
            setDataset({ data: dataset, status: 'success' });
            updateTabs([
                {
                    id: "dataset",
                    label: "Dataset",
                    icon: DotChartOutlined,
                    component: <DatasetDetails />
                }
            ])
        } catch {
            showAlert("Read Dataset Failed", "error")
            setDataset({ data: null, status: 'failed' });
        } finally {

        }
    }

    useEffect(() => {
        configureTabs();
    }, [])

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    const renderTabHeader = (tab: Record<string, any>, index: number) => {
        const { id, icon, label } = tab;
        return <Tab label={label} id={id} iconPosition="start" aria-controls={`metrics-tabpanel-${index}`} key={index} />
    }

    const renderTabContent = (tab: Record<string, any>, index: number) => {
        const { component } = tab;
        const clonedComponent = cloneElement(component, { datasetId, dataset, renderSections });
        return <div key={index} role="tabpanel" hidden={value !== index} id={`metrics-tabpanel-${index}`} aria-labelledby={`metrics-tab-${index}`}>
            {value === index && (
                <Box sx={{ pt: 3 }}>
                    {clonedComponent}
                </Box>
            )}
        </div>
    }

    const renderTabs = () => {
        const uniqTabs = _.uniqBy(tabs, "id");
        return <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 0 }}>
                <Tabs variant="standard" value={value} onChange={handleChange} aria-label="metrics tabs" sx={{ 'background': '#FFFFFF' }}>
                    {uniqTabs.map(renderTabHeader)}
                </Tabs>
            </Box>
            {uniqTabs.map(renderTabContent)}
        </Box>
    }

    return <>{_.isEmpty(_.get(dataset, "status")) ? <MainCard content={false}><Skeleton type="table" /></MainCard> :
        <MainCard title={`Dataset Metrics (${_.capitalize(_.get(dataset, ["data", "name"])) || ""})`}>
            {renderTabs()}
        </MainCard>
    }

    </>
}


export default DatasetMetrics;