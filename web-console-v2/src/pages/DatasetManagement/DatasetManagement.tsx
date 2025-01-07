import React from "react";
import AccordionSection from "components/Accordian/AccordionSection";
import _ from "lodash";
import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { DatasetStatus } from "types/datasets";
import Loader from "components/Loader";
import ReviewAllCongurations from "pages/datasetView";
import { useAlert } from "contexts/AlertContextProvider";
import { getDatasetState } from "services/datasetV1";
import { NotFound } from "pages/NotFound/NotFound";

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
            if (datasetStatus === DatasetStatus.Live) {
                const datasetState: Record<string, any> = await getDatasetState(datasetId!, datasetStatus);
                setDataset(datasetState);
            }
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
            id: datasetName,
            component: <ReviewAllCongurations datasetState={dataset} master={masterDataset == "true" ? true : false} datasetName={datasetName} />
        }
    ]

    const draftSections = [
        {
            id: 'rollups',
            title: 'Rollup Datasources',
            component: <NotFound />,
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
        {loading ? <Loader loading={loading} /> : <Box sx={{ padding: '2rem' }}><AccordionSection sections={datasetSection()} /></Box>}
    </>
}

export default DatasetManagement;