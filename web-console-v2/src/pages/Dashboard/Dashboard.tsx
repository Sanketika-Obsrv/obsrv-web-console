import React, { useState } from 'react';
import styles from './Dasboard.module.css';
import Metrics from 'components/Cards/Metrics/Metrics';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { getInfraMetaData } from 'data/Charts/infraMetaData';
import DashboardDatasetsCard from '../../components/Cards/DashboardDatasetCard/DashboardDatasetsCard';
import { Box, Grid, MenuItem, Select, Tooltip } from '@mui/material';
import Grafana from 'assets/icons/Grafana';
import { getApiMetaData } from 'data/Charts/apiMetaData';
import { getStorageMetaData } from 'data/Charts/storageMetaData';
import { headerMetaData } from 'data/Charts/headerMetaData';
import { getIngestionMetaData } from 'data/Charts/ingestionMetaData';
import {
  getMasterProcessingMetaData,
  getProcessingMetaData,
} from 'data/Charts/processingMetaData';
import AlertDialog from 'components/AlertDialog/AlertDialog';
import { theme } from 'theme';
import { InputLabel } from '@mui/material';
import { FormControl } from '@mui/material';

const Dashboard = () => {
  const sections = ['header', 'infrastructure', 'api', 'ingestion', 'processing', 'storage'];
  const [interval, setInterval] = useState<any>();
  const [isIntervalUpdated, setIsIntervalUpdated] = useState<boolean>(false);
  const [confirmationDialogState, setConfirmationDialogState] = useState({
    isOpen: false,
    section: '',
  });

  const [refreshKeys, setRefreshKeys] = useState<any>(
    sections.reduce((acc, section) => {
      acc[section] = 0;
      return acc;
    }, {} as Record<string, number>)
  );

  // Function to handle refresh for any section dynamically
  const handleRefresh = (section: string) => {
    setRefreshKeys((prevKeys: any) => ({
      ...prevKeys,
      [section]: prevKeys[section] + 1,
    }));
  };

  const handleSetInterval = (section: string, value: number) => {
    setInterval((prevInterval: any) => ({
      ...prevInterval,
      [section]: value,
    }));
  };

  const handleOnChange = (event: any) => {
    const value = event.target.value;
    handleSetInterval(confirmationDialogState?.section, value);
    setIsIntervalUpdated(!isIntervalUpdated)
  };

  const handleDialogAction = () => {
    localStorage.setItem("refreshIntervals", JSON.stringify(interval));
  }

  const getMetricsMenuItems = (section: string) => [
    {
      label: 'Force refresh dashboard',
      onClick: () => handleRefresh(section),
    },
    // {
    //   label: 'Set Auto-Refresh Interval',
    //   onClick: () => {
    //     setConfirmationDialogState({
    //       isOpen: true,
    //       section: section,
    //     });
    //   },
    // },
  ];

  // Call getMetaData with the current refresh state
  const infraMetaData = getInfraMetaData(refreshKeys);
  const apiMetaData = getApiMetaData(refreshKeys, interval);
  const ingestionMetaData = getIngestionMetaData(refreshKeys, interval);
  const processingMetaData = getProcessingMetaData(refreshKeys);
  const MasterProcessingMetaData = getMasterProcessingMetaData(refreshKeys);
  const storageMetaData = getStorageMetaData(refreshKeys);

  const alertDialogContext = {
    title: 'Select interval to refresh',
    content: (
      <Grid container className={styles.alertContainer} >
        <Grid item>
          <FormControl fullWidth >
            <InputLabel className={styles.inputLabel}>
              Select Dataset Field
            </InputLabel>
            <Select
              label="Select Dataset Field"
              onChange={(event: any) => {
                console.log({ event })
                handleOnChange(event)
              }}
            >
              <MenuItem value={0}>none</MenuItem>
              <MenuItem value={6000}>6s</MenuItem>
              <MenuItem value={30000}>30s</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    )
  };

  const renderConfirmationDialog = () => {
    return (
      <AlertDialog
        open={confirmationDialogState?.isOpen}
        action={handleDialogAction}
        handleClose={() => setConfirmationDialogState({ isOpen: false, section: "0" })}
        context={alertDialogContext}
      />
    );
  };

  return (
    <div className={styles.mainContainer}>
      <div className={styles.chartContainer}>
        <Grid container spacing={2} className={styles.headerMetaData}>
          {headerMetaData.map((metric, index) => (
            <Grid item xs={12} sm={4} md={4} lg={4} key={index}>
              {metric.chart}
            </Grid>
          ))}
        </Grid>
      </div>

      <div className={styles.chartContainer}>
        <Metrics
          logoIcon={<Grafana color="secondary" />}
          icon={<MoreVertIcon color="primary" />}
          title="Infrastructure Metrics"
          menuItems={getMetricsMenuItems(('infrastructure'))}
        >
          <Grid container spacing={2}>
            {infraMetaData.map((metric, index) => (
              <Grid item xs={12} sm={4} md={3} lg={3} key={index}>
                {metric.chart}
              </Grid>
            ))}
          </Grid>
        </Metrics>
      </div>

      <div className={styles.chartContainer}>
        <Metrics
          logoIcon={<Grafana color="secondary" />}
          title="API Metrics"
          // sync="(Synced 2 mins ago)"
          icon={<MoreVertIcon color="primary" />}
          menuItems={getMetricsMenuItems('api')}
        >
          <Grid container spacing={2}>
            {apiMetaData.map((metric, index) => (
              <Grid item xs={12} sm={6} md={3} lg={3} key={index}>
                {metric.chart}
              </Grid>
            ))}
          </Grid>
        </Metrics>
      </div>

      <div className={styles.chartContainer}>
        <Metrics
          logoIcon={<Grafana color="secondary" />}
          icon={<MoreVertIcon color="primary" />}
          nested={true}
          title="Ingestion Metrics"
          menuItems={getMetricsMenuItems('ingestion')}
        >
          <Box className={styles.ingestionMetaData}>
            <Tooltip title={ingestionMetaData[0].description}>
              <>
                <DashboardDatasetsCard datasetType="Datasets">
                  <Grid container spacing={2} sx={{ marginBottom: 0 }}>
                    {ingestionMetaData.length > 0 && (
                      <Grid item flexGrow={1}>
                        {ingestionMetaData[0].chart}
                      </Grid>
                    )}
                  </Grid>
                </DashboardDatasetsCard>
              </>
            </Tooltip>
            <Tooltip title={ingestionMetaData[1].description}>
              <>
                <DashboardDatasetsCard datasetType="Master Datasets">
                  <Grid container spacing={2} sx={{ marginBottom: 0 }}>
                    {ingestionMetaData.length > 0 && (
                      <Grid item flexGrow={1}>
                        <Tooltip title={ingestionMetaData[1].description}>
                          {ingestionMetaData[1].chart}
                        </Tooltip>
                      </Grid>
                    )}
                  </Grid>
                </DashboardDatasetsCard>
              </>
            </Tooltip>
          </Box>
        </Metrics>
      </div>

      <div className={styles.chartContainer}>
        <Metrics
          logoIcon={<Grafana color="secondary" />}
          icon={<MoreVertIcon color="primary" />}
          title="Processing Metrics"
          nested={true}
          menuItems={getMetricsMenuItems('processing')}
        >
          <Box className={styles.processingMetaData}>
            <DashboardDatasetsCard datasetType="Datasets">
              <Grid container spacing={2}>
                {processingMetaData.map((metric, index) => (
                  <Grid item flexGrow={1} key={index}>
                    {metric.chart}
                  </Grid>
                ))}
              </Grid>
            </DashboardDatasetsCard>

            <DashboardDatasetsCard datasetType="Master Datasets">
              <Grid container spacing={2}>
                {MasterProcessingMetaData.map((metric, index) => (
                  <Grid item flexGrow={1} key={index}>
                    {metric.chart}
                  </Grid>
                ))}
              </Grid>
            </DashboardDatasetsCard>
          </Box>
        </Metrics>
      </div>

      <div className={styles.chartContainer}>
        <Metrics
          logoIcon={<Grafana color="secondary" />}
          icon={<MoreVertIcon color="primary" />}
          title="Storage Metrics"
          menuItems={getMetricsMenuItems('storage')}
        >
          <Grid container spacing={2}>
            {storageMetaData.map((metric, index) => (
              <Grid item xs={12} sm={6} md={3} lg={3} key={index}>
                {metric.chart}
              </Grid>
            ))}
          </Grid>
        </Metrics>
      </div>
      {renderConfirmationDialog()}
    </div>
  );
};
export default Dashboard;