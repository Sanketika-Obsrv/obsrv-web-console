import React from 'react';
import { Box } from '@mui/material';
import { Table } from './Table';
import { useUpdateRollup } from '../../services/rollup';

interface MetricTableStepProps {
  tableType?: string;
  rollupMetadata: any[];
  setRollupMetadata: (data: any) => void;
  granularity: string;
  readData: any;
  tableConfig: any;
  setTableConfig: (data: any) => void;
}

const MetricTable = ({ 
  tableType, 
  rollupMetadata, 
  setRollupMetadata,
  granularity,
  readData,
  tableConfig,
  setTableConfig
}: MetricTableStepProps) => {
  const { mutate: updateRollup } = useUpdateRollup();

  if (!rollupMetadata) {
    return null;
  }

  return (
    <Box>
      <Table
        tableType={tableType}
        rollupMetadata={rollupMetadata}
        setRollupMetadata={setRollupMetadata}
        tableConfig={tableConfig}
        setTableConfig={setTableConfig}
        updateRollup={updateRollup}
        granularity={granularity}
        readData={readData}
      />
    </Box>
  );
};

export default MetricTable;
