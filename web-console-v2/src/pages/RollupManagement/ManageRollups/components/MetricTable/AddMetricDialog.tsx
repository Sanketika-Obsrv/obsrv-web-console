import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  FormHelperText,
  Typography,
} from '@mui/material';
import { useAlert } from 'contexts/AlertContextProvider';
import { useUpdateRollup } from '../../services/rollup';
import * as _ from 'lodash';
import styles from './MetricTable.module.css'

interface AddMetricDialogProps {
  open: boolean;
  onClose: () => void;
  rollupMetadata: any[];
  onAddMetric: (metric: any) => void;
  editingMetric?: {
    field: string;
    metricName: string;
    aggregateFunction: string;
    data_type: string;
    metricIndex?: number;
  } | null;
  getUsedFunctions: (field: string) => string[];
  field: any;
  onSave: (metric: any) => void;
  tableConfig: any;
  updateRollup: (payload: any, callbacks: any) => Promise<any>;
  granularity: string;
  setRollupMetadata: any;
  setTableConfig: (data: any) => void;
}

const allAggregateFunctions = [
  { label: 'Sum', value: 'sum' },
  { label: 'Min', value: 'min' },
  { label: 'Max', value: 'max' },
];

const numericTypes = ['integer', 'float', 'long', 'double', 'bigdecimal', 'number'];

