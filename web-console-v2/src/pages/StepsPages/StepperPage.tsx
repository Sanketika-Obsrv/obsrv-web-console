import React from 'react';
import DynamicStepper from 'components/Stepper/DynamicStepper';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

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
            active: true,
            route: 'schema-details'
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
    return (
        <Box>
            <DynamicStepper
                steps={stepData.steps}
                initialSelectedStep={stepData.initialSelectedStep}
            />
            <Box sx={{ pt: 8 }}>
                <Outlet />
            </Box>
        </Box>
    );
};

export default StepperPage;
