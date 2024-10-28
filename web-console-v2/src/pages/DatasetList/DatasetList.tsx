import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import _ from 'lodash';
import DatasetlistCard from '../../components/DatasetlistCard/DatasetlistCard';
import {
  combineDatasetWithHealth,
  filterDatasets,
  datasetTransition,
  editTags,
  exportDataset,
  copyDataset,
} from '../../services/DatasetServices';
import { Dataset, FilterCriteria } from '../../types/dataset';
import ErrorPage from '../../components/Error/Error';
import styles from './DatasetList.module.css';
import FilterdropDown from '../../components/FilterdropDown/FilterdropDown';
import { Typography } from '@mui/material';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FolderCopyOutlinedIcon from '@mui/icons-material/FolderCopyOutlined';
import IosShareOutlinedIcon from '@mui/icons-material/IosShareOutlined';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import Loader from '../../components/Loader';
import EditDatasetTags from '../../components/EditDatasetTags/EditDatasetTags';
import CopyDataset from '../../components/CopyDataset/CopyDataset';
import ConfirmationModal from '../../components/DatasetlistCard/Modal';
import CustomAlert from '../../components/CustomAlert/CustomAlert';
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
  { label: 'Delete', icon: DeleteOutlineOutlinedIcon, type: 'Delete' },
  { label: 'Edit', icon: EditOutlinedIcon, type: 'Edit' },
  { label: 'Make a Copy', icon: FolderCopyOutlinedIcon, type: 'make_copy' },
  { label: 'Export Dataset', icon: IosShareOutlinedIcon, type: 'Export' },
  { label: 'Edit Tags', icon: NoteAltOutlinedIcon, type: 'Edit_tag' },
  { label: 'Publish', icon: NearMeOutlinedIcon, type: 'Live' },
  { label: 'Retire', icon: NotInterestedOutlinedIcon, type: 'Retire' },
  // { label: 'Archive', icon: InboxOutlinedIcon, type: 'archive' },
];

const excludedActions: Record<string, string[]> = {
  Draft: ['Live', 'Retire', 'Export', 'archive'],
  ReadyToPublish: ['Retire', 'archive'],
  Live: ['Live', 'Delete'],
  Retired: ['Delete', 'Edit', 'Live', 'Retire'],
  Archived: ['Live', 'Retire', 'archive', 'Delete', 'Edit'],
};
const defaultFilters = {
  status: ['Live', 'ReadyToPublish', 'Retired', 'Archived', 'Draft'],
  connector: ['File', 'Database', 'Application'],
  tag: ['Master Data', 'Transactional Data', 'Schema Data'],
};

