import React from 'react';
import styles from './NewDataset.module.css';
import { Grid, Typography, Box, Button } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { t } from 'utils/i18n';
import datasetImg from 'assets/images/DatasetLaunch.svg';
import { DatasetType } from 'types/datasets';

const NewDataset: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const datasetType = searchParams.get('datasetType');

    const handleClick = () => {
        if (datasetType === DatasetType.MasterDataset) {
            navigate('/dataset/edit/connector/list/<new>?datasetType=master');
        } else {
            navigate('/dataset/edit/connector/list/<new>');
        }
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
                        {t('newDataset.realTimeDataTransfer')}
                    </Typography>
                    <Typography variant="body1" lineHeight="1.5rem">
                        {t('newDataset.seamlessTransfer')}
                    </Typography>
                    <Box className={styles.button}>
                        <Button
                            variant="contained"
                            className={styles.button}
                            onClick={handleClick}
                            sx={{ width: '14.375rem' }}
                        >
                            <Typography variant="buttonContained">{t('newDataset.createNewDataset')}</Typography>
                        </Button>
                    </Box>
                </Grid>

                <Grid item xs={6}>
                    <img
                        height="70%"
                        width="80%"
                        src={datasetImg}
                        alt="Please check your connection"
                        className={styles.image}
                    />
                </Grid>
            </Grid>
        </div>
    );
};

export default NewDataset;
