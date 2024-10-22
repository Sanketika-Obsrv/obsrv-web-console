import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { ReactComponent as RetryIcon } from 'assets/upload/retry.svg';
import styles from './Retry.module.css';
import { theme } from 'theme';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { useNavigate } from 'react-router-dom';

interface RetryProps {
    buttonLabel: string;
    description?: string;
    onButtonClick?: () => void;
}

const Retry: React.FC<RetryProps> = ({ buttonLabel, onButtonClick, description }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate(-1);
    };
    return (
        <>
            <Button
                variant="text"
                sx={{ color: theme.palette.common.black, px: 4 }}
                startIcon={<KeyboardBackspaceIcon className={styles.iconStyle} />}
                onClick={handleBack}
            >
                <Typography variant="textCTAPrimary">Back</Typography>
            </Button>
            <Stack className={styles.container} mt={12}>
                <Stack className={styles.tryIcon}>
                    <RetryIcon />
                </Stack>
                <Stack mt={4} className={styles.mainText}>
                    <Typography variant="majorh4" sx={{ position: 'relative' }}>
                        Oops! Looks like something went wrong.
                    </Typography>
                </Stack>
                <Typography
                    variant="h2Tertiary"
                    color={theme.palette.text.secondary}
                    className={styles.describeText}
                >
                    {description}
                </Typography>
                <Button variant="contained" color="primary" onClick={onButtonClick}>
                    <Typography variant="buttonContained">{buttonLabel}</Typography>
                </Button>
            </Stack>
        </>
    );
};

export default Retry;
