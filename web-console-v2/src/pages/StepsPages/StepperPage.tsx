import React, { useEffect, useState } from 'react';
import DynamicStepper from 'components/Stepper/DynamicStepper';
import { Outlet, useParams } from 'react-router-dom';
import {v4 as uuidv4} from 'uuid';
import _ from 'lodash';
import { Box } from '@mui/material';
import { useFetchDatasetsById } from 'services/dataset';

const stepData = {
    steps: [
        {
            name: 'Connector',
            index: 1,
            completed: false,
            skipped: false,
            active: false,
            route: 'connector'
        },
        {
            name: 'Ingestion',
            index: 2,
            completed: false,
            skipped: false,
            active: false,
            route: 'ingestion'
        },
        {
            name: 'Processing',
            index: 3,
            completed: false,
            skipped: false,
            active: false,
            route: 'processing'
        },
        {
            name: 'Storage',
            index: 4,
            completed: false,
            skipped: false,
            active: false,
            route: 'storage'
        },
        {
            name: 'Preview & Save',
            index: 5,
            completed: false,
            skipped: false,
            active: false,
            route: 'preview'
        }
    ],
    initialSelectedStep: 1
};

const StepperPage = () => {

    const {datasetId}:any = useParams();
    const [steps, setSteps] = useState<any>(stepData.steps);
    const [stateId, setStateId] = useState<any>(uuidv4());

    const dataset = useFetchDatasetsById({datasetId, queryParams:'status=Draft&mode=edit&fields=dataset_id,connectors_config,validation_config,dataset_config,type,version_key'});

    useEffect(() => {
        if(!dataset.data) {
            return;
        }
        const newSteps = []
        const validationConfig = _.get(dataset.data, 'validation_config', {});
        const connectorData = _.get(dataset.data, ['connectors_config'], []);
        const storageKeys = _.get(dataset.data, ['dataset_config', 'keys_config'], {});
        const storageType = _.get(dataset.data, ['dataset_config', 'indexing_config'], {});
        newSteps.push(connectorData.length > 0 ? {
            name: 'Connector',
            index: 1,
            completed: false,
            skipped: true,
            active: false,
            route: 'connector'
        } : {
            name: 'Connector',
            index: 1,
            completed: true,
            skipped: false,
            active: false,
            route: 'connector'
        });
        newSteps.push({
            name: 'Ingestion',
            index: 2,
            completed: true,
            skipped: false,
            active: false,
            route: 'ingestion'
        });
        newSteps.push(validationConfig.mode && !_.isEmpty(validationConfig.mode) ? {
            name: 'Processing',
            index: 3,
            completed: true,
            skipped: false,
            active: false,
            route: 'processing'
        } : {
            name: 'Processing',
            index: 3,
            completed: false,
            skipped: false,
            active: false,
            route: 'processing'
        });
        if(storageType['olap_store_enabled'] && _.isEmpty(storageKeys['timestamp_key'])) {
            newSteps.push({
                name: 'Storage',
                index: 4,
                completed: false,
                skipped: false,
                active: false,
                route: 'storage'
            });
        } else if(storageType['lakehouse_enabled'] && _.isEmpty(storageKeys['data_key']) && _.isEmpty(storageKeys['partition_key'])) {
            newSteps.push({
                name: 'Storage',
                index: 4,
                completed: false,
                skipped: false,
                active: false,
                route: 'storage'
            });
        } else if(storageType['cache_enabled'] && _.isEmpty(storageKeys['data_key'])) {
            newSteps.push({
                name: 'Storage',
                index: 4,
                completed: false,
                skipped: false,
                active: false,
                route: 'storage'
            });
        } else {
            newSteps.push({
                name: 'Storage',
                index: 4,
                completed: true,
                skipped: false,
                active: false,
                route: 'storage'
            });
        }

        newSteps.push({
            name: 'Preview & Save',
            index: 5,
            completed: false,
            skipped: false,
            active: false,
            route: 'preview'
        });
        setSteps(newSteps);
        setStateId(uuidv4())

    }, [dataset.data])

    return (
        
        <Box>
            <DynamicStepper
                steps={steps}
                initialSelectedStep={stepData.initialSelectedStep}
                key={stateId}
            />
            <Box sx={{ pt: 7 }}>
                <Outlet />
            </Box>

        </Box>
        
    );
};

export default StepperPage;