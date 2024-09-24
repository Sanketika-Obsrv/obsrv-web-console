import * as _ from 'lodash';
import { Grid, Tooltip, Typography, Stack } from '@mui/material';
import IconButton from 'components/@extended/IconButton';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import MainCard from 'components/MainCard';
import { metricsMetadata } from 'data/metrics';
import { useNavigate, useParams } from 'react-router-dom';
import { error } from 'services/toaster';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Avatar } from '@mui/material';
import { navigateToGrafana } from 'services/grafana';
import { useTheme } from '@mui/material';
import grafanaIcon from 'assets/images/icons/grafana_icon.svg';
import pageIds from 'data/telemetry/pageIds';
import useImpression from 'hooks/useImpression';
import intereactIds from 'data/telemetry/interact.json'
import { v4 } from 'uuid';
import Health from './health';

const MetricsDetails = (props: any) => {
    const { id } = props;
    const theme = useTheme();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const params = useParams();
    const [metadata, setmetadata] = useState<Record<string, any>>();
    const iconBackColor = theme.palette.mode === 'dark' ? 'background.default' : 'grey.100';
    const metricId = id || _.get(params, 'metricId');
    useImpression({ type: "detail", pageid: _.get(pageIds, ['metrics', metricId]) });

    const navigateToHome = ({ errMsg }: any) => {
        navigate('/');
        errMsg && dispatch(error({ message: errMsg }));
    }

    const fetchMetadata = () => {
        if (!metricId) navigateToHome({ errMsg: 'Metric Id Missing' });
        const metricsMeta = _.find(metricsMetadata, ['id', metricId]);
        if (!metricsMeta) navigateToHome({ errMsg: 'Invalid Metric' })
        setmetadata(metricsMeta);
    }

    useEffect(() => {
        fetchMetadata();
    }, [metricId]);

    const renderCharts = (metadata: any) => {
        if (metadata) {
            const { charts } = metadata as { charts: Record<string, any> };
            return _.flatten(_.map(charts, (value, index) => {
                const { size, metadata = [], groups = [], } = value;
                const { xs, sm, lg, md } = size;
                const groupsData = _.map(groups, (group) => {
                    const { metadata: groupMetadata, title } = group;
                    return (
                        <>
                            <Grid item xs={12}>
                                <Typography variant="h5">{title}</Typography>
                            </Grid>
                            {
                                _.map(groupMetadata, (meta, metaIndex) => {
                                    const { id = v4(), chart, description, noItem = false, size = {} } = meta;
                                    const { xs: overiddenXs, sm: overiddenSm, lg: overiddenLg, md: overiddenMd } = size;
                                    if (noItem) return React.cloneElement(chart, { description, metricId, key: `${metaIndex}-${Math.random()}` });
                                    return <Grid item xs={overiddenXs || xs} sm={overiddenSm || sm} md={overiddenMd || md} lg={overiddenLg || lg} key={`${metaIndex}-${Math.random()}`} alignItems="stretch">
                                        {React.cloneElement(chart, { description, metricId, uuid: id })}
                                    </Grid>
                                })
                            }
                            <Grid item xs={12}></Grid>
                        </>
                    );
                });
                const chartData = _.map(metadata, (meta, metaIndex) => {
                    const { id = v4(), chart, description, noItem = false } = meta;
                    if (noItem) return React.cloneElement(chart, { description, metricId, key: `${metaIndex}-${Math.random()}` });
                    return <Grid item xs={xs} sm={sm} md={md} lg={lg} key={`${metaIndex}-${Math.random()}`} alignItems="stretch">
                        {React.cloneElement(chart, { description, metricId, uuid: id })}
                    </Grid>
                });
                if (_.size(groups) > 0) return groupsData;
                else return chartData;
            }));
        }
    }

    const renderGrafanaIcon = () => {
        const link = _.get(metadata, 'links.grafana.link')
        if (!link) return null;
        return (
            <Tooltip title="Navigate to Grafana Dashboard" onClick={_ => navigateToGrafana(link)}>
                <IconButton
                    data-edataid={`${intereactIds.grafana_navigate}:${metricId}`}
                    color="secondary" variant="light" sx={{ color: 'text.primary', bgcolor: 'transparent', ml: 0.75 }}>
                    <Avatar alt="Gradana" src={grafanaIcon} />
                </IconButton>
            </Tooltip>
        );
    }

    const renderTitle = () => {
        const health = _.get(metadata, 'health');
        return (
            <>
                <Stack direction="row"
                    justifyContent="flex-start"
                    alignItems="center"
                    spacing={2}>
                    <div>
                        {`${metadata?.primaryLabel || ""} Metrics `}
                    </div>
                    {health && <Health metadata={health} />}
                    <Tooltip title={metadata?.description}>
                        <InfoCircleOutlined />
                    </Tooltip>

                </Stack>

            </>
        )
    }

    return (
        <>
            <MainCard title={renderTitle()} secondary={renderGrafanaIcon()}>
                <Grid container spacing={2} marginBottom={1} alignItems="stretch">
                    {renderCharts(metadata)}
                </Grid>
            </MainCard >
        </>
    )
};

export default MetricsDetails;
