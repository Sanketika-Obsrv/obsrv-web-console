import React from 'react';
import Lottie from 'react-lottie';
import loadingAnimation from '../assets/loader.json';
import { Box, Typography } from '@mui/material';

interface LoaderProps {
    title?: string;
    descriptionText?: string;
    loading: boolean;
}

const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: loadingAnimation,
    rendererSettings: {
        preserveAspectRatio: 'xMidYMid slice'
    }
};

const Loader: React.FC<LoaderProps> = ({
    loading,
    title = 'Loading...',
    descriptionText = 'Please wait while we process your request.'
}) => {
    if (!loading) return null;
    return (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center">
            <Lottie options={defaultOptions} height={200} width={200} />
            <Typography variant="bodyBold" sx={{ mt: 1 }}>
                {title}
            </Typography>
            <Typography>{descriptionText}</Typography>
        </Box>
    );
};

export default Loader;
