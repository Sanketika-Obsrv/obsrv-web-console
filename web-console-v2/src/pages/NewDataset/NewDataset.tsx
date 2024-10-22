import React from 'react';
import styles from './NewDataset.module.css';
import { Grid, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NewDataset: React.FC = () => {
    const navigate = useNavigate();
    const handleClick = () => {
        sessionStorage.removeItem('configDetails');
        sessionStorage.removeItem('connectorConfigDetails');

        navigate('/home/new-dataset/connector-list');
    };
    return (
        <div className={styles.main}>
            <Grid
                className={styles.mainGrid}
                container
                columnSpacing={{ xs: 1, sm: 2, md: 3 }}
                mt={3}
            >
                <Grid item xs={6} className={styles.grid} columnSpacing={2}>
                    <Typography
                        variant="majorh3"
                        lineHeight="3.1875rem"
                        className={styles.mainText}
                    >
                        You can move the data from any source to destination in near real-time
                    </Typography>
                    <Typography variant="body1" lineHeight="1.5rem">
                        In publishing and graphic design, Lorem ipsum is a placeholder text commonly
                        used to demonstrate the visual form of a document or a typeface without
                        relying on meaningful content.
                    </Typography>
                    <Box className={styles.button}>
                        <Button
                            variant="contained"
                            className={styles.button}
                            onClick={handleClick}
                            sx={{ width: '14.375rem' }}
                        >
                            <Typography variant="buttonContained">Create New Dataset</Typography>
                        </Button>
                    </Box>
                </Grid>

                <Grid item xs={6}>
                    <img
                        height="70%"
                        width="80%"
                        src="/images/DatasetLaunch.svg"
                        alt="Please check your connection"
                        className={styles.image}
                    />
                </Grid>
            </Grid>
        </div>
    );
};

export default NewDataset;
