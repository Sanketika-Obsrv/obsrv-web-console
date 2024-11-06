import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import styles from './Stepper.module.css';
import { theme } from 'theme';
import { useFetchDatasetsById } from 'services/dataset';

interface Step {
    name: string;
    index: number;
    completed: boolean;
    route: string;
    onProgress: boolean;
}

interface StepperProps {
    steps: Step[];
    initialSelectedStep: number;
}

const DynamicStepper = ({ steps: initialSteps, initialSelectedStep }: StepperProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedStep, setSelectedStep] = useState(initialSelectedStep);
    const [steps, setSteps] = useState(initialSteps);
    const handleClick = (route: string, index: number, completed: boolean, onProgress: boolean) => {
        if (completed || onProgress) {
            setSelectedStep(index);
            navigate(route);
        }
    };

    useEffect(() => {
        const pathSegments = location.pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 2];
        const activeStep = steps.find((step) => step.route === lastSegment);

        if (activeStep) {
            setSelectedStep(activeStep.index);
            setSteps((prevSteps) => {
                return prevSteps.map((step) => {
                    if (step.index < activeStep.index) {
                        return { ...step, completed: true, onProgress: false };
                    } else if (step.index === activeStep.index) {
                        return { ...step, onProgress: true };
                    } else {
                        return { ...step, onProgress: false, completed: false };
                    }
                });
            });
        }
    }, [location, initialSteps]);

    const params = useParams();
    const { datasetId }: any = params;

    const handleRouteNavigation = (route: string, datasetId: string) => {
        const routeMapping: Record<string, string> = {
            ingestion: `/home/ingestion/schema-details/${datasetId}`,
            processing: `/home/processing/${datasetId}`,
            storage: `/home/storage/${datasetId}`,
            preview: `/home/preview/${datasetId}`
        };

        const targetRoute = routeMapping[route] || route;
        navigate(targetRoute);
    };

    return (
        <Box className={styles.stepper}>
            {steps.map((step, idx) => (
                <Box
                    key={idx}
                    className={`${styles.step} ${step.completed ? styles.completed : ''} ${step.index === selectedStep || step.onProgress ? styles.selected : ''}`}
                    onClick={() => {
                            if (['ingestion', 'processing', 'storage', 'preview'].includes(step.route)) {
                                handleRouteNavigation(step.route, datasetId);
                            } else {
                                handleClick(step.route, step.index, step.completed, step.onProgress);
                            }
                    }}
                >
                    <Box
                        className={`${styles.circle} ${step.completed && !step.onProgress ? styles.completed : ''} ${step.index === selectedStep || step.onProgress ? styles.selected : ''}`}
                        sx={{
                            backgroundColor:
                                step.completed && !step.onProgress
                                    ? 'secondary.main'
                                    : step.index === selectedStep ||
                                        (step.onProgress && step.completed)
                                        ? 'secondary.light'
                                        : 'var(--body-secondary-background)',
                            border:
                                step.index === selectedStep || (step.onProgress && step.completed)
                                    ? `0.125rem solid ${theme.palette.secondary.main}`
                                    : ' 0.125rem solid var(--body-secondary)'
                        }}
                    >
                        {step.completed && !step.onProgress ? (
                            <span>&#10003;</span>
                        ) : (
                            <Typography
                                color={
                                    step.index === selectedStep ||
                                        (!step.onProgress && step.completed)
                                        ? 'secondary.main'
                                        : 'var(--body-secondary)'
                                }
                            >
                                {step.index}
                            </Typography>
                        )}
                    </Box>
                    <Typography
                        variant={
                            step.completed && !step.onProgress
                                ? 'h1'
                                : step.index === selectedStep ||
                                    (step.onProgress && !step.completed)
                                    ? 'h1'
                                    : 'body1'
                        }
                        color={
                            step.completed && !step.onProgress
                                ? 'common.black'
                                : step.index === selectedStep
                                    ? 'secondary.main'
                                    : ''
                        }
                        sx={{
                            fontSize: '1.125rem'
                        }}
                    >
                        {step.name}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

export default DynamicStepper;
