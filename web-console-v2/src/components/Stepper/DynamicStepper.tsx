import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import styles from './Stepper.module.css';
import { theme } from 'theme';

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
    const handleClick = (route: string, index: number, completed: boolean, onProgress: boolean) => {
        if (completed || onProgress) {
            setSelectedStep(index);
            navigate(route);
        }
    };

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

    const handleRouteNavigation = (route: string, datasetId: string) => {
        const routeMapping: Record<string, string> = {
            connector: `/dataset/edit/connector/configure/${datasetId}`,
            ingestion: `/dataset/edit/ingestion/schema/${datasetId}`,
            processing: `/dataset/edit/processing/${datasetId}`,
            storage: `/dataset/edit/storage/${datasetId}`,
            preview: `/dataset/edit/preview/${datasetId}`
        };
        const targetRoute = routeMapping[route] || route;
        switch(route) {
            case 'connector':
                navigate(targetRoute);
                break;
            case 'ingestion': {
                const ingestionStep = steps.find((step) => step.route === 'ingestion');
                if(ingestionStep?.completed) 
                    navigate(targetRoute);
                else 
                    navigate(`/dataset/edit/ingestion/meta/${datasetId}`);
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
            {steps.map((step, idx) => (
                <Box
                    key={idx}
                    className={`${styles.step} ${step.completed ? styles.completed : ''} ${step.active ? styles.selected : ''}`}
                    onClick={() => {
                        if (['connector', 'ingestion', 'processing', 'storage', 'preview'].includes(step.route)) {
                            handleRouteNavigation(step.route, datasetId);
                        } else {
                            handleClick(step.route, step.index, step.completed, step.active);
                        }
                    }}
                >
                    <Box
                        className={`${styles.circle} ${step.completed ? styles.completed : ''} ${step.active ? styles.selected : ''}`}
                        sx={{
                            backgroundColor: step.completed ? 'secondary.main' : step.active ? 'secondary.light' : 'var(--body-secondary-background)',
                            border: step.active || step.completed ? `0.125rem solid ${theme.palette.secondary.main}` : ' 0.125rem solid var(--body-secondary)'
                        }}
                    >
                        {step.completed ? (
                            <span>&#10003;</span>
                        ) : (
                            <Typography color={step.active ? 'secondary.main' : 'var(--body-secondary)'}>
                                {step.index}
                            </Typography>
                        )}
                    </Box>
                    <Typography
                        variant={step.completed && !step.active ? 'body1' : step.active ? 'h1' : 'body1'}
                        color={step.completed && !step.active ? '' : step.index === selectedStep ? 'secondary.main' : ''}
                        sx={{fontSize: '0.8rem'}}
                    >
                        {step.name}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

export default DynamicStepper;