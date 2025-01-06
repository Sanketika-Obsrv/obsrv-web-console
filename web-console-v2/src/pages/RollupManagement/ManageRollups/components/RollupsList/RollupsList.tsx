import React, { useState, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Typography
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTableList } from '../../services/rollup';
import { useParams, useNavigate } from 'react-router-dom';
import { useTableTransition } from '../../services/rollup';
import { useAlert } from 'contexts/AlertContextProvider';
import styles from './RollupsList.module.css';
import TableStatusCheckboxes from './TableStatusCheckboxes';
import * as _ from 'lodash';
import { granularityOptions } from '../../services/configs';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';

interface MenuAction {
  label: string;
  icon: React.ElementType;
  action: string;
  showForStatus: string[];
}

const menuActions: MenuAction[] = [
  {
    label: 'Edit',
    icon: EditOutlinedIcon,
    action: 'edit',
    showForStatus: ['Draft', 'Live']
  },
  {
    label: 'View Details',
    icon: VisibilityIcon,
    action: 'view',
    showForStatus: ['Live']
  },
  {
    label: 'Publish',
    icon: PlayArrowIcon,
    action: 'publish',
    showForStatus: ['Draft']
  },
  {
    label: 'Retire',
    icon: StopIcon,
    action: 'retire',
    showForStatus: ['Live']
  },
  {
    label: 'Delete',
    icon: DeleteIcon,
    action: 'delete',
    showForStatus: ['Draft']
  }
];

