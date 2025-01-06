import { useMemo, useState, useEffect } from 'react';
import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from 'material-react-table';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography
} from '@mui/material';
import * as _ from 'lodash';
import AddMetricDialog from './AddMetricDialog';
import { useAlert } from 'contexts/AlertContextProvider';
import styles from './MetricTable.module.css'
interface Metric {
  name: string;
  aggregate: string;
  field: string;
  datatype: string;
}

interface FieldMetadata {
  column: string;
  data_type: string;
  rollupType: string;
  metrics?: Metric[];
}

interface RollupTableProps {
  tableType?: string;
  rollupMetadata: any[];
  setRollupMetadata: (data: any) => void;
  tableConfig: any;
  updateRollup:any;
  granularity: string;
  readData:any
  setTableConfig: (data: any) => void
}

export const Table = ({
  tableType,
  rollupMetadata,
  setRollupMetadata,
  tableConfig,
  updateRollup,
  granularity,
  readData,
  setTableConfig
}: RollupTableProps) => {
  const [addMetricOpen, setAddMetricOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [editingMetric, setEditingMetric] = useState<any>(null);
  const { showAlert } = useAlert();

  const getMetricKey = (field: string, metricName: string, aggregate: string) => {
    return `${field}:${metricName}:${aggregate}`;
  };

  const handleAddMetric = (metric: any) => {
    const updatedMetadata = rollupMetadata.map((field: FieldMetadata) => {
      if (field.column === metric.field) {
        const existingMetrics = field.metrics || [];
        const newMetricKey = getMetricKey(metric.field, metric.metricName, metric.aggregateFunction);
        
        // Check for duplicates
        const isDuplicate = existingMetrics.some(m => 
          getMetricKey(m.field, m.name, m.aggregate) === newMetricKey
        );
        
        if (isDuplicate) {
          return field;
        }
        
        if (editingMetric) {
          // Update existing metric
          const updatedMetrics = existingMetrics.map((m: Metric, index: number) => {
            if (index === editingMetric.metricIndex) {
              return {
                name: metric.metricName,
                aggregate: metric.aggregateFunction,
                field: metric.field,
                datatype: field.data_type
              };
            }
            return m;
          });
          
          return {
            ...field,
            metrics: updatedMetrics,
            rollupType: 'metric'
          };
        } else {
          // Add new metric
          return {
            ...field,
            metrics: [
              ...existingMetrics,
              {
                name: metric.metricName,
                aggregate: metric.aggregateFunction,
                field: metric.field,
                datatype: field.data_type
              }
            ],
            rollupType: 'metric'
          };
        }
      }
      return field;
    });

    setRollupMetadata(updatedMetadata);
    setAddMetricOpen(false);
    setEditingMetric(null);
  };

  const handleEditMetric = (row: any) => {
    const { column, metric, metricIndex } = row.original;
    const currentKey = getMetricKey(metric.field, metric.name, metric.aggregate);
    
    setEditingMetric({
      field: column,
      metricName: metric.name,
      aggregateFunction: metric.aggregate,
      data_type: row.original.data_type,
      metricIndex,
      currentKey
    });
    setAddMetricOpen(true);
  };

  const handleRemoveMetric = (row: any) => {
    const { column, metric } = row.original;
    const metricKey = getMetricKey(metric.field, metric.name, metric.aggregate);
  
    const updatedMetadata = rollupMetadata.map((field: FieldMetadata) => {
      if (field.column === column) {
        const updatedMetrics = (field.metrics || []).filter(m => 
          getMetricKey(m.field, m.name, m.aggregate) !== metricKey
        );
  
        return {
          ...field,
          metrics: updatedMetrics,
          rollupType: 'metric'
        };
      }
      return field;
    });
  
    setRollupMetadata(updatedMetadata);
    handleUpdateRollup(updatedMetadata);
  };

  const handleUpdateRollup = (updatedMetadata: any) => {
    const metrics = updatedMetadata
      .filter((field: any) => field.metrics && field.metrics.length > 0)
      .flatMap((field: any) => field.metrics)
      .map((metric: any) => ({
        name: metric.name,
        aggregate: metric.aggregate,
        field: metric.field,
        datatype: metric.datatype
      }));

    const payload = {
      id: tableConfig.tableId,
      version_key: tableConfig.version_key || '',
      tableSpec: {
        rollup: tableConfig.tableType === 'aggregate',
        granularity: granularity,
        filter: readData?.data?.spec?.filter || {},
        metrics: metrics,
        dimensions: readData?.data?.spec?.dimensions || []
      }
    };

    updateRollup(
      { payload },
      {
        onSuccess: (response:any) => {
          showAlert('Metric deleted successfully', 'success');
          setTableConfig({
            ...tableConfig,
            version_key: response?.data?.version_key
          });
        },
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.result?.message || 'Failed to delete metric';
          showAlert(errorMessage, 'error');
        }
      }
    );
  };

  const handleCloseDialog = () => {
    setAddMetricOpen(false);
    setSelectedField(null);
    setEditingMetric(null);
  };

  const getUsedFunctions = (field: string): string[] => {
    const fieldData = rollupMetadata.find((f: FieldMetadata) => f.column === field);
    return fieldData?.metrics?.map((m:any) => m.aggregate) || [];
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'column',
        header: 'Column Name',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'data_type',
        header: 'Data Type',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'metric.name',
        header: 'Metric Name',
        enableEditing: false,
        size: 80,
      },
      {
        accessorKey: 'metric.aggregate',
        header: 'Aggregate Function',
        enableEditing: false,
        size: 80,
        Cell: ({ cell }:any) => {
          const value = cell.getValue();
          return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
        },
      },

      {
        id: 'actions',
        header: 'Actions',
        size: 100,
        Cell: ({ row }: any) => {
          // Disable edit and delete for default metric
          const isDefaultMetric = row.original.metric.name === "total_count";
          return (
            <Box className={styles.actions}>
              <Tooltip title="Edit Metric">
                <IconButton onClick={() => handleEditMetric(row)} size="small" color="primary" disabled={isDefaultMetric}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Remove Metric">
                <IconButton onClick={() => handleRemoveMetric(row)} size="small" color="error" disabled={isDefaultMetric}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      }
    ],
    [rollupMetadata]
  );

  const tableData = useMemo(() => {
    const data: any[] = [];
    rollupMetadata.forEach((field: any) => {
      if (field.metrics && field.metrics.length > 0) {
        field.metrics.forEach((metric: any) => {
          data.push({
            column: field.column,
            data_type: field.data_type,
            metric: metric
          });
        });
      }
    });
    return data;
  }, [rollupMetadata]);

  const table = useMaterialReactTable({
    columns: columns,
    data: tableData,
    enableColumnActions: false,
    enableSorting: false,
    enableBottomToolbar: false,
    enableRowSelection: false,
    enableTopToolbar: true,
    renderTopToolbar: () => (
      <Box
       className={styles.addMetricButton}
      >
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddMetricOpen(true)}
          size="small"
        >
          Add Metric
        </Button>
      </Box>
    ),
  });

  return (
    <>
      <MaterialReactTable table={table} />
      <AddMetricDialog
        open={addMetricOpen}
        onClose={handleCloseDialog}
        field={selectedField}
        rollupMetadata={rollupMetadata}
        onAddMetric={handleAddMetric}
        editingMetric={editingMetric}
        getUsedFunctions={getUsedFunctions}
        onSave={(updatedMetric) => {
          const newMetadata = [...rollupMetadata];
          const fieldIndex = newMetadata.findIndex(f => f.column === editingMetric.field);
          if (fieldIndex !== -1) {
            const metricIndex = editingMetric.metricIndex;
            newMetadata[fieldIndex].metrics[metricIndex] = updatedMetric;
            setRollupMetadata(newMetadata);
          }
        }}
        tableConfig={tableConfig}
        setTableConfig={setTableConfig}
        updateRollup={updateRollup}
        granularity={granularity}
        setRollupMetadata={setRollupMetadata}
      />
    </>
  );
};

export default Table;