const AddMetricDialog: React.FC<AddMetricDialogProps> = ({
  open,
  onClose,
  rollupMetadata,
  onAddMetric,
  editingMetric,
  getUsedFunctions,
  field,
  onSave,
  tableConfig,
  granularity,
  setRollupMetadata,
  setTableConfig
}) => {
  const [selectedField, setSelectedField] = useState(editingMetric?.field || '');
  const [selectedFunction, setSelectedFunction] = useState(editingMetric?.aggregateFunction || '');
  const [metricName, setMetricName] = useState(editingMetric?.metricName || '');
  const [metricNameError, setMetricNameError] = useState('');
  const [userEditedName, setUserEditedName] = useState(''); // Store user's edited name
  const [isMetricNameEdited, setIsMetricNameEdited] = useState(false);
  const [touched, setTouched] = useState({
    field: false,
    function: false,
    metricName: false
  });
  const { mutate: updateRollup } = useUpdateRollup();
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    if (editingMetric) {
      setSelectedField(editingMetric.field);
      setSelectedFunction(editingMetric.aggregateFunction);
      setMetricName(editingMetric.metricName);
      setTouched({ field: true, function: true, metricName: true });
      setMetricNameError('');
    } else {
      setSelectedField('');
      setSelectedFunction('');
      setMetricName('');
      setTouched({ field: false, function: false, metricName: false });
      setMetricNameError('');
    }
  }, [editingMetric, open]);

  useEffect(() => {
    // Always generate the base name from field and function
    if (selectedField && selectedFunction) {
      const generatedName = `${selectedField}_${selectedFunction}`.toLowerCase();
      // If user has edited the name, combine their edit with the new base name
      if (userEditedName) {
        setMetricName(userEditedName);
      } else {
        setMetricName(generatedName);
      }
      setMetricNameError(validateMetricName(userEditedName || generatedName));
    }
  }, [selectedField, selectedFunction]);

  const validateMetricName = (name: string) => {
    if (!name) {
      return 'Metric name is required';
    }
    if (name.length < 4) {
      return 'Metric name must be at least 4 characters long';
    }
    if (/^[0-9]/.test(name)) {
      return 'Metric name cannot start with a number';
    }
    if (!/^[a-zA-Z0-9._]+$/.test(name)) {
      return 'Only letters, numbers, dots (.) and underscores (_) are allowed';
    }
    // Check for existing metric names
    const hasMatchingMetadataName = rollupMetadata.some(
      (metadata: any) => metadata.name.toLowerCase() === name.toLowerCase()
    );

    if (hasMatchingMetadataName) {
      return 'Metric name already exists';
    }

    // Check for existing metrics in the rollupMetadata
    const existingMetrics = rollupMetadata
      .filter((field) => field.rollupType === 'metric')
      .flatMap((field) => field.metrics);

    const hasDuplicateMetric = existingMetrics.some(
      (metric: any) => 
        metric.name.toLowerCase() === name.toLowerCase() && 
        (!editingMetric || metric.name !== editingMetric.metricName)
    );

    if (hasDuplicateMetric) {
      return 'Metric name already exists';
    }

    return '';
  };

  const handleFieldChange = (value: string) => {
    setSelectedField(value);
    setTouched(prev => ({ ...prev, field: true }));
  };

  const handleFunctionChange = (value: string) => {
    setSelectedFunction(value);
    setTouched(prev => ({ ...prev, function: true }));
  };

  const handleMetricNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setUserEditedName(newValue);
    setMetricName(newValue);
    setMetricNameError(validateMetricName(newValue));
    setIsMetricNameEdited(true);
    setTouched(prev => ({ ...prev, metricName: true }));
  };

  const handleSubmit = async () => {
    if (selectedField && selectedFunction && !metricNameError && metricName) {
      setLoading(true);
      // Find the field data from rollupMetadata
      const fieldData = rollupMetadata.find(f => f.column === selectedField);
      if (!fieldData) {
        showAlert('Field data not found', 'error');
        setLoading(false);
        return;
      }

      const metrics = rollupMetadata
        .filter((field) => field.rollupType === 'metric')
        .flatMap((field) => field.metrics);

      const dimensions = rollupMetadata
        .filter((field) => field.rollupType === 'dimension')
        .map((field) => ({
          name: field.name,
          field: field.column,
          datatype: field.data_type
        }));

      if (editingMetric) {
        // First, get all metrics while preserving their field structure
        const updatedMetadata = rollupMetadata.map(field => {
          if (field.column === editingMetric.field) {
            return {
              ...field,
              metrics: field.metrics.map((metric: any) => {
                // Match metric by name and field instead of index
                if (metric.name === editingMetric.metricName && 
                    metric.field === editingMetric.field && 
                    metric.aggregate === editingMetric.aggregateFunction) {
                  return {
                    name: metricName,
                    aggregate: selectedFunction,
                    field: selectedField,
                    datatype: fieldData.data_type
                  };
                }
                return metric;
              })
            };
          }
          return field;
        });


        // Get all metrics for payload
        const allMetrics = updatedMetadata
          .filter((field) => field.rollupType === 'metric')
          .flatMap((field) => field.metrics);

        const payload = {
          id: tableConfig.tableId,
          version_key: tableConfig.version_key || '',
          tableSpec: {
            rollup: tableConfig.tableType === 'aggregate',
            granularity: granularity,
            filter: {},
            metrics: allMetrics,
            dimensions
          }
        };

        updateRollup(
          { payload },
          {
            onSuccess: (response: any) => {
              showAlert('Metric updated successfully', 'success');
              setTableConfig({
                ...tableConfig,
                version_key: response?.data?.version_key
              });
              onSave({
                name: metricName,
                aggregate: selectedFunction,
                field: selectedField,
                datatype: fieldData.data_type,
                metricIndex: editingMetric.metricIndex
              });
              onClose();
              setRollupMetadata(updatedMetadata);
              setLoading(false);
            },
            onError: (error: any) => {
              console.error('Failed to update metric:', error);
              const errorMessage = error?.response?.data?.result?.message || 'Failed to update metric';
              showAlert(errorMessage, 'error');
              setLoading(false);
            }
          }
        );
      } else {
        // Add new metric
        const newMetric = {
          name: metricName,
          aggregate: selectedFunction,
          field: selectedField,
          datatype: fieldData.data_type
        };

        const payload = {
          id: tableConfig.tableId,
          version_key: tableConfig.version_key || '',
          tableSpec: {
            rollup: tableConfig.tableType === 'aggregate',
            granularity: granularity,
            filter: {},
            metrics: [...metrics, newMetric],
            dimensions
          }
        };

        updateRollup(
          { payload },
          {
            onSuccess: (response: any) => {
              showAlert('Metric added successfully', 'success');
              setTableConfig({
                ...tableConfig,
                version_key: response?.data?.version_key
              });
              onAddMetric({
                field: selectedField,
                metricName: metricName,
                aggregateFunction: selectedFunction,
              });
              handleClose();
              setLoading(false);
            },
            onError: (error: any) => {
              console.error('Failed to add metric:', error);
              const errorMessage = error?.response?.data?.result?.message || 'Failed to add metric';
              showAlert(errorMessage, 'error');
              setLoading(false);
            }
          }
        );
      }
    }
  };

  const handleClose = () => {
    setSelectedField('');
    setSelectedFunction('');
    setMetricName('');
    setUserEditedName('');
    setTouched({ field: false, function: false, metricName: false });
    setMetricNameError('');
    onClose();
  };

  const availableFields = rollupMetadata.filter(
    (field) => {
      const isCurrentField = editingMetric && field.column === editingMetric.field;
      const usedFunctions = getUsedFunctions(field.column);
      return (usedFunctions.length < 3 || isCurrentField) && 
        numericTypes.includes(field.data_type.toLowerCase()) &&
        field.column !== 'total_count';
    }
  );

  const availableFunctions = useMemo(() => {
    if (!selectedField) return allAggregateFunctions;
    
    const usedFunctions = getUsedFunctions(selectedField);
    if (editingMetric && selectedField === editingMetric.field) {
      // Remove the current function from used functions to allow selecting it again
      const currentFunctionIndex = usedFunctions.findIndex(f => f === editingMetric.aggregateFunction);
      if (currentFunctionIndex !== -1) {
        usedFunctions.splice(currentFunctionIndex, 1);
      }
    }
    
    return allAggregateFunctions.filter(func => !usedFunctions.includes(func.value));
  }, [selectedField, editingMetric, getUsedFunctions]);

  const fieldError = touched.field && !selectedField ? 'Field is required' : '';
  const functionError = touched.function && !selectedFunction ? 'Aggregate function is required' : '';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant='h1'>{editingMetric ? 'Edit Metric' : 'Add New Metric'}</Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }} error={!!fieldError} required>
            <InputLabel>Select Field</InputLabel>
            <Select
              value={selectedField}
              label="Select Field"
              onChange={(e) => handleFieldChange(e.target.value)}
              disabled={!!editingMetric}
              onBlur={() => setTouched(prev => ({ ...prev, field: true }))}
            >
              {availableFields.map((field) => (
                <MenuItem key={field.column} value={field.column}>
                  {field.column}
                </MenuItem>
              ))}
            </Select>
            {fieldError && <FormHelperText>{fieldError}</FormHelperText>}
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }} error={!!functionError} required>
            <InputLabel>Aggregate Function</InputLabel>
            <Select
              value={selectedFunction}
              label="Aggregate Function"
              onChange={(e) => handleFunctionChange(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, function: true }))}
            >
              {availableFunctions.map((func) => (
                <MenuItem key={func.value} value={func.value}>
                  {func.label}
                </MenuItem>
              ))}
            </Select>
            {functionError && <FormHelperText>{functionError}</FormHelperText>}
          </FormControl>

          <TextField
            label="Metric Name"
            value={metricName}
            onChange={handleMetricNameChange}
            fullWidth
            error={!!metricNameError && touched.metricName}
            helperText={touched.metricName ? metricNameError : 'Auto-generated from field and function. You can edit if needed.'}
            required
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button size='small' onClick={handleClose}>Cancel</Button>
        <Button
          size='small'
          variant="contained"
          onClick={handleSubmit}
          disabled={!selectedField || !selectedFunction || !!metricNameError || !metricName}
        >
          {editingMetric ? 'Save Changes' : 'Add Metric'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMetricDialog;