const RollupsList: React.FC = () => {
  const { datasetId = 'test-rollup-use-this-only' } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch }: any = useTableList(datasetId);
  const { mutate: transitionTable } = useTableTransition();
  const { showAlert } = useAlert();
  const tables: any = data?.tables || [];

  const [selectedRollup, setSelectedRollup] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const tableList = useMemo(() => data?.tables?.map((table: any) => table.id) || [], [data?.tables]);

  const handleMenuAction = async (action: string, table: any) => {
    try {
      switch (action) {
        case 'edit':
          navigate(`/table-management/edit/${table.id}`, {
            state: {
              edit: true,
              datasetId: datasetId
            }
          });
          break;
        case 'view':
          navigate(`/table-management/view/${table.id}`);
          break;
        case 'publish':
          if (canPublish(table)) {
            transitionTable(
              { id: table.id, status: 'Live' },
              {
                onSuccess: () => {
                  showAlert('Table published successfully', 'success');
                  refetch();
                  handleMenuClose();
                },
                onError: (error) => {
                  showAlert('Failed to publish table', 'error');
                  console.error('Error in publishing table:', error);
                }
              }
            );
          } else {
            showAlert('Cannot publish table without metrics and dimensions', 'error');
          }
          break;
        case 'retire':
          transitionTable(
            { id: table.id, status: 'Retired' },
            {
              onSuccess: () => {
                showAlert('Table retired successfully', 'success');
                refetch();
                handleMenuClose();
              },
              onError: (error) => {
                showAlert('Failed to retire table', 'error');
                console.error('Error retiring table:', error);
              }
            }
          );
          break;
        case 'delete':
          setSelectedRollup(table);
          setDeleteDialogOpen(true);
          break;
      }
    } catch (error) {
      console.error('Error handling menu action:', error);
      showAlert('An error occurred while performing the action', 'error');
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedRollup) {
      transitionTable(
        { id: selectedRollup.id, status: 'Delete' },
        {
          onSuccess: () => {
            showAlert('Table deleted successfully', 'success');
            refetch();
            handleMenuClose();
            setDeleteDialogOpen(false);
          },
          onError: (error) => {
            showAlert('Failed to delete table', 'error');
            handleMenuClose();
            setDeleteDialogOpen(false);
          }
        }
      );
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleStatusChange = (event: any) => {
    setSelectedStatus(event.target.value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, table: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedRollup(table);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const canPublish = (table: any) => {
    const hasMetrics = Array.isArray(table?.spec?.metrics) && table.spec.metrics.length > 0;
    const hasDimensions = Array.isArray(table?.spec?.dimensions) && table.spec.dimensions.length > 0;
    return hasMetrics && hasDimensions;
  };

  const handleCreateClick = () => {
    navigate('/table-management/create', {
      state: {
        edit: false,
        datasetId,
        tableId: '',
        tableList // Pass the array of table IDs
      }
    });
  };

  const filteredTables = useMemo(() => {
    // First, get the parent record
    const parentRecord = tables.find((table: any) => table.is_primary);

    // Then filter other tables
    const otherTables = tables.filter((table: any) => {
      if (table.is_primary) return false;
      const matchesStatus = selectedStatus === 'all' || table.status === selectedStatus;
      const matchesType = selectedType === 'all' || table.type === selectedType;
      return matchesStatus && matchesType;
    });

    // Combine parent record with filtered tables
    return parentRecord ? [parentRecord, ...otherTables] : otherTables;
  }, [tables, selectedStatus, selectedType]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load rollups. Please try again.</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
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
      <Box mb={2}>
        <Typography variant="h1">
          Tables List
        </Typography>
      </Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={selectedStatus}
            onChange={handleStatusChange}
            size='small'
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="Draft">Draft</MenuItem>
            <MenuItem value="Live">Live</MenuItem>
            <MenuItem value="Retired">Retired</MenuItem>
          </Select>
        </FormControl>
        <Box>
          <Button
            size='small'
            variant="contained"
            color="primary"
            onClick={handleCreateClick}
          >
            Add Table
          </Button>
        </Box>
      </Box>

      {filteredTables.length === 0 ? (
        <Box className={styles.cardContainerActive} sx={{ justifyContent: 'center' }}>
          <Typography variant="body1" sx={{ py: 2 }}>
            No records found
          </Typography>
        </Box>
      ) : (
        filteredTables.map((table: any) => (
          <Box
            key={table.id + "" + table.status}
            className={table.status === 'Retired' ? styles.cardContainerRetired : styles.cardContainerActive}
          >
            <Grid container direction="row" sx={{ flex: 1 }}>
              <Grid item xs={2} className={styles.statusGridItem}>
                <Typography variant="captionMedium" color="textSecondary">
                  Name
                </Typography>
                <Typography variant="caption">
                  {table.is_primary ? `${table.name || table.id}` : table.name}
                </Typography>
              </Grid>
              <Grid item xs={1.5} className={styles.statusGridItem}>
                <Typography variant="captionMedium" color="textSecondary">
                  Status
                </Typography>
                <Typography variant="caption">{table.status}</Typography>
              </Grid>
              <Grid item xs={1.5} className={styles.statusGridItem}>
                <Typography variant="captionMedium" color="textSecondary">
                  Granularity
                </Typography>
                <Typography variant="caption">
                  {granularityOptions.find(option =>
                    option.value === (table?.metadata?.spec?.granularity || table?.spec?.granularity || table?.metadata?.granularity)
                  )?.label || ''}
                </Typography>
              </Grid>
              <Grid item xs={1.5} className={styles.statusGridItem}>
                <Typography variant="captionMedium" color="textSecondary">
                  Table Type
                </Typography>
                <Typography variant="caption">{table?.metadata?.spec?.rollup || table?.spec?.rollup ? "Aggregate" : "Subset"}</Typography>
              </Grid>
              {table.status === 'Retired' && (
                <>
                  <Grid item xs={1} className={styles.gridItemNoBorder}>
                    <Typography variant="captionMedium" color="textSecondary">
                      Volume
                    </Typography>
                    <Typography variant="caption">0</Typography>
                  </Grid>
                  <Grid item xs={1} className={styles.gridItemNoBorder}>
                    <Typography variant="captionMedium" color="textSecondary">
                      Size
                    </Typography>
                    <Typography variant="caption">0 MB</Typography>
                  </Grid>
                </>
              )}
              {table.status === 'Draft' && (
                <Grid item xs={4.5} className={styles.draftStatusContainer}>
                  <Box className={styles.draftStatusGroup}>

                    <TableStatusCheckboxes
                      metrics={table?.spec?.metrics || []}
                      dimensions={table?.spec?.dimensions || []}
                    />
                  </Box>
                </Grid>
              )}
            </Grid>
            {!table.is_primary && table.status !== 'Retired' && (
              <Box className={styles.menu}>
                <IconButton
                  onClick={(e) => handleMenuOpen(e, table)}
                  size="small"
                >
                  <MoreVertIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        ))
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {menuActions
          .filter(action => action.showForStatus.includes(selectedRollup?.status))
          .map((action) => {
            const Icon = action.icon;
            return (
              <MenuItem
                key={action.label}
                onClick={() => {
                  handleMenuAction(action.action, selectedRollup);
                  handleMenuClose();
                }}
              >
                <Icon color="primary" fontSize="small" sx={{ mr: 1 }} />
                {action.label}
              </MenuItem>
            );
          })}
      </Menu>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          <Typography variant='h1'>Confirm Delete</Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this table? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button size='small' onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button size='small' variant='contained' onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RollupsList;
