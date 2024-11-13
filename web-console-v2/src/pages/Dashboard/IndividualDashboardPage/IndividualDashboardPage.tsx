import * as _ from 'lodash';
import { Grid, Tooltip, Typography, Stack, Box, Button } from '@mui/material';
import IconButton from 'components/@extended/IconButton';
import React, { useEffect, useState } from 'react';
import MainCard from 'components/MainCard';
import { useNavigate, useParams } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { navigateToGrafana } from 'services/grafana';
import Grafana from 'assets/icons/Grafana';
import intereactIds from 'data/telemetry/interact.json'
import { v4 } from 'uuid';
import Health from '../health';
import { metricsMetadata } from '../metrics';
import { getConfigValueV1 } from 'services/configData';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';

const IndividualMetricDashboards = (props: any) => {
  const { id } = props;
  const navigate = useNavigate();
  const [metadata, setmetadata] = useState<Record<string, any>>();
  const metricId = id
  const params = useParams();
  const { datasetId } = params;

  const navigateToHome = ({ errMsg }: any) => {
    navigate('/');
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

  const navigateToGrafana = (path: any) => {
    if (path) {
        window.open(path);
    }
}
  const renderGrafanaIcon = () => {
    const link = _.get(metadata, 'links.grafana.link')
    if (!link) return null;
    return (
      <Tooltip title="Navigate to Grafana Dashboard" onClick={() => { navigateToGrafana(getConfigValueV1("GRAFANA_URL")) }}>
        <IconButton
          data-edataid={`${intereactIds.grafana_navigate}:${metricId}`}
          color="secondary" variant="light" sx={{ color: 'text.primary', bgcolor: 'transparent', ml: 0.75 }}>
          <Grafana color="secondary" />
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
          <Typography variant='h5' fontWeight={500}>
            {!datasetId ? `${metadata?.primaryLabel || ""} Metrics ` : `${datasetId}`}
          </Typography>
          {health && <Health metadata={health} />}
          {!datasetId
            ?
            <Tooltip title={metadata?.description}>
              <InfoCircleOutlined />
            </Tooltip>
            :
            <></>
          }
        </Stack>

      </>
    )
  }

  return (
    <Box sx={{px: datasetId && 3, py: datasetId && 1 }}>
      {datasetId && <Box>
        <Button
          variant="back"
          startIcon={
            <KeyboardBackspaceIcon
            />
          }
          onClick={() => navigate(`/datasets`)}
        >
          Back
        </Button>
      </Box>}
      <MainCard title={renderTitle()} secondary={renderGrafanaIcon()}>
        <Grid container spacing={2} marginBottom={1} alignItems="stretch">
          {renderCharts(metadata)}
        </Grid>
      </MainCard >
    </Box>
  )
};

export default IndividualMetricDashboards;
