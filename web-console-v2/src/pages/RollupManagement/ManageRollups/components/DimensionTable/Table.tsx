import { useMemo, useState } from 'react';
import React from 'react';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import EditDimensionDialog from './EditDimensionDialog';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  useMaterialReactTable,
} from 'material-react-table';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Grid,
} from '@mui/material';
import * as _ from 'lodash';
import { useAlert } from 'contexts/AlertContextProvider';
import { useReadRollup, useUpdateRollup } from '../../services/rollup';
import styles from './DimensionTable.module.css';

export const Table = ({ rollupMetadata, setRollupMetadata, granularity,tableConfig,setTableConfig }: any) => {
  const { data: readData, refetch: refetchRollup, isLoading } = useReadRollup(tableConfig?.tableId || '');
  const baseColumns = [
    {
      accessorKey: 'column',
      header: 'Field',
      enableEditing: true,
      size: 80,
    }
  ];

  const selectedFieldsColumns = [
    {
      accessorKey: 'column',
      header: 'Field',
      enableEditing: true,
      size: 80,
    },
    {
      accessorKey: 'name',
      header: 'Display Name',
      size: 80,
    }
  ];

  const regularColumns = [...baseColumns];
  const selectedColumns = [...selectedFieldsColumns];

  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => regularColumns,
    [rollupMetadata],
  );

  const selectedTableColumns = useMemo<MRT_ColumnDef<any>[]>(
    () => selectedColumns,
    [rollupMetadata],
  );

  const tableRows = useMemo(() => 
    rollupMetadata.filter((item: any) =>
      item.rollupType !== 'dimension' &&
      item.rollupType !== 'metric' &&
      item.data_type === 'string'
    ), [rollupMetadata]
  );

  const selectedTableRows = useMemo(() => 
    rollupMetadata.filter((item: any) =>
      item.rollupType === 'dimension' &&
      item.data_type === 'string'
    ), [rollupMetadata]
  );

  const { showAlert } = useAlert();
  const { mutate: updateRollup } = useUpdateRollup();
  // Get tableConfig from session storage

  const handleMoveToselected = (row: MRT_Row<any>) => {
    const itemToMove = row.original;
    const updatedMetadata = rollupMetadata.map((item: any) =>
      item.column === itemToMove.column
        ? { ...item, rollupType: 'dimension', name: itemToMove.column }
        : item
    );
    setRollupMetadata(updatedMetadata);
    handleUpdateRollup(updatedMetadata, "Dimensions added successfully");
  };

  const handleMoveFromselected = (row: MRT_Row<any>) => {
    const itemToMove = row.original;
    const updatedMetadata = rollupMetadata.map((item: any) =>
      item.column === itemToMove.column
        ? { ...item, rollupType: '', name: undefined }
        : item
    );
    setRollupMetadata(updatedMetadata);
    handleUpdateRollup(updatedMetadata, "Dimensions removed successfully");
  };

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);

  const handleOpenEditDialog = (row: any) => {
    setEditingField(row.original);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingField(null);
  };

  const handleSaveEdit = (editedValue: string) => {
    const updatedMetadata = rollupMetadata.map((item: any) => {
      if (item.column === editingField.column) {
        return {
          ...item,
          name: editedValue
        };
      }
      return item;
    });
    setRollupMetadata(updatedMetadata);
    handleUpdateRollup(updatedMetadata, "Dimensions updated successfully");
  };

  // Original table configuration
  const table = useMaterialReactTable({
    columns,
    data: tableRows,
    createDisplayMode: 'row',
    editDisplayMode: 'row',
    enableEditing: true,
    enableRowActions: true,
    enablePagination: false,
    enableColumnFilters: false,
    positionActionsColumn: 'last',
    enableColumnActions: false,
    enableSorting: false,
    enableBottomToolbar: false,
    enableRowSelection: false,
    enableTopToolbar: false,
    getRowId: (row) => row.id,
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'Add',
      },
    },
    muiTableContainerProps: {
      sx: {
        height: '400px',
        overflow: 'auto'
      },
    },
    renderRowActions: ({ row }) => (
      <Box className={styles.actions}>
        <Tooltip title="Add as Dimension">
          <IconButton color="primary" onClick={() => handleMoveToselected(row)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>
    )
  });

  const handleUpdateRollup = (updatedMetadata: any, message?: string) => {
    const dimensions = updatedMetadata
      .filter((field: any) => field.rollupType === 'dimension')
      .map((field: any) => ({
        name: field.name,
        field: field.column,
        datatype: field.data_type
      }));

    const payload = {
      id: tableConfig.tableId,
      version_key: tableConfig.version_key || '',
      tableSpec: {
        rollup: tableConfig.tableType === 'aggregate',
        granularity: granularity,
        filter: readData?.data?.spec?.filter || {},
        metrics: readData?.data?.spec?.metrics || [], // Keep existing metrics
        dimensions: dimensions
      }
    };

    updateRollup(
      { payload },
      {
        onSuccess: (response:any) => {
          showAlert(message || 'Dimensions updated successfully', 'success');
          setTableConfig({
            ...tableConfig,
            version_key: response?.data?.version_key
          });
          refetchRollup();
        },
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.result?.message || 'Failed to delete metric';
          showAlert(errorMessage, 'error');
        }
      }
    );
  };

  // selected table configuration
  const selectedTable = useMaterialReactTable({
    columns: selectedTableColumns,
    data: selectedTableRows,
    createDisplayMode: 'row',
    editDisplayMode: 'row',
    enableEditing: false,
    enableRowActions: true,
    enablePagination: false,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableSorting: false,
    enableBottomToolbar: false,
    enableRowSelection: false,
    enableTopToolbar: false,
    positionActionsColumn: 'last',
    getRowId: (row) => row.id,
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'Actions',
      },
    },
    muiTableContainerProps: {
      sx: {
        height: '400px',
        overflow: 'auto',
        backgroundColor: 'white',
      },
    },
    renderRowActions: ({ row }) => (
      <Box className={styles.actions}>
        <Tooltip title="Remove Dimension">
          <IconButton
            color="error"
            onClick={() => handleMoveFromselected(row)}
          >
            <RemoveIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit Name">
          <IconButton
            color="primary"
            onClick={() => handleOpenEditDialog(row)}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      </Box>
    )
  });

  return (
    <Grid container className={styles.tableContainer}>
      <Grid item className={styles.item1Width}>
        <Typography variant="h1" gutterBottom className={styles.tableBottom}>Dimensions</Typography>
        <MaterialReactTable table={table} />
      </Grid>
      <Grid item className={styles.item2Width}>
        <Typography variant="h1" gutterBottom className={styles.tableBottom}>Selected Fields</Typography>
        <MaterialReactTable table={selectedTable} />
      </Grid>
      <EditDimensionDialog
        open={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        onSave={handleSaveEdit}
        defaultValue={editingField?.name || editingField?.column || ''}
        rollupMetadata={rollupMetadata}
        editingDimension={editingField}
      />
    </Grid>
  );
};

export default Table;
