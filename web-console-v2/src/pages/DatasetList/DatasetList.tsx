import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import _ from 'lodash';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import PostAddIcon from '@mui/icons-material/PostAdd';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined';
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import { Box, Button, Grid, Typography } from '@mui/material';
import DatasetListCard from './DatasetlistCard';
import ErrorPage from '../../components/Error/Error';
import Loader from '../../components/Loader';
import EditDatasetTags from './EditDatasetTags';
import AlertDialog from '../../components/AlertDialog/AlertDialog';
import FilterdropDown from '../../components/FilterdropDown/FilterdropDown';
import { Dataset, FilterCriteria } from '../../types/dataset';
import { DatasetStatus, DatasetType } from 'types/datasets';
import { useDatasetExport, usePublishDataset, useUpdateDataset, filterDatasets, combineDatasetWithHealth, datasetRead, datasetConfigStatus } from 'services/dataset';
import styles from './DatasetList.module.css';
import ImportDataset from './ImportDataset';
import { FormattedMessage } from 'react-intl';
import { ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { useAlert } from '../../contexts/AlertContextProvider';

const errorTitle = 'Oops! Looks like something went wrong.';
const errorMessage = 'Unable to fetch the Datasets, please Retry.';

interface Action {
  label: string;
  icon: React.ElementType;
  type: string;
}

const transitionActions = new Set([
  'Live',
  'ReadyToPublish',
  'Retire',
  'Delete',
]);

const allActions: Action[] = [
  { label: 'View Dataset', icon: VisibilityOutlinedIcon, type: 'View' },
  { label: 'Metrics', icon: SpeedOutlinedIcon, type: 'Metrics' },
  { label: 'Create Events', icon: StorageOutlinedIcon, type: 'Events' },
  { label: 'Publish', icon: NearMeOutlinedIcon, type: 'Live' },
  { label: 'Edit Tags', icon: NoteAltOutlinedIcon, type: 'Edit_tag' },
  { label: 'Edit', icon: EditOutlinedIcon, type: 'Edit' },
  { label: 'Export Dataset', icon: IosShareOutlinedIcon, type: 'Export' },
  { label: 'Delete', icon: DeleteOutlineOutlinedIcon, type: 'Delete' },
  { label: 'Retire', icon: NotInterestedOutlinedIcon, type: 'Retire' },
];

const excludedActions: Record<string, string[]> = {
  Draft: ['Live', 'Retire', 'Export', 'View', 'Metrics', 'Events', 'Rollup'],
  ReadyToPublish: ['Retire', 'View', 'Metrics', 'Events', 'Rollup'],
  Live: ['Live', 'Delete', 'Edit_tag',],
  Retired: ['Delete', 'Live', 'Retire', 'Edit_tag', 'Edit', 'View', 'Metrics', 'Events', 'Rollup'],
};
const defaultFilters = {
  status: ['Draft', 'ReadyToPublish', 'Live', 'Retired'],
  connector: ['File', 'Database', 'Application'],
  tag: ['Master Data', 'Transactional Data', 'Schema Data'],
};

const statusLabelMap: Record<string, string> = {
  Draft: 'Draft',
  ReadyToPublish: 'Ready To Publish',
  Live: 'Live',
  Retired: 'Retired',
};

const connectorLabelMap = {
  File: 'File',
  Database: 'Database',
  Application: 'Application',
};

const tagLabelMap = {
  'Master Data': 'Master Data',
  'Transactional Data': 'Transactional Data',
  'Schema Data': 'Schema Data',
};

const getStatusLabel = (status: string): string => {
  return statusLabelMap[status] || status;
};

const DatasetList: React.FC = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  type AlertType = 'success' | 'error' | 'warning' | 'info';

  const [openModal, setOpenModal] = useState(false);
  const handleOpen = () => setOpenModal(true);
  const handleClose = () => setOpenModal(false);
  const { mutate: updateDataset } = useUpdateDataset();
  const { mutate: exportDataset } = useDatasetExport();
  const datasetTransition = usePublishDataset();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [editTagsAnchorEl, setEditTagsAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<{
    datasetId: string;
    actionType: string;
  } | null>(null);

  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    status: ['Draft', 'Live', 'ReadyToPublish'],
    connector: [],
    tag: [],
  });
  const [searchText, setSearchText] = useState<string>('');
  const [sortCriteria, setSortCriteria] = useState<string>('last_updated_on');

  const handleSortChange = (value: string) => {
    setSortCriteria(value);
    if (value === 'last_updated_on') {
      const sortedDatasets = [...datasets].sort((a, b) => {
        const dateA = new Date(a.updated_date).getTime();
        const dateB = new Date(b.updated_date).getTime();
        return dateB - dateA;
      });
      setFilteredDatasets(sortedDatasets);
    } else {
      setFilteredDatasets(datasets);
    }

  };

  const updateFilteredDatasets = useCallback(
    (data: Dataset[]) => {
      const filtered = filterDatasets(data, filterCriteria, searchText);
      const sortedFilteredDatasets = [...filtered];

      if (sortCriteria === 'last_updated_on') {
        sortedFilteredDatasets.sort((a, b) => {
          const dateA = new Date(a.updated_date).getTime();
          const dateB = new Date(b.updated_date).getTime();
          return dateB - dateA;
        });
      }
      setFilteredDatasets(sortedFilteredDatasets);
    },
    [filterCriteria, searchText, sortCriteria],
  );

  const filterUndefined = (arr: (string | undefined)[]): string[] =>
    arr.filter((item): item is string => item !== undefined);

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { datasets } = await combineDatasetWithHealth();

      const statuses = Array.from(
        new Set(datasets.map((dataset) => dataset.status)),
      );
      const tags = Array.from(
        new Set(datasets.flatMap((dataset) => dataset.tags || [])),
      );
      const connectors: string[] = [];

      const validFilterStatus = filterUndefined(filterCriteria.status);
      const validFilterConnector = filterUndefined(filterCriteria.connector);
      const validFilterTag = filterUndefined(filterCriteria.tag);

      const updatedFilters: FilterCriteria = {
        status: [
          ...validFilterStatus,
          ...statuses.filter((status) => !validFilterStatus.includes(status)),
        ],
        connector: [
          ...validFilterConnector,
          ...connectors.filter(
            (connector) => !validFilterConnector.includes(connector),
          ),
        ],
        tag: [
          ...validFilterTag,
          ...tags.filter((tag) => !validFilterTag.includes(tag)),
        ],
      };
      const mergedFilters: FilterCriteria = {
        status:
          updatedFilters.status.length > 0
            ? _.union(defaultFilters.status, updatedFilters.status)
            : defaultFilters.status,
        connector: _.union(defaultFilters.connector, updatedFilters.connector),
        tag: _.union(defaultFilters.tag, updatedFilters.tag),
      };

      setFilters(mergedFilters);

      setDatasets(datasets);
      updateFilteredDatasets(datasets);
    } catch (fetchError) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  // }, [updateFilteredDatasets]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  useEffect(() => {
    updateFilteredDatasets(datasets);
  }, [datasets, updateFilteredDatasets]);


  const handleFilterChange = (filterName: string, values: string[]) => {
    setFilterCriteria((prevCriteria) => ({
      ...prevCriteria,
      [filterName]: values,
    }));
    updateFilteredDatasets(datasets);
    // loadDatasets();
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  const getActionsByStatus = (status: string, dataset: any): Action[] => {
    const isOlapEnabled = _.get(dataset, "dataset_config.indexing_config.olap_store_enabled");
    const excludedOptions = _.cloneDeep(excludedActions);
    if (isOlapEnabled) {
      excludedOptions['Live'] = _.uniq([...(excludedOptions['Live'])]);
    }
    else{
      excludedOptions['Live'] = _.uniq([...(excludedOptions['Live']),'Rollup']);
    }
    return allActions.filter(
      (action) => !excludedOptions[status]?.includes(action.type),
    );
  }

  const showAlertMessage = (datasetName: string, type: AlertType, action: string) => {
    if (type === 'success') {
      showAlert(`${action} performed on ${datasetName} Successfully`, 'success');
    } else if (type === 'error') {
      showAlert(`${datasetName} ${action} Failed`, 'error');
    }
  };

  const handleMenu = async (
    event: React.MouseEvent<HTMLElement> | undefined,
    datasetId: string,
    actionType: string,
  ) => {
    const dataset = datasets.find((ds) => ds.dataset_id === datasetId);

    if (dataset === undefined) {
      return;
    }
    if (actionType === 'Delete') {
      setPendingAction({ datasetId, actionType });
      setShowModal(true);
      return;
    }

    if (transitionActions.has(actionType)) {
      await handleTransition(dataset, actionType);
    } else if (actionType === 'Edit_tag') {
      if (event && dataset) {
        handleOpenEditTagsPopover(event, dataset);
      }
    } else if (actionType === 'Export') {
      if (dataset) {
        const fileName = `${dataset?.name}_${dataset?.status}_${dataset?.version}`;
        handleExportDataset(dataset, fileName);
      }
    } else if (actionType === 'Edit') {
      await datasetRead({ datasetId: `${dataset?.dataset_id}?mode=edit&fields=data_schema,version_key,name,type,dataset_config,connectors_config,dataset_id` });
      navigate(`/dataset/edit/ingestion/schema/${dataset?.dataset_id}`);
    } else if (actionType === 'View') {
      const isMaster: boolean = dataset?.type === DatasetType.MasterDataset;
      navigate(`/datasets/view/${dataset?.dataset_id}?master=${isMaster}&status=${DatasetStatus.Live}`);
    } else if (actionType === 'Metrics') {
      navigate(`/datasets/metrics/${dataset?.dataset_id}`);
    } else if (actionType === 'Events') {
      navigate(`/datasets/addEvents/${dataset?.dataset_id}`);
    }
  };

  const handleTransition = async (dataset: Dataset, actionType: string) => {
    try {
      setLoading(true);
      const { dataset_id } = dataset;
      const payload = {
        dataset_id: dataset.dataset_id,
        status: actionType
      };
      datasetTransition.mutate(
        { payload },
        {
          onSuccess: async () => {
            showAlertMessage(dataset.name, 'success', actionType);
            const { datasets } = await combineDatasetWithHealth();
            setDatasets(datasets);
            setLoading(false);
          },
          onError: (error) => {
            showAlertMessage(dataset.name, 'error', actionType);
            setLoading(false);
          }
        }
      );
    } catch (error) {
      showAlertMessage(dataset.name, 'error', actionType);
      setLoading(false);
    }
  };
  const handleOpenEditTagsPopover = (
    event: React.MouseEvent<HTMLElement>,
    dataset: Dataset,
  ) => {
    setEditTagsAnchorEl(event.currentTarget);
    setSelectedDataset(dataset);
  };

  const handleCloseEditTagsPopover = () => {
    setEditTagsAnchorEl(null);
    setSelectedDataset(null);
  };
  const handleEditTagsSave = async (
    dataset: Dataset,
    tags: string[],
    initialTags: string[],
  ) => {
    try {
      setLoading(true);
      const { dataset_id, version_key } = dataset;

      const tagsToAdd = tags.filter(tag => !initialTags.includes(tag));
      const tagsToRemove = initialTags.filter(tag => !tags.includes(tag));

      const payload = {
        dataset_id,
        version_key,
        tags: [
          ...tagsToAdd.map((tag) => ({
            value: _.startCase(tag),
            action: 'upsert',
          })),
          ...tagsToRemove.map((tag) => ({
            value: _.startCase(tag),
            action: 'remove',
          })),
        ],
      };

      await updateDataset({ data: payload });
      setLoading(false);
      showAlertMessage(dataset.name, 'success', 'Edit Tags');
      setDatasets((prevDatasets) =>
        prevDatasets.map((ds) =>
          ds.dataset_id === dataset.dataset_id ? { ...ds, tags } : ds,
        ),
      );
    } catch (error) {
      showAlertMessage(dataset.name, 'error', 'Edit Tags');
      setLoading(false);
    }
  };


  const handleModalConfirm = async () => {
    if (pendingAction) {
      const { datasetId, actionType } = pendingAction;
      const dataset = datasets.find((ds) => ds.dataset_id === datasetId);

      if (dataset) {
        await handleTransition(dataset, actionType);
        setShowModal(false);
        setPendingAction(null);
      }
    }
  };

  const handleModalCancel = () => {
    setPendingAction(null);
    setShowModal(false);
  };

  const handleExportDataset = async (dataset: Dataset, fileName: string) => {
    try {
      setLoading(true);
      const datasetParams = { dataset_id: dataset?.dataset_id, status: dataset?.status, fileName: fileName };
      exportDataset(datasetParams);
      setLoading(false);
      showAlertMessage(dataset.name, 'success', 'export');
    } catch (error) {
      showAlertMessage(dataset.name, 'error', 'export');
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) return <Loader loading={loading} />;
    if (error)
      return (
        <ErrorPage
          onRetry={loadDatasets}
          title={errorTitle}
          message={errorMessage}
        />
      );
    if (filteredDatasets.length === 0)
      return (
        <Typography className={styles.noDatasets}>
          No datasets available
        </Typography>
      );
    return filteredDatasets.map((dataset) => (
      <DatasetListCard
        key={`${dataset.dataset_id}-${dataset.status}`}
        dataset={dataset}
        draftDatasetConfigStatus={datasetConfigStatus(dataset)}
        actions={() => getActionsByStatus(dataset.status, dataset)}
        onMenuAction={(event, datasetId: string, actionType: string) => {
          handleMenu(event, datasetId, actionType);
        }}
      />
    ));
  };

  const actions = [{
    id: "import",
    label: <FormattedMessage id="dataset-actions-import" />,
    icon: <ImportOutlined />,
    onClick: handleOpen,
    disabled: false
  }, {
    id: "add-dataset",
    label: <FormattedMessage id="dataset-actions-add-dataset" />,
    onClick: () => navigate(`/dataset/create`),
    icon: <PlusOutlined />,
    disabled: false
  }]

  const renderDatasetActions = (action: Record<string, any>) => {
    const { id, label, onClick, disabled, icon } = action;
    return <Button key={id}
      startIcon={icon}
      size="small" type="button" disabled={disabled} onClick={onClick}
      sx={{
        mx: 1,
        borderColor: 'primary.main',
        color: 'primary.main',
        '&:hover': {
          backgroundColor: 'primary.main',
          color: 'white',
          borderColor: 'primary.main',
        },
      }} variant="outlined">{label}
    </Button>
  }

  return (
    <div className={styles.mainContainer}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="majorh4">All Datasets</Typography>
        <Grid>
          {_.map(actions, renderDatasetActions)}
        </Grid>
      </Box>

      <FilterdropDown
        filters={filters}
        filterCriteria={filterCriteria}
        onFilterChange={handleFilterChange}
        onSearchChange={handleSearchChange}
        statusLabelMap={statusLabelMap}
        connectorLabelMap={connectorLabelMap}
        tagLabelMap={tagLabelMap}
        onSortChange={handleSortChange}
        sortCriteria={sortCriteria}
      />
      {renderContent()}
      <ImportDataset
        open={openModal}
        onClose={handleClose}
        setOpen={setOpenModal}
      />

      <AlertDialog
        open={showModal}
        handleClose={handleModalCancel}
        action={handleModalConfirm}
        context={{
          title: "Confirm Deletion",
          content: `Are you sure you want to delete the dataset "${pendingAction ? datasets.find(ds => ds.dataset_id === pendingAction.datasetId)?.name : ''}"?`,
          show: true
        }}
      />

      {selectedDataset && (
        <EditDatasetTags
          dataset={selectedDataset}
          open={Boolean(editTagsAnchorEl)}
          anchorEl={editTagsAnchorEl}
          handleClose={handleCloseEditTagsPopover}
          handleSave={handleEditTagsSave}
        />
      )}
    </div>
  );
};

export default DatasetList;
