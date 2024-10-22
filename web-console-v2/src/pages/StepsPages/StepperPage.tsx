import React from 'react';
import DynamicStepper from 'components/Stepper/DynamicStepper';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

const stepData = {
    steps: [
        {
            name: 'Ingestion',
            index: 1,
            completed: false,
            onProgress: true,
            route: 'ingestion'
        },
        {
            name: 'Processing',
            index: 2,
            completed: false,
            onProgress: false,
            route: 'processing'
        },
        {
            name: 'Storage',
            index: 3,
            completed: false,
            onProgress: false,
            route: 'storage'
        },
        {
            name: 'Preview & Save',
            index: 4,
            completed: false,
            onProgress: false,
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
