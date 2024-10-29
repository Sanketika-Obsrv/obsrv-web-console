import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import axios from 'axios';
import { Dataset, CopyDatasetRequest, FilterCriteria } from '../types/dataset';
import {
  DATASETS_LIST_ENDPOINT,
  DATASET_READ_ENDPOINT,
  DATASET_HEALTH_ENDPOINT,
  DATASET_STATUS_TRANSITION_ENDPOINT,
  DATASET_UPDATE_ENDPOINT,
  DATASET_EXPORT_ENDPOINT,
  DATASET_COPY_ENDPOINT,
} from './../constants/endpoints';

enum datasetStatus {
  Live = 'Live',
}

const axiosInstance = axios.create({
  baseURL: '/config/v2',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchDatasets = (): Promise<{ datasets: Dataset[] }> => {
  const msgId = uuidv4();
  return axiosInstance
    .post(DATASETS_LIST_ENDPOINT, {
      id: 'api.datasets.list',
      ver: 'v2',
      ts: new Date().toISOString(),
      params: {
        msgid: msgId,
      },
      request: {
        filters: {
          status: [],
        },
      },
    })
    .then((response) => {
      const datasets = response.data.result.data as Dataset[];
      return { datasets };
    })
    .catch((error) => {
      throw new Error('Error fetching datasets');
    });
};
export const fetchVersionKey = (datasetId: string): Promise<Dataset> => {
  return axiosInstance
    .get(DATASET_READ_ENDPOINT(datasetId))
    .then((response) => {
      const versionKey = response.data.result.version_key;
      return versionKey;
    });
};

export const getDatasetHealth = (datasetId: string): Promise<string> => {
  const msgId = uuidv4();
  return axiosInstance
    .post(DATASET_HEALTH_ENDPOINT, {
      id: 'api.datasets.health',
      ver: '2',
      ts: new Date().toISOString(),
      params: {
        msgid: msgId,
      },
      request: {
        dataset_id: datasetId,
        categories: ['infra', 'processing'],
      },
    })
    .then((response) => {
      if (response.data.responseCode === 'OK') {
        return response.data.result.status;
      } else {
        throw new Error('Failed to fetch health status');
      }
    });
};

export const combineDatasetWithHealth = async (): Promise<{
  datasets: Dataset[];
}> => {
  try {
    const { datasets } = await fetchDatasets();
    const datasetHealthPromises = datasets.map((dataset: Dataset) => {
      if (dataset.status === datasetStatus.Live) {
        return getDatasetHealth(dataset.dataset_id).then((health) => ({
          ...dataset,
          'Current Health': health,
        }));
      } else {
        return {
          ...dataset,
        };
      }
    });

    const combinedDatasets = await Promise.allSettled(
      datasetHealthPromises,
    ).then((results) => {
      return results.map(
        (result: PromiseSettledResult<Dataset>, index: number) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return {
              ...datasets[index],
              'Current Health': 'Failed to fetch',
            };
          }
        },
      );
    });

    return {
      datasets: combinedDatasets,
    };
  } catch (error) {
    throw new Error('Failed to combine datasets with health data');
  }
};

export const datasetTransition = (
  action: string,
  datasetId: string,
): Promise<void> => {
  const msgId = uuidv4();
  return axiosInstance
    .post(DATASET_STATUS_TRANSITION_ENDPOINT, {
      id: 'api.datasets.status-transition',
      ver: 'v2',
      ts: new Date().toISOString(),
      params: {
        msgid: msgId,
      },
      request: {
        dataset_id: datasetId,
        status: action,
      },
    })
    .then(() => {
      //
    })
    .catch((error) => {
      throw new Error(`Failed to ${action}`);
    });
};

export const editTags = async (
  dataset: Dataset,
  newTags: string[],
  initialTags: string[],
) => {
  try {
    const versionKey = await fetchVersionKey(dataset.dataset_id);

    const normalisedNewTags = _.uniq(_.map(newTags, _.toLower));
    const normalisedInitialTags = _.uniq(_.map(initialTags, _.toLower));

    const tagsToAdd = normalisedNewTags.filter(
      (tag) => !normalisedInitialTags.includes(tag),
    );
    const tagsToRemove = normalisedInitialTags.filter(
      (tag) => !normalisedNewTags.includes(tag),
    );

    const requestBody = {
      id: 'api.datasets.update',
      ver: 'v2',
      ts: new Date().toISOString(),
      params: {
        msgid: uuidv4(),
      },
      request: {
        dataset_id: dataset.dataset_id,
        version_key: versionKey,
        name: dataset.name,
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
      },
    };

    const response = await axiosInstance.patch(
      DATASET_UPDATE_ENDPOINT,
      requestBody,
    );
    return response.data;
  } catch (error) {
    throw new Error('Failed to update tags');
  }
};

export const exportDataset = async (dataset: Dataset) => {
  try {
    const response = await axiosInstance.get(
      DATASET_EXPORT_ENDPOINT(dataset.dataset_id, dataset.status),
      {
        responseType: 'blob',
      },
    );

    const blob = new Blob([response.data], { type: response.data.type });

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${dataset.name || 'dataset'}.json`;
    document.body.appendChild(link);

    link.click();
    link.remove();

    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    throw new Error(`Failed to export ${dataset.name}`);
  }
};

export const copyDataset = async (
  sourceDatasetId: string,
  destinationDatasetId: string,
  isLive: boolean,
): Promise<void> => {
  const requestBody: CopyDatasetRequest = {
    id: 'api.datasets.copy',
    ver: 'v2',
    ts: new Date().toISOString(),
    params: {
      msgid: uuidv4(),
    },
    request: {
      source: {
        datasetId: sourceDatasetId,
        isLive: isLive,
      },
      destination: {
        datasetId: destinationDatasetId,
      },
    },
  };

  try {
    const response = await axiosInstance.post(
      DATASET_COPY_ENDPOINT,
      requestBody,
    );
    if (response.data.responseCode !== 'OK') {
      throw new Error('Failed to copy dataset');
    }
  } catch (error) {
    throw new Error('Failed to copy dataset');
  }
};

export const filterDatasets = (
  datasets: Dataset[],
  criteria: FilterCriteria,
  search: string,
): Dataset[] => {
  return datasets.filter((dataset) => {
    const statusMatch =
      criteria.status.length === 0 || criteria.status.includes(dataset.status);

    const connectorMatch =
      criteria.connector.length === 0 ||
      (dataset.connector && criteria.connector.includes(dataset.connector));

    const tagMatch =
      criteria.tag.length === 0 ||
      (dataset.tags &&
        dataset.tags.some((tag) =>
          criteria.tag.some((ctag) => _.toLower(ctag).includes(_.toLower(tag))),
        ));

    const searchMatch =
      !search || _.includes(_.toLower(dataset.name ?? ''), _.toLower(search));

    return statusMatch && connectorMatch && tagMatch && searchMatch;
  });
};