const DatasetList: React.FC = () => {
  const navigate = useNavigate();

  type AlertType = 'success' | 'error' | 'warning' | 'info';

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [editTagsAnchorEl, setEditTagsAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [copyPopoverOpen, setCopyPopoverOpen] = useState<boolean>(false);
  const [copyAnchorEl, setCopyAnchorEl] = useState<null | HTMLElement>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [alertOpen, setAlertOpen] = useState<boolean>(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('success');
  const [pendingAction, setPendingAction] = useState<{
    datasetId: string;
    actionType: string;
  } | null>(null);

  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    status: [],
    connector: [],
    tag: [],
  });
  const [searchText, setSearchText] = useState<string>('');

  const updateFilteredDatasets = useCallback(
    (data: Dataset[]) => {
      const filtered = filterDatasets(data, filterCriteria, searchText);
      setFilteredDatasets(filtered);
    },
    [filterCriteria, searchText],
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

  useEffect(() => {
    if (alertOpen) {
      const timer = setTimeout(() => {
        setAlertOpen(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alertOpen]);

  const handleFilterChange = (filterName: string, values: string[]) => {
    setFilterCriteria((prevCriteria) => ({
      ...prevCriteria,
      [filterName]: values,
    }));
    // loadDatasets();
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  const getActionsByStatus = (status: string): Action[] =>
    allActions.filter(
      (action) => !excludedActions[status]?.includes(action.type),
    );

  const showAlert = (datasetName: string, type: AlertType, action: string) => {
    if (type === 'success') {
      setAlertTitle(`${action} performed on ${datasetName}  Successfully`);
    } else if (type === 'error') {
      setAlertTitle(` ${datasetName} ${action} Failed`);
    }
    setAlertType(type);
    setAlertOpen(true);
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
      handleTransition(dataset, actionType);
    } else if (actionType === 'Edit_tag') {
      if (event && dataset) {
        handleOpenEditTagsPopover(event, dataset);
      }
    } else if (actionType === 'Export') {
      if (dataset) {
        handleExportDataset(dataset);
      }
    } else if (actionType === 'make_copy') {
      setSelectedDatasetId(datasetId);
      setCopyAnchorEl(event?.currentTarget ?? null);
      setCopyPopoverOpen(true);
    } else if (actionType === 'Edit') {
      navigate(`/home/ingestion/schema-details/${datasetId}`);
    }
  };

  const handleTransition = async (dataset: Dataset, actionType: string) => {
    try {
      setLoading(true);
      await datasetTransition(actionType, dataset.dataset_id);
      showAlert(dataset.name, 'success', actionType);
      const { datasets } = await combineDatasetWithHealth();
      setDatasets(datasets);
      setLoading(false);
    } catch (error) {
      showAlert(dataset.name, 'error', actionType);
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
      await editTags(dataset, tags, initialTags);
      setLoading(false);
      showAlert(dataset.name, 'success', 'Edit Tags');
      setDatasets((prevDatasets) =>
        prevDatasets.map((ds) =>
          ds.dataset_id === dataset.dataset_id ? { ...ds, tags } : ds,
        ),
      );
    } catch (error) {
      showAlert(dataset.name, 'error', 'Edit Tags');
      setLoading(false);
    }
  };

  const handleSaveCopy = async (
    sourceDatasetId: string,
    destinationDatasetId: string,
    isLive: boolean,
  ) => {
    try {
      setLoading(true);
      await copyDataset(sourceDatasetId, destinationDatasetId, isLive);

      handleCloseCopyPopover();
      const { datasets } = await combineDatasetWithHealth();
      setDatasets(datasets);
      setLoading(false);
      const sourceDataset = datasets.find(
        (ds) => ds.dataset_id === sourceDatasetId,
      );
      if (sourceDataset) {
        showAlert(sourceDataset.name, 'success', 'Copy');
      }
    } catch (error) {
      showAlert('Dataset', 'error', 'Copy');
    } finally {
      handleCloseCopyPopover();
      setLoading(false);
    }
  };

  const handleCloseCopyPopover = () => {
    setCopyPopoverOpen(false);
    setCopyAnchorEl(null);
  };

  const handleModalConfirm = () => {
    if (pendingAction) {
      const { datasetId, actionType } = pendingAction;
      const dataset = datasets.find((ds) => ds.dataset_id === datasetId);

      if (dataset) {
        handleTransition(dataset, actionType);
        setShowModal(false);
        setPendingAction(null);
      }
    }
  };

  const handleModalCancel = () => {
    setPendingAction(null);
    setShowModal(false);
  };

  const handleExportDataset = async (dataset: Dataset) => {
    try {
      setLoading(true);
      await exportDataset(dataset);
      setLoading(false);
      showAlert(dataset.name, 'success', 'export');
    } catch (error) {
      showAlert(dataset.name, 'error', 'export');
      setLoading(false);
    }
  };

  const datasetConfigStatus = (dataset: Dataset) => {
    const isConnectorPresent = !_.isEmpty(dataset?.connectors_config)
    let isConnectorFilled = false;
    const connectorRequiredFields = ['id', 'connector_id', 'connector_config', 'version'];
    if (!_.isEmpty(dataset?.connectors_config)) {
      isConnectorFilled = _.every(dataset.connectors_config, connector => {
        const allFieldsFilled = _.every(connectorRequiredFields, key => !_.isEmpty((connector as any)[key]));
        const operationsConfigFilled = connector?.operations_config ? !_.isEmpty(connector.operations_config) : true;
        return allFieldsFilled && operationsConfigFilled;
      });
    }

    const requiredFields = ['name', 'dataset_id', 'data_schema', 'type'];
    const isIngestionFilled = _.every(requiredFields, key => !_.isEmpty((dataset as any)[key]));

    const isValidationValid = _.get(dataset,'validation_config.validate') && _.get(dataset, 'validation_config.mode');
    const hasDenormFields = _.isArray(_.get(dataset, 'denorm_config.denorm_fields')) && !_.isEmpty(_.get(dataset, 'denorm_config.denorm_fields'));
    const isDedupChecked = _.get(dataset, 'dedup_config.drop_duplicates');
    const dedupValuesProvided = !_.isEmpty(_.get(dataset, 'dedup_config.dedup_key'));
    const isProcessingFilled = (
      isValidationValid &&
      (hasDenormFields || _.isEmpty(_.get(dataset, 'denorm_config.denorm_fields'))) &&
      (!isDedupChecked || (isDedupChecked && dedupValuesProvided))
    ) ? true : false;

    const olapStoreEnabled = _.get(dataset, 'dataset_config.indexing_config.olap_store_enabled');
    const lakehouseEnabled = _.get(dataset, 'dataset_config.indexing_config.lakehouse_enabled');
    const cacheEnabled = _.get(dataset, 'dataset_config.indexing_config.cache_enabled');

    const timestampKeyProvided = !!_.get(dataset, 'dataset_config.keys_config.timestamp_key');
    const dataKeyProvided = !!_.get(dataset, 'dataset_config.keys_config.data_key');
    const partitionKeyProvided = !!_.get(dataset, 'dataset_config.keys_config.partition_key');

    const isStorageFilled = (
      (!olapStoreEnabled || timestampKeyProvided) &&
      (!lakehouseEnabled || (dataKeyProvided && partitionKeyProvided)) &&
      (!cacheEnabled || dataKeyProvided)
    );

    let progress = 0;
    if (!_.isEmpty(dataset?.connectors_config)) {
      progress = (isIngestionFilled ? 25 : 0) +
        (isProcessingFilled ? 25 : 0) +
        (isStorageFilled ? 25 : 0) +
        (isConnectorFilled ? 25 : 0);
    } else {
      if (isIngestionFilled && isProcessingFilled && isStorageFilled) {
        progress = 100;
      } else {
        progress = (isIngestionFilled ? 33.33 : 0) +
                   (isProcessingFilled ? 33.33 : 0) +
                   (isStorageFilled ? 33.33 : 0);
      }
    }
    return { isIngestionFilled, isProcessingFilled, isStorageFilled, progress, isConnectorPresent, isConnectorFilled};
  }

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
      <DatasetlistCard
        key={dataset.dataset_id}
        dataset={dataset}
        actions={() => getActionsByStatus(dataset.status)}
        onMenuAction={(event, datasetId: string, actionType: string) => {
          handleMenu(event, datasetId, actionType);
        }}
      />
    ));
  };

  return (
    <div className={styles.mainContainer}>
      <Typography variant="majorh4">All Datasets</Typography>
      {alertOpen && <CustomAlert type={alertType} title={alertTitle} />}

      <FilterdropDown
        filters={filters}
        filterCriteria={filterCriteria}
        onFilterChange={handleFilterChange}
        onSearchChange={handleSearchChange}
      />
      {renderContent()}

      <CopyDataset
        open={copyPopoverOpen}
        anchorEl={copyAnchorEl}
        handleClose={handleCloseCopyPopover}
        sourceDatasetId={selectedDatasetId}
        handleSave={handleSaveCopy}
      />
      <ConfirmationModal
        open={showModal}
        onConfirm={handleModalConfirm}
        onClose={handleModalCancel}
        title="Confirm Deletion"
        message="Are you sure you want to delete this dataset?"
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
