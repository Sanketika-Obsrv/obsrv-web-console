import AccordionSection from "components/AccordionSection";
import _ from "lodash";
import { useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { error } from "services/toaster";
import { getDatasetState } from "services/dataset";
import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import Skeleton from "components/Skeleton";
import MainCard from "components/MainCard";
import ListRollups from "pages/rollup/components/ListRollups";
import { DatasetStatus } from "types/datasets";
import { fetchDatasetsThunk } from "store/middlewares";
import Loader from "components/Loader";
import ReviewAllCongurations from "pages/dataset/wizard/components/ReviewAllConfigurations";

const DatasetManagement = () => {
    const { datasetId } = useParams();
    const [params] = useSearchParams();
    const dispatch = useDispatch();
    const masterDataset: string = params.get("master") || "false";
    const datasetStatus: string = params.get("status") || DatasetStatus.Draft
    const [dataset, setDataset] = useState({});
    const [loading, setLoading] = useState<boolean>(true)
    const datasetName = _.get(dataset, ["pages", "datasetConfiguration", "state", "config", "name"]) || datasetId
    const datasets: any = useSelector((state: any) => _.get(state, 'dataset.data.data') || []);

    useEffect(() => {
        _.isEmpty(datasets) && dispatch(fetchDatasetsThunk({ data: { filters: { status: [DatasetStatus.Live, DatasetStatus.Retired] } } }));
    }, [])

    const fetchDatasetDetails = async () => {
        setLoading(true)
        try {
            const datasetState: Record<string, any> = await getDatasetState(datasetId!, datasetStatus);
            setDataset(datasetState);
        } catch (err) {
            dispatch(error({ message: 'Dataset does not exists' }));
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDatasetDetails();
    }, [])

    const liveSections = [
        {
            title: <Typography variant="body1" fontWeight={500}>Review - {_.capitalize(datasetName)}</Typography>,
            id: datasetName,
            componentType: 'box',
            component: <ReviewAllCongurations datasetState={dataset} master={masterDataset == "true" ? true : false}/>
        }
    ]

    const draftSections = [
        {
            id: 'rollups',
            title: 'Rollup Datasources',
            component: <ListRollups />,
            componentType: 'box'
        }
    ]

    const datasetSection = () => {
        const statusToSectionMapping = {
            [DatasetStatus.Live]: liveSections,
            [DatasetStatus.Draft]: draftSections,
            [DatasetStatus.Publish]: draftSections,
            [DatasetStatus.ReadyToPublish]: draftSections
        }
        return _.get(statusToSectionMapping, datasetStatus) || []
    }

    return <>
        {loading ? <MainCard content={false}><Skeleton type="table"></Skeleton><Loader /></MainCard>
            : <AccordionSection sections={datasetSection()} />}
    </>
}

export default DatasetManagement;
