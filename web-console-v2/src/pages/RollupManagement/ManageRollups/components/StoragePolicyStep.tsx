import React from 'react';
import { Box, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Typography, SelectChangeEvent } from '@mui/material';
import { granularityOptions } from '../services/configs';

interface StoragePolicyStepProps {
  retentionPeriod: number;
  granularity: string;
  onRetentionPeriodChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGranularityChange: (event: SelectChangeEvent) => void;
}

const StoragePolicyStep: React.FC<StoragePolicyStepProps> = ({ 
  retentionPeriod, 
  granularity,
  onRetentionPeriodChange,
  onGranularityChange
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3} alignItems="center" mt={0.2}>
        <Grid item xs={6}>
          <TextField
            label="Retention Period"
            type="number"
            value={retentionPeriod}
            onChange={onRetentionPeriodChange}
            fullWidth
          />
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>Granularity</InputLabel>
            <Select
              label="Granularity"
              value={granularity}
              onChange={onGranularityChange}
              fullWidth
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
    </Box>
  );
};

export default StoragePolicyStep;
