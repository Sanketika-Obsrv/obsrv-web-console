import * as React from 'react';
import { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { Box, Grid, Tooltip } from '@mui/material';
import _ from 'lodash';
import { fetchMetricData } from '../../services/chartMetrics';
import styles from "./MetricsCard/MetricsCard.module.css"

const StorageMetricsCard: React.FC<any> = (props: any) => {
    const { label, icon, query, uuid, transformer, description, refresh, interval } = props;
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);
    const change = '0%';
    const isPositive = change.startsWith('+');
    const symbol = isPositive ? (
        <ArrowUpward sx={{ fontSize: 'small', color: 'success.main' }} />
    ) : (
        <ArrowDownward sx={{ fontSize: 'small', color: 'error.main' }} />
    );

    const fetchMetric = async (query: any) => {
        try {
            setLoading(true);
            const response = await fetchMetricData(query, { uuid });
            const transformedLabel =
                (await (transformer && transformer(response))) || response;
            setValue(transformedLabel as any);
            setLoading(false);
        } catch (error) {
            console.log('error occured', error);
        }
    };

    useEffect(() => {
        fetchMetric(query);
    }, [refresh?.storage]);

    return (
        <Tooltip title={description}>
            <Box className={styles.cardContainer}>
                <Card
                    elevation={0}
                    className={styles.card}
                >
                    <CardContent
                        className={styles.cardContent}
                    >
                        <span>{icon}</span>

                        <Typography variant="bodyBold" className={styles.loadingText}>
                            {loading ? 'Loading...' : value}
                        </Typography>

                        <Grid
                            container
                            className={styles.labelContainer}
                        >
                            <Typography variant="captionMedium" className={styles.label}>
                                {label}
                            </Typography>

                            {/* <Typography
                                color={isPositive ? 'success.main' : 'error.main'}
                                className={styles.symbol}
                            >
                                {symbol} {_.trimStart(change, '+-')}
                            </Typography> */}
                        </Grid>
                    </CardContent>
                </Card>
            </Box>
        </Tooltip>
    );
};

export default StorageMetricsCard;