import React from "react";
import AccordionSection from "components/Accordian/AccordionSection";
import _ from "lodash";
import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import { DatasetStatus } from "types/datasets";
import Loader from "components/Loader";
import ReviewAllCongurations from "pages/datasetV1/ReviewAllConfigurations";
import { useAlert } from "contexts/AlertContextProvider";
import { getDatasetState } from "services/datasetV1";

const DatasetManagement = () => {
    const { datasetId } = useParams();
    const [params] = useSearchParams();
    const masterDataset: string = params.get("master") || "false";
    const datasetStatus: string = params.get("status") || DatasetStatus.Draft
    const [dataset, setDataset] = useState({});
    const [loading, setLoading] = useState<boolean>(true)
    const datasetName = _.get(dataset, ["pages", "datasetConfiguration", "state", "config", "name"]) || datasetId
    const { showAlert } = useAlert();

    const fetchDatasetDetails = async () => {
        setLoading(true)
        try {
            const datasetState: Record<string, any> = await getDatasetState(datasetId!, datasetStatus);
            setDataset(datasetState);
        } catch (err) {
            showAlert("Dataset does not exists", "error")
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
            component: <ReviewAllCongurations datasetState={dataset} master={masterDataset == "true" ? true : false} />
        }
    ]

    const draftSections = [
        {
            id: 'rollups',
            title: 'Rollup Datasources',
            component: <></>,
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
        {loading ? <Loader loading={loading} /> : <AccordionSection sections={datasetSection()} />}
    </>
}

export default DatasetManagement;
