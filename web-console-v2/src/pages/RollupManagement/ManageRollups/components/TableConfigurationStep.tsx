import React, { useEffect, useMemo } from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Paper,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import _ from 'lodash';
import { granularityOptions } from '../services/configs';
import styles from '../components/ManagedRollups.module.css';
interface TableConfig {
  tableId: string;
  tableName: string;
  tableType: 'aggregate' | 'subset';
  granularity?: string;
}

interface TableConfigurationStepProps {
  tableConfig: TableConfig;
  onInputChange: (field: keyof TableConfig) => (event: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>) => void;
  tableNameError?: string;
  nameError?: string;
  setNameError?: any;
  handleGranularityChange: (event: SelectChangeEvent<string>) => void;
  granularity: string;
  edit?: boolean;
  readData?: any;
  tableList?: string[];
}

const TableConfigurationStep: React.FC<TableConfigurationStepProps> = ({
  tableConfig,
  onInputChange,
  nameError,
  setNameError,
  handleGranularityChange,
  granularity,
  edit,
  readData,
  tableList = []
}) => {
  const nameRegex = useMemo(() => /^[^!@#$%^&*()+{}[\]:;<>,?~\\|]*$/, []);
  const stored_table_id = localStorage.getItem('tableId');
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // First update the textfield value
    onInputChange('tableName')(event);
    
    // Check for leading/trailing spaces
    if (newValue.trim() !== newValue) {
      setNameError('Leading and trailing spaces are not allowed');
      return;
    }
    
    // Check if name starts with a number
    if (/^\d/.test(newValue)) {
      setNameError('Table name cannot start with a number');
      return;
    }
    
    // Then perform other validations
    if (!nameRegex.test(newValue)) {
      setNameError('The field should exclude any special characters, permitting only alphabets, numbers, ".", "-", and "_".');
      return;
    }

    const generatedId = newValue.toLowerCase().replace(/[^a-z0-9\s]+/g, '-').replace(/\s+/g, '-');
    if (tableList.includes(generatedId)) {
      setNameError('A table with this name already exists');
      return;
    }

    const eventForId = {
      target: {
        value: generatedId
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange('tableId')(eventForId);
    setNameError('');
  };

  const helperText = useMemo(() => {
    if (nameError) return nameError;
    if (tableConfig?.tableName && (tableConfig.tableName.length < 4 || tableConfig.tableName.length > 100)) {
      return 'Table name should be between 4 and 100 characters';
    }
    return 'Enter a unique, descriptive table name (use only alphabets, numbers, ".", "-", and "_")';
  }, [nameError, tableConfig?.tableName]);

  const tableIdHelperText = useMemo(() => 
    edit ? "Table ID cannot be changed in edit mode" : "This field is auto-generated using the Table name",
    [edit]
  );

  return (
    <Paper className={styles.tableDetails}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={12} lg={12} gap={2} className={styles.tableDetailsContainer}>
          <FormControl fullWidth>
            <TextField
              id="table-name"
              fullWidth
              label="Table Name"
              placeholder="Enter Table Name"
              value={tableConfig.tableName}
              onChange={handleNameChange}
              required
              error={Boolean(nameError || (tableConfig?.tableName && (tableConfig.tableName.length < 4 || tableConfig.tableName.length > 100)))}
              helperText={helperText}
              size="medium"
            />
          </FormControl>
          <FormControl fullWidth>
            <TextField
              id="table-id"
              fullWidth
              label="Table ID"
              value={edit ? readData?.data?.id || '' : !edit ? stored_table_id || tableConfig.tableId : tableConfig.tableId}
              disabled
              required
              helperText={tableIdHelperText}
              size="medium"
            />
          </FormControl>
        </Grid>
        <Grid item xs={6} md={6} lg={6}>
          <FormControl fullWidth>
            <InputLabel id="table-type-label">Table Type</InputLabel>
            <Select
              value={tableConfig.tableType}
              onChange={onInputChange('tableType')}
              labelId="table-type-label"
              label="Table Type"
            >
              <MenuItem value="aggregate">Aggregate</MenuItem>
              <MenuItem value="subset">Subset</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={6} lg={6}>
          <FormControl fullWidth>
            <InputLabel id="granularity-label">Granularity</InputLabel>
            <Select
              labelId="granularity-label"
              id="granularity"
              value={granularity}
              label="Granularity"
              onChange={handleGranularityChange}
            >
              {granularityOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default TableConfigurationStep;