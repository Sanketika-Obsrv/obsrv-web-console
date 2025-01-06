import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Step,
  StepLabel,
  Stepper,
  StepContent,
  Typography,
  SelectChangeEvent,
  StepIcon,
  Button
} from '@mui/material';
import styles from '../ManageRollups/components/ManagedRollups.module.css'
import * as _ from 'lodash';
import TableConfigurationStep from './components/TableConfigurationStep';
import MetricTable from './components/MetricTable/MetricTable';
import DimensionTable from './components/DimensionTable/DimensionTable';
import FilteredRollUps from './components/FilteredRollup/FilteredRollup';
import { useCreateRollup, useUpdateRollup, useReadRollup } from './services/rollup';
import { useAlert } from 'contexts/AlertContextProvider';
import TableNavigation from './components/TableNavigation';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
const steps = ['Table details', 'Configure Metrics', 'Configure Dimensions', 'Configure Filters'];

interface TableConfig {
  tableId: string;
  tableName: string;
  tableType: 'aggregate' | 'subset';
  granularity?: string;
  version_key?: string;
}

const ManageRollups = () => {
  const location = useLocation();
  const { tableId } = useParams();
  const { edit, datasetId, tableList } = location.state || {};
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { mutate: createRollup } = useCreateRollup();
  const { mutate: updateRollup } = useUpdateRollup();

  const [tableConfig, setTableConfig] = useState<TableConfig>({
    tableId: '',
    tableName: '',
    tableType: 'aggregate',
    granularity: 'day',
    version_key: ''
  });
  const stored_table_id = localStorage.getItem('tableId');
  const { data: readData, refetch: refetchRollup, isLoading } = useReadRollup(tableId || stored_table_id || tableConfig?.tableId || '');
  const [granularity, setGranularity] = useState('day');
  const [rollupMetadata, setRollupMetadata] = useState<any[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [nameError, setNameError] = useState('');
  const [filteredRollup, setFilteredRollup] = useState<Record<string, any>>({});
  const [isValidFilter, setIsValidFilter] = useState(false);
  const [filterRollupErrors, setFilterRollupErrors] = useState<string>();
  const [skipFilters, setSkipFilters] = useState(false);

  useEffect(() => {
    return () => {
      localStorage.removeItem('tableId');
    };
  }, [location.pathname]);

  useEffect(() => {
    if (edit && readData) {
      setTableConfig({
        tableId: readData.data.id,
        tableName: readData.data.name,
        tableType: readData.data.spec?.rollup ? 'aggregate' : 'subset',
        version_key: readData.data.version_key
      });
      setGranularity(readData.data.spec?.granularity || 'day');
    } else if (!edit && readData === undefined) {
      setTableConfig({
        tableId: readData?.data?.id || '',
        tableName: readData?.data?.name || '',
        tableType: 'aggregate',
        granularity: 'day',
        version_key: readData?.data?.version_key || ''
      });
      setGranularity(readData?.data?.spec?.granularity || 'day');
    }
  }, [readData]);


  useEffect(() => {
    if (activeStep === 1 || activeStep === 2 || activeStep === 3) {
      // Fetch data when entering metrics section
      refetchRollup().then(() => {
        if (readData) {
          const fields = _.get(readData, 'data.fields', {});
          const existingMetrics = _.get(readData, 'data.spec.metrics', []);
          const existingDimensions = _.get(readData, 'data.spec.dimensions', []);
          const existingFilter = _.get(readData, 'data.spec.filter', {});
          const version_key = _.get(readData, 'data.version_key', '');

          if (version_key) {
            const config = {
              ...tableConfig,
              version_key: version_key
            };
            // sessionStorage.setItem(ROLLUP_CONFIG_KEY, JSON.stringify(config));
            setTableConfig(config);
          }

          // Transform fields into array format with existing metrics and dimensions
          const rollupMetadata = Object.entries(fields).map(([fieldName, fieldValue]: [string, any]) => {
            // Find existing metrics for this field
            const fieldMetrics = existingMetrics.filter((m: any) => m.field === fieldName).map((m: any) => ({
              name: m.name,
              aggregate: m.aggregate,
              field: m.field,
              datatype: fieldValue.datatype
            }));

            // Check if field is an existing dimension and get its name
            const existingDimension = existingDimensions.find((d: any) => d.field === fieldName);
            const isDimension = !!existingDimension;

            return {
              column: fieldName,
              type: fieldValue.datatype,
              data_type: fieldValue.datatype,
              rollupType: isDimension ? 'dimension' : fieldMetrics.length > 0 ? 'metric' : '',
              metrics: fieldMetrics,
              name: isDimension ? existingDimension.name : fieldName
            };
          });

          setRollupMetadata(rollupMetadata);
          setFilteredRollup({ filter: existingFilter });
          setIsValidFilter(true);
        }
      });
    }
  }, [activeStep, readData]);

  useEffect(() => {
    if (readData?.data) {
      const data = readData.data;
      const hasTableConfig = data.id && data.name;
      const hasMetrics = Array.isArray(data.spec?.metrics) && data.spec.metrics.length > 0;
      const hasDimensions = Array.isArray(data.spec?.dimensions) && data.spec.dimensions.length > 0;
      const hasFilters = !_.isEmpty(data.spec?.filter);

      // Update completed steps based on data presence
      const newCompletedSteps = new Set<number>();
      if (hasTableConfig) newCompletedSteps.add(0);
      if (hasMetrics) newCompletedSteps.add(1);
      if (hasDimensions) newCompletedSteps.add(2);
      if (hasFilters) newCompletedSteps.add(3);

      setCompletedSteps(newCompletedSteps);
    }
  }, [edit, readData]);

  const handleGranularityChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setGranularity(value);
    setTableConfig(prev => ({
      ...prev,
      granularity: value
    }));
  };

  const handleInputChange = (field: keyof TableConfig) => (
    event: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>
  ) => {
    const newValue = event.target.value;
    setTableConfig((prev) => {
      const newConfig = {
        ...prev,
        [field]: newValue,
      };

      if (field === 'tableType') {
        setSkippedSteps(new Set());
        if (newValue === 'subset') {
          setSkippedSteps(new Set([1]));
        }
      }

      return newConfig;
    });
  };

  const handleBack = () => {
    if (tableConfig.tableType === 'subset' && activeStep === 2) {
      setActiveStep(0);
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep - 1);
    }
  };

  const isStepValid = (step: number): boolean => {
    const isValidLength = tableConfig.tableName.length >= 4 && tableConfig.tableName.length <= 100;
    const hasNoSpacesIssue = tableConfig.tableName.trim() === tableConfig.tableName;
    const generatedId = tableConfig.tableName.toLowerCase().replace(/[^a-z0-9\s]+/g, '-').replace(/\s+/g, '-');
    const nameExists = tableList?.includes(generatedId);

    switch (step) {
      case 0:
        return Boolean(tableConfig.tableName) && isValidLength && !nameExists && !nameError && hasNoSpacesIssue;
      case 1:
        if (edit) {
          return Boolean(readData?.data?.spec?.metrics?.length > 0 || readData?.data?.spec?.dimensions?.length > 0);
        }
        return Boolean(rollupMetadata.length > 0);
      default:
        return true;
    }
  };

  const handleStep = (step: number) => () => {
    if (step > activeStep && !isStepValid(step)) {
      return;
    }
    if (tableConfig.tableType === 'subset' && step === 1) {
      return;
    }
    setActiveStep(step);
  };

  const handleNext = async () => {
    if (!isStepValid(activeStep)) {
      return;
    }

    if (activeStep === 0) {
      const basePayload = {
        tableSpec: {
          rollup: tableConfig.tableType === 'aggregate',
          granularity: granularity,
          filter: {},
          metrics: [{
            "name": "total_count",
            "aggregate": "count",
            "field": "total_count",
            "datatype": "integer"
          }],
          dimensions: []
        },
        name: tableConfig.tableName
      };

      if (edit || stored_table_id) {
        // Fetch latest data using existing hook
        const { data: existingData } = await refetchRollup();
        if (existingData?.data) {
          // For update, include existing metrics, dimensions, filters if present
          const updatePayload = {
            ...basePayload,
            id: existingData.data.id,
            version_key: existingData.data.version_key || '',
            tableSpec: {
              ...basePayload.tableSpec,
              metrics: existingData.data.spec.metrics || [],
              dimensions: existingData.data.spec.dimensions || [],
              filter: existingData.data.spec.filter || {}
            }
          };

          updateRollup(
            { payload: updatePayload },
            {
              onSuccess: (response: any) => {
                showAlert(response?.message || 'Table updated successfully', 'success');
                setTableConfig({
                  ...tableConfig,
                  tableId: response.data.id,
                  version_key: response.data.version_key || ''
                });
                let newSkipped = skippedSteps;
                if (isStepSkipped(activeStep)) {
                  newSkipped = new Set(newSkipped.values());
                  newSkipped.delete(activeStep);
                }
                // Skip metrics step for subset tables
                if (tableConfig.tableType === 'subset') {
                  setActiveStep(2); // Go directly to dimensions step
                } else {
                  setActiveStep((prevActiveStep) => prevActiveStep + 1);
                }
                setSkippedSteps(newSkipped);
              },
              onError: (error: any) => {
                console.error('Failed to update table:', error);
                const errorMessage = error?.response?.data?.result?.message || 'Failed to update table';
                showAlert(errorMessage, 'error');
              }
            }
          );
        } else {
          showAlert('Failed to fetch table data', 'error');
          return;
        }
      } else {
        // For create, include dataset_id
        const createPayload = {
          ...basePayload,
          id: tableConfig.tableId,
          dataset_id: datasetId
        };

        createRollup(
          { payload: createPayload },
          {
            onSuccess: (response: any) => {
              showAlert(response?.message || 'Table created successfully', 'success');
              localStorage.setItem("tableId", response.data.id);
              setTableConfig({
                ...tableConfig,
                tableId: response.data.id,
                version_key: response.data.version_key || ''
              });
              let newSkipped = skippedSteps;
              if (isStepSkipped(activeStep)) {
                newSkipped = new Set(newSkipped.values());
                newSkipped.delete(activeStep);
              }
              // Skip metrics step for subset tables
              if (tableConfig.tableType === 'subset') {
                setActiveStep(2); // Go directly to dimensions step
              } else {
                setActiveStep((prevActiveStep) => prevActiveStep + 1);
              }
              setSkippedSteps(newSkipped);
            },
            onError: (error: any) => {
              console.error('Failed to create table:', error);
              const errorMessage = error?.response?.data?.result?.message || 'Failed to create table';
              showAlert(errorMessage, 'error');
            }
          }
        );
      }
      return;
    }

    if (activeStep === 1) {
      let newSkipped = skippedSteps;
      if (isStepSkipped(activeStep)) {
        newSkipped = new Set(newSkipped.values());
        newSkipped.delete(activeStep);
      }
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
      setSkippedSteps(newSkipped);
      return;
    }

    if (activeStep === 2) {
      let newSkipped = skippedSteps;
      if (isStepSkipped(activeStep)) {
        newSkipped = new Set(newSkipped.values());
        newSkipped.delete(activeStep);
      }
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
      setSkippedSteps(newSkipped);
      return;
    }

    if (activeStep === 3) {
      if (skipFilters) {
        let newSkipped = skippedSteps;
        if (isStepSkipped(activeStep)) {
          newSkipped = new Set(newSkipped.values());
          newSkipped.delete(activeStep);
        }
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
        setSkippedSteps(newSkipped);
        return;
      }

      else if (filteredRollup && 'filter' in filteredRollup) {
        const dimensions = rollupMetadata
          .filter((field) => field.rollupType === 'dimension')
          .map((field) => ({
            name: field.name,
            field: field.column,
            datatype: field.data_type
          }));

        const metrics = rollupMetadata
          .filter((field) => field.rollupType === 'metric')
          .flatMap((field) => field.metrics);

        const payload = {
          id: tableConfig.tableId,
          version_key: tableConfig.version_key || '',
          tableSpec: {
            rollup: tableConfig.tableType === 'aggregate',
            granularity: granularity,
            filter: filteredRollup.filter,
            metrics: metrics,
            dimensions: dimensions
          }
        };

        updateRollup(
          { payload },
          {
            onSuccess: (response: any) => {
              showAlert(response?.message || 'Filters updated successfully', 'success');
              setTableConfig({
                ...tableConfig,
                tableId: response.data.id,
                version_key: response.data.version_key || ''
              });
              let newSkipped = skippedSteps;
              if (isStepSkipped(activeStep)) {
                newSkipped = new Set(newSkipped.values());
                newSkipped.delete(activeStep);
              }
              setActiveStep((prevActiveStep) => prevActiveStep + 1);
              setSkippedSteps(newSkipped);
            },
            onError: (error: any) => {
              console.error('Failed to update filters:', error);
              const errorMessage = error?.response?.data?.result?.message || 'Failed to update filters';
              showAlert(errorMessage, 'error');
            }
          }
        );
      }
    }

    if (isLastStep()) {
      setActiveStep(0);
      navigate(`/table-management/${datasetId}`);
      return;
    }

    let newSkipped = skippedSteps;
    if (isStepSkipped(activeStep)) {
      newSkipped = new Set(newSkipped.values());
      newSkipped.delete(activeStep);
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkippedSteps(newSkipped);
  };

  const handleSkipSave = () => {
    setSkipFilters(true);
    handleNext();
  };

  const totalSteps = () => {
    return steps.length;
  };

  const isLastStep = () => {
    return activeStep === totalSteps() - 1;
  };

  const hasMetrics = () => {
    return rollupMetadata.some(field => field.metrics && field.metrics.length > 0);
  };

  const hasDimensions = () => {
    return rollupMetadata.some(field => field.rollupType === 'dimension');
  };

  const isStepSkipped = (step: number) => {
    return skippedSteps.has(step);
  };

  const isNextDisabled = () => {
    if (activeStep === 0) {
      return !tableConfig.tableId || !tableConfig.tableName;
    }
    if (activeStep === 1) {
      return !hasMetrics();
    }
    if (activeStep === 2) {
      return !hasDimensions();
    }
    if (activeStep === 3) {
      return !isValidFilter && !skipFilters;
    }
    return false;
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <TableConfigurationStep
            tableConfig={tableConfig}
            onInputChange={handleInputChange}
            nameError={nameError}
            setNameError={setNameError}
            granularity={granularity}
            handleGranularityChange={handleGranularityChange}
            edit={edit}
            readData={readData}
            tableList={tableList}
          />
        );
      case 1:
        return <MetricTable
          tableType={tableConfig.tableType}
          rollupMetadata={rollupMetadata}
          setRollupMetadata={setRollupMetadata}
          granularity={granularity}
          readData={readData}
          tableConfig={tableConfig}
          setTableConfig={setTableConfig}
        />;
      case 2:
        return <DimensionTable
          tableType={tableConfig.tableType}
          rollupMetadata={rollupMetadata}
          setRollupMetadata={setRollupMetadata}
          granularity={granularity}
          tableConfig={tableConfig}
          setTableConfig={setTableConfig}
          readData={readData} />;
      case 3:
        return (
          <>
            <Typography variant="body2" sx={{ my: 1 }}>
              Set up filters to selectively process input data during ingestion. Only the data that meets the specified conditions will be ingested
            </Typography>
            <FilteredRollUps
              filteredRollup={filteredRollup}
              setFilteredRollup={setFilteredRollup}
              setIsValidFilter={setIsValidFilter}
              flattenedData={[]}
              setSkipFilters={setSkipFilters}
              filterRollupErrors={filterRollupErrors}
              setFilterRollupErrors={setFilterRollupErrors}
              skipFilters={skipFilters}
              setActiveStep={setActiveStep}
            />
          </>
        );
      // case 4:
      //   return (
      //     <StoragePolicyStep
      //       retentionPeriod={retentionPeriod}
      //       granularity={granularity}
      //       onRetentionPeriodChange={handleRetentionPeriodChange}
      //       onGranularityChange={handleGranularityChange}
      //     />
      //   )
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box className={styles.container}>
      <Paper elevation={3} className={styles.box}>
        <Box>
          <Button
            variant="back"
            startIcon={
              <KeyboardBackspaceIcon
              />
            }
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </Box>
        <Typography variant="h5" gutterBottom>
          Table Configuration
        </Typography>
        <Stepper activeStep={activeStep} orientation="vertical" nonLinear className={styles.stepper}>
          {steps.map((label, index) => {
            const stepProps: { completed?: boolean } = {};
            stepProps.completed = completedSteps.has(index);

            return (
              <Step key={label} {...stepProps}>
                <StepLabel
                  StepIconComponent={StepIcon}
                  onClick={handleStep(index)}
                  sx={{ cursor: 'pointer' }}
                >
                  {label}
                </StepLabel>

                <StepContent>
                  <Box className={styles.tableNavigation}>
                    {getStepContent(index)}
                    <TableNavigation
                      activeStep={activeStep}
                      isStepValid={isStepValid(activeStep)}
                      onBack={handleBack}
                      onNext={handleNext}
                      isLastStep={isLastStep()}
                      disabled={isNextDisabled()}
                      onSkipSave={handleSkipSave}
                    />
                  </Box>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>
      </Paper>
    </Box>
  );
};

export default ManageRollups;