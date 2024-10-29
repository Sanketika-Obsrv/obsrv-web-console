import React from 'react';
import AccordionSection from "components/Accordian/AccordionSection";
import _ from "lodash";
import { useSearchParams } from 'react-router-dom';

import ListRollups from "pages/Rollup/components/ListRollups";
import { DatasetStatus } from "types/datasets";


const DatasetManagement = () => {
    const [params] = useSearchParams();
    const datasetStatus: string = params.get("status") || DatasetStatus.Draft

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
            [DatasetStatus.Live]: draftSections,
            [DatasetStatus.Draft]: draftSections,
            [DatasetStatus.Publish]: draftSections,
            [DatasetStatus.ReadyToPublish]: draftSections
        }
        return _.get(statusToSectionMapping, datasetStatus) || []
    }

    return <AccordionSection sections={datasetSection()}/>
}

export default DatasetManagement;
