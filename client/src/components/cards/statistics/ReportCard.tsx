import { Grid, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import MainCard from 'components/MainCard';
import { useEffect, useState } from 'react';
import { fetchChartData } from 'services/clusterMetrics';
import { GenericCardProps } from 'types/root';
import globalConfig from 'data/initialConfig';
import * as _ from 'lodash';
import { Paper } from '@mui/material';
import { OverflowTypography } from 'components/styled/Typography';
import { ReloadOutlined } from '@ant-design/icons';
import Loader from 'components/Loader';

interface ReportCardProps extends GenericCardProps { }

const ReportCard = ({ uuid, primary, suffix, secondary, iconPrimary, color, query, description = '', }: ReportCardProps) => {
    const theme = useTheme();
    const IconPrimary = iconPrimary!;
    const primaryIcon = iconPrimary ? <IconPrimary fontSize="large" /> : null;
    const [primaryLabel, setPrimaryLabel] = useState<any>(primary);
    const [colorType, setColorType] = useState("primary");
    const [fullValue, setFullValue] = useState<any>("");
    const [loading, setLoading] = useState(false);
    const fullHeightWidth = { width: '100%', 'height': '100%', 'background': 'white' };
    const contentSx = { height: '100%', width: '100%', px: 3, };

    const fetchData = async () => {
        const { type } = query;
        if (type === 'api') {
            setLoading(true)
            try {
                const seriesData = await fetchChartData(query, { uuid });
                if (Array.isArray(seriesData)) {
                    const [data, color] = seriesData;
                    setPrimaryLabel(data);
                    color && setColorType(color);
                } else if(typeof seriesData === 'object') {
                    const value = _.get(seriesData, 'value')
                    const hoverValue = _.get(seriesData, 'hoverValue')
                    setPrimaryLabel(value)
                    setFullValue(hoverValue)
                } else {
                    setPrimaryLabel(seriesData);
                }
            } catch (error) { }
            finally {
                setLoading(false)
            }
        }
    }

    const configureMetricFetcher = () => {
        const frequency = globalConfig.clusterMenu.frequency;
        fetchData();
        return setInterval(() => {
            fetchData();
        }, frequency * 1000)
    }

    useEffect(() => {
        const interval = query && configureMetricFetcher();
        return () => interval && clearInterval(interval);
    }, [])

    return (
        <>
            {loading && <Loader />}
            <Paper elevation={globalConfig.elevation} sx={fullHeightWidth}>
                <Tooltip title={description}>
                    <MainCard sx={fullHeightWidth} contentSX={contentSx}>
                        <Grid container justifyContent="center" alignItems="center" color={_.get(theme, ['palette', colorType, 'main'])}>
                            <Grid item xs={12}>
                                <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2}>
                                    <Tooltip title={'Refresh'}>
                                        <ReloadOutlined onClick={_ => fetchData()} />
                                    </Tooltip>
                                </Stack>
                            </Grid>
                            <Grid item xs={10}>
                                <Stack spacing={1}>
                                <Tooltip title={fullValue}>
                                    <Typography variant="h4">
                                        {primaryLabel} {suffix}
                                    </Typography>
                                </Tooltip>
                                    <Tooltip title={secondary}>
                                        <OverflowTypography sx={{ maxWidth: '90%' }} variant="body2" color="secondary">
                                            {secondary}
                                        </OverflowTypography>
                                    </Tooltip>
                                </Stack>
                            </Grid>
                            <Grid item xs={2}>
                                <Typography variant="h2" style={{ color }}>
                                    {primaryIcon}
                                </Typography>
                            </Grid>
                        </Grid>
                    </MainCard>
                </Tooltip>
            </Paper>
        </>
    );
};

export default ReportCard;
