import React from 'react';
import { Box } from '@mui/material';
import { Table } from './Table';

interface RollupMetadata {
  column: string;
  type: string;
  rollupType: 'metric' | 'dimension';
  metrics?: Array<{
    name: string;
    function: string;
    id: string;
  }>;
}

interface DimensionTableProps {
  tableType: 'aggregate' | 'subset';
  rollupMetadata: RollupMetadata[];
  setRollupMetadata: React.Dispatch<React.SetStateAction<RollupMetadata[]>>;
  granularity: string;
  readData: any;
  tableConfig: any;
  setTableConfig: (data: any) => void;
}

const DimensionTable: React.FC<DimensionTableProps> = ({ 
  tableType, 
  rollupMetadata = [], 
  setRollupMetadata,
  granularity,
  readData,
  tableConfig,
  setTableConfig
}) => {
  return (
    <Box>
      <Table 
        rollupMetadata={rollupMetadata} 
        setRollupMetadata={setRollupMetadata}
        granularity={granularity}
        readData={readData}
        tableConfig={tableConfig}
        setTableConfig={setTableConfig}
      />
    </Box>
  );
};

export default DimensionTable;
