import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, StepButton, StepLabel, Step, Stepper, Typography } from '@mui/material';
import styles from './Stepper.module.css';

interface Step {
    name: string;
    index: number;
    completed: boolean;
    skipped: boolean;
    route: string;
    active: boolean;
}

interface StepperProps {
    steps: Step[];
    initialSelectedStep: number;
}

const DynamicStepper = ({ steps: initialSteps, initialSelectedStep }: StepperProps) => {

    const navigate = useNavigate();
    const location = useLocation();
    const { datasetId }: any = useParams();
    const [selectedStep, setSelectedStep] = useState(initialSelectedStep);
    const [steps, setSteps] = useState(initialSteps);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const prevStep = queryParams.get('step');
        
        const route = location.pathname.split('/')[3];
        const activeStep = steps.find((step) => step.route === route);
        if (activeStep) {
            setSelectedStep(activeStep.index);
            setSteps((prevSteps) => {
                return prevSteps.map((step) => {
                    if (step.index < activeStep.index) {
                        if(step.route === prevStep) {
                            return { ...step, skipped: queryParams.get('skipped') === 'true', completed: queryParams.get('completed') === 'true', active: false };
                        }
                        if(step.route === 'connector') {
                            return { ...step, active: false };    
                        }
                        return { ...step, completed: true, active: false };
                    } else if (step.index === activeStep.index) {
                        return { ...step, active: true };
                    } else {
                        return { ...step, active: false };
                    }
                });
            });
        }
    }, [location, initialSteps]);

    const handleRouteNavigation = (route: string) => {
        const routeMapping: Record<string, string> = {
            connector: `/dataset/edit/connector/configure/${datasetId}`,
            ingestion: `/dataset/edit/ingestion/schema/${datasetId}`,
            processing: `/dataset/edit/processing/${datasetId}`,
            storage: `/dataset/edit/storage/${datasetId}`,
            preview: `/dataset/edit/preview/${datasetId}`
        };
        const targetRoute = routeMapping[route] || route;
        switch(route) {
            case 'connector': {
                const connectorStep = steps.find((step) => step.route === 'connector');
                if(connectorStep?.completed) 
                    navigate(`/dataset/edit/connector/configure/${datasetId}`,{ state: location.state });
                else 
                    navigate(`/dataset/edit/connector/list/${datasetId}`);
                break;
            }
            case 'ingestion': {
                const ingestionStep = steps.find((step) => step.route === 'ingestion');
                if(ingestionStep?.completed) 
                    navigate(`/dataset/edit/ingestion/schema/${datasetId}`);
                else 
                    navigate(`/dataset/edit/ingestion/meta/${datasetId}`,{ state: location.state });
                break;
            }       
            case 'processing': {
                const prevStep = steps.find((step) => step.route === 'ingestion');
                if(prevStep?.completed) navigate(targetRoute);
                break;
            }
            case 'storage': {
                const prevStep = steps.find((step) => step.route === 'processing');
                if(prevStep?.completed) navigate(targetRoute);
                break;
            }
            case 'preview': {
                const prevStep = steps.find((step) => step.route === 'storage');
                if(prevStep?.completed) navigate(targetRoute);
                break;
            }
        }
        
    };

    return (
        <Box className={styles.stepper}>
            <Stepper nonLinear activeStep={selectedStep - 1} sx={{ width: '48rem' }} >
            {steps.map((step) => {
                return (
                    <Step key={step.route} completed={step.completed}>
                        <StepButton onClick={() => handleRouteNavigation(step.route)}>
                            <StepLabel optional={<Typography variant="body1">Optional</Typography>} StepIconProps={{sx: {classes: step.completed ? 'completed':''}}}>{step.name}</StepLabel>
                        </StepButton>
                    </Step>
                );
            })}
            </Stepper>
      </Box>
    );
};

export default DynamicStepper;