import {skipToken, useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { http } from './http';
import axios, { AxiosResponse } from 'axios';
import _ from 'lodash';
import { fetchLocalStorageItem, storeLocalStorageItem } from 'utils/localStorage';
import { generateRequestBody, setDatasetId, setVersionKey, transformResponse } from './utils';
import {
    DATASET_ENDPOINTS,
    DatasetTransition,
    createDataset as createDatasetRequest,
    datasetExists as datasetExistsRequest,
    datasetStatusTransitionResponse,
    fieldsByStatus as datasetFieldsByStatus,
    generateDataSchema,
    generateUploadUrls,
    listConnectorsResponse,
    listDatasets,
    readConnector,
    readDataset,
    updateDataset as updateDatasetRequest,
    uploadToPresignedUrl
} from './datasetApi';
import { queryClient } from 'queryClient';
import { DatasetStatus } from 'types/datasets';
import { generateDatasetState } from './datasetState';
import { downloadJsonFile } from 'utils/downloadUtils';
import { Dataset, FilterCriteria } from 'types/dataset';
import { fetchChartData } from './clusterMetrics';
import chartMeta from 'data/chartsComponents';
import { druidQueries } from 'services/druid';
import dayjs from 'dayjs';
import useLocalStorage from 'hooks/useLocalStorage';

// URL strings and the plain-async wrappers live in `datasetApi.ts`, so these
// hooks and the AI assistant executor share one definition per endpoint.
const ENDPOINTS = {
    DATASETS_READ: DATASET_ENDPOINTS.DATASETS_READ,
    CREATE_DATASET: DATASET_ENDPOINTS.CREATE_DATASET,
    UPLOAD_FILES: DATASET_ENDPOINTS.GENERATE_URL,
    GENERATE_JSON_SCHEMA: DATASET_ENDPOINTS.GENERATE_DATA_SCHEMA,
    UPDATE_DATASCHEMA: DATASET_ENDPOINTS.UPDATE_DATASET,
    LIST_DATASET: DATASET_ENDPOINTS.LIST_DATASET,
    DATASETS_DIFF: DATASET_ENDPOINTS.DATASETS_DIFF,
    PUBLISH_DATASET: DATASET_ENDPOINTS.STATUS_TRANSITION,
    LIST_CONNECTORS: DATASET_ENDPOINTS.LIST_CONNECTORS,
    READ_CONNECTORS: DATASET_ENDPOINTS.READ_CONNECTORS,
    DATASET_EXISTS: DATASET_ENDPOINTS.DATASET_EXISTS,
    DATASET_EXPORT: DATASET_ENDPOINTS.DATASET_EXPORT,
    DATASET_HEALTH: DATASET_ENDPOINTS.DATASET_HEALTH,
    DRUID_DATASOURCE: DATASET_ENDPOINTS.DRUID_DATASOURCE
};

export const endpoints = ENDPOINTS

const metricsStaleTime = 60000;

export const useFetchDatasetsById = ({
        datasetId,
        queryParams
    }: {
        datasetId: string;
        queryParams: string;
    }) => {
    return useQuery({
        queryKey: ['fetchDatasetsById', 'datasetId', 'status', queryParams],
        queryFn: () => http.get(`${ENDPOINTS.DATASETS_READ}/${datasetId}?${queryParams}`).then((response: AxiosResponse) => {
            setDatasetId(_.get(response, ['data', 'result', 'dataset_id']))
            setVersionKey(_.get(response, ['data', 'result', 'version_key']));
            return _.get(response, ['data', 'result'])
        }),
        enabled: !!datasetId
    } as UseQueryOptions<any, Error>);
};

export const useReadUploadedFiles = ({ filenames }: { filenames: string[] }) => {
    const request = generateRequestBody({
        request: {
            files: filenames,
            access: 'read'
        },
        apiId: 'api.files.generate-url'
    });
    return useQuery({
        queryKey: ['generateUrl'],
        queryFn: () => http.post(`${ENDPOINTS.UPLOAD_FILES}`, request).then(transformResponse),
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ['fetchDatasetsById', 'datasetId'] });
            queryClient.invalidateQueries({ queryKey: ['fetchDatasetsById', 'datasetId'] });
        },

        enabled: !!filenames.length
    } as UseQueryOptions<any, Error>);
};

export const useUploadUrls = () =>
    useMutation({
        mutationFn: ({ files }: any) => generateUploadUrls(_.map(files, 'path'), 'write'),
        onSuccess() {
            queryClient.removeQueries({ queryKey: ['fetchDatasetsById', 'datasetId'] });
            queryClient.invalidateQueries({ queryKey: ['fetchDatasetsById', 'datasetId'] });
        }
    });

export const useUploadToUrl = () =>
    useMutation({
        mutationFn: ({ url, file }: any) => uploadToPresignedUrl(url, file)
    });

export const useCreateDataset = () =>
    useMutation({
        mutationFn: ({ payload = {} }: any) => createDatasetRequest(payload),
        onSuccess: (response, variables) => {
            setVersionKey(_.get(response, 'version_key'));
            setDatasetId(_.get(response, 'id'));
        }
    });

export const useGenerateJsonSchema = () =>
    useMutation({
        mutationFn: ({ payload }: any) => generateDataSchema(payload),
        onSuccess() {
            queryClient.invalidateQueries({ queryKey: ['fetchDatasetsById'] });
        }
    });

export const useUpdateDataset = () =>
    useMutation({
        mutationFn: ({ data }: any) =>
            updateDatasetRequest({
                ...data,
                // The wizard keeps its historical fallback; the assistant
                // executor always passes an explicit version_key.
                version_key: data.version_key || fetchLocalStorageItem('version_key')
            }),
        onSuccess: (response) => {
            queryClient.invalidateQueries({
                queryKey: ['fetchDatasetsById', 'datasetId', 'status'],
                exact: false
            });
            setVersionKey(_.get(response, ['version_key']));
        }
    });

export const useDatasetList = ({ status }: { status: string[] }) =>
    useQuery({
        queryKey: ['datasetList'],
        queryFn: () => listDatasets({ status })
    });

export const useFetchDatasetDiff = ({ datasetId }: { datasetId: string }) => {
    return useQuery({
        queryKey: ['fetchDatasetDiff'],
        queryFn: () => http.get(`${ENDPOINTS.DATASETS_DIFF}/${datasetId}`).then((res) => res.data),
        enabled: !!datasetId
    });
};

export const useFetchDatasetExists = ({ datasetId }: { datasetId: string }) => {
    return useQuery({
        queryKey: ['fetchDatasetExists'],
        queryFn: () => (datasetId ? datasetExistsRequest(datasetId) : skipToken),
    });
};

export const usePublishDataset = () =>
    useMutation({
        mutationFn: ({ payload = {} }: any) =>
            datasetStatusTransitionResponse(payload.dataset_id, payload.status as DatasetTransition)
    });

export const useConnectorsList = () =>
    useMutation({
        mutationFn: ({ payload = {} }: any) => listConnectorsResponse(_.get(payload, 'filters', {}))
    });

export const useReadConnectors = ({ connectorId }: { connectorId: string | null }) => {
    return useQuery({
        queryKey: ['connectorId'],
        queryFn: () => readConnector(connectorId as string),
        enabled: !!connectorId
    });
};

export const datasetRead = ({ datasetId, config = {} }: any) => {
    return http.get(`${ENDPOINTS.DATASETS_READ}/${datasetId}`, {
        ...config
    })
}

export const formatNewFields = (newFields: Record<string, any>, dataMappings: any) => {
    if (newFields.length > 0) {
        const final = _.map(newFields, (item: any) => {
            const columnKey = _.join(_.map(_.split(_.get(item, "column"), '.'), payload => `properties.${payload}`), '.')
            return {
                ...item,
                "column": item.column,
                "type": _.get(item, 'datatype') || "string",
                "key": columnKey,
                "ref": columnKey,
                "isModified": true,
                "required": false,
                "data_type": _.get(item, 'datatype'),
                ...(dataMappings && { "arrival_format": getArrivalFormat(_.get(item, '_transformedFieldSchemaType'), dataMappings) || _.get(item, 'arrival_format') })
            }
        });
        return final;
    }
    else return [];
}

const getArrivalFormat = (data_type: string | undefined, dataMappings: Record<string, any>) => {
    let result = null;
    if (data_type) {
        _.forEach(dataMappings, (value, key) => {
            if (_.includes(_.get(value, 'arrival_format'), data_type)) {
                result = key;
            }
        });
    }
    return result;
}

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const getDatasetState = async (datasetId: string, status: string = DatasetStatus.Draft, createAction: boolean = false) => {
    const dataset = await fetchDataset(datasetId, status);
    return await generateDatasetState(dataset, createAction);
}


export const fieldsByStatus = datasetFieldsByStatus;

export const fetchDataset = (datasetId: string, status: string) =>
    readDataset({ datasetId, status });

export const transform = (response: any) => _.get(response, 'data.result')

export const generateJsonSchema = (payload: any) => generateDataSchema(payload?.data);

export const isJsonSchema = (jsonObject: any) => {
    if (typeof jsonObject !== "object" || jsonObject === null) {
        return false;
    }
    const schemaKeywords = [
        "$schema",
        "type",
        "properties",
        "required",
        "additionalProperties",
        "definitions",
        "items",
        "allOf",
        "oneOf",
        "anyOf",
        "not",
    ];

    const hasSchemaKeyword = schemaKeywords.some((keyword) =>
        Object.prototype.hasOwnProperty.call(jsonObject, keyword)
    );

    if (!hasSchemaKeyword) {
        return false;
    } else {
        return true;
    }
}

export const useDatasetExport = () => 
     useMutation({
        mutationFn: async ({dataset_id, status, fileName}: any) => {
            const response = await http.get(`${ENDPOINTS.DATASET_EXPORT}/${dataset_id}?status=${status}`);
            return transformResponse(response);
        },
        onSuccess: (response, fileName) => {
            if (response) {
                downloadJsonFile(response, fileName.fileName);
            }
        }
    });

export const useDatasetHealth = () => 
    useMutation({
        mutationFn: async ({ payload = {} }: any) => {
            const request = generateRequestBody({
                request: payload,
                apiId: 'api.datasets.health'
            });
            const response = await http.post(`${ENDPOINTS.DATASET_HEALTH}`, request);
            return response?.data?.result?.status;
        },
    });
      
export const combineDatasetWithHealth = async (): Promise<{ datasets: Dataset[] }> => {
    try {
        const request = generateRequestBody({
            request: { filters: { status: [] } },
            apiId: 'api.datasets.list'
        });
    
        const datasets = await http.post(`${ENDPOINTS.LIST_DATASET}`, request).then(transformResponse);
        
        const datasetHealthPromises = datasets.data.map(async (dataset: Dataset) => {
            if (dataset.status === 'Live') {
                const request = generateRequestBody({
                    request: {
                        dataset_id: dataset?.dataset_id,
                        categories: ['infra', 'processing'],
                    },
                    apiId: 'api.datasets.health'
                });
                const health = await http.post(`${ENDPOINTS.DATASET_HEALTH}`, request).then(transformResponse);
                return {
                    ...dataset,
                    current_health: health?.status
                };
            }
            return dataset;
        });
        const datasetsWithHealth = await Promise.all(datasetHealthPromises);
        return { datasets: datasetsWithHealth };
    } catch (error) {
        console.error('Error combining dataset with health:', error);
        throw error;
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

 export const datasetConfigStatus = (dataset: Dataset) => {
    let isConnectorFilled = false;
    const connectorRequiredFields = ['id', 'connector_id', 'connector_config', 'version'];
    if (!_.isEmpty(dataset?.connectors_config)) {
      isConnectorFilled = _.every(dataset.connectors_config, connector => {
        const allFieldsFilled = _.every(connectorRequiredFields, key => !_.isEmpty((connector as any)[key]));
        // const operationsConfigFilled = connector?.operations_config ? !_.isEmpty(connector.operations_config) : true;
        return allFieldsFilled;
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
    return { isIngestionFilled, isProcessingFilled, isStorageFilled, progress, isConnectorFilled };
  }

  export function useQueryWithLocalStorageFallback<T>(
    key: string[], 
    queryFn: () => Promise<T>, 
    defaultValue: T
  ) {
    const [storedValue, setStoredValue] = useLocalStorage(key.join('-'), defaultValue);
  
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        try {
          const data = await queryFn();
          
          if (_.isArray(data) && data[1] === 'error') {
            return storedValue;
          }

          if (_.isPlainObject(data) && _.isEmpty(data)) {
            return storedValue;
          }
          
          setStoredValue(data);
          return data;
        } catch (error) {
          console.error('API call failed, using stored value', error);
          return storedValue;
        }
      },
      staleTime: metricsStaleTime,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      gcTime: metricsStaleTime * 5,
      placeholderData: storedValue
    });
  }

export const useTotalEvents = (datasetId: string, isMasterDataset: boolean) => {
    const dateFormat = 'YYYY-MM-DDT00:00:00+05:30';
    const startDate = '2000-01-01';
    const endDate = dayjs().format(dateFormat);
  
    return useQueryWithLocalStorageFallback(
      ['totalEvents', datasetId],
      () => fetchChartData({
        ..._.get(chartMeta, 'total_events_processed.query'),
        body: druidQueries.total_events_processed({
          datasetId,
          intervals: `${startDate}/${endDate}`,
          master: isMasterDataset
        })
      } as any),
      []
    );

  };
  
  export const useTotalEventsToday = (datasetId: string, isMasterDataset: boolean) => {
    const dateFormat = 'YYYY-MM-DDT00:00:00+05:30';
    const startDate = dayjs().format(dateFormat);
    const endDate = dayjs().add(1, 'day').format(dateFormat);
  
    return useQueryWithLocalStorageFallback(
      ['totalEventsToday', datasetId],
      () => fetchChartData({ 
        ..._.get(chartMeta, 'total_events_processed.query'), 
        body: druidQueries.total_events_processed({
          datasetId: datasetId,
          intervals: `${startDate}/${endDate}`,
          master: isMasterDataset
        })
      } as any),
      []
    );

  };
  
  export const useTotalEventsYesterday = (datasetId: string, isMasterDataset: boolean) => {
    const dateFormat = 'YYYY-MM-DDT00:00:00+05:30';
    const startDate = dayjs().subtract(1, 'day').format(dateFormat);
    const endDate = dayjs().format(dateFormat);
  
    return useQueryWithLocalStorageFallback(
      ['totalEventsYesterday', datasetId],
      () => fetchChartData({ 
        ..._.get(chartMeta, 'total_events_processed.query'), 
        body: druidQueries.total_events_processed({
          datasetId: datasetId,
          intervals: `${startDate}/${endDate}`,
          master: isMasterDataset
        })
      } as any),
      []
    );

  };
  
  export const useEventsFailedToday = (datasetId: string, isMasterDataset: boolean) => {
    return useQueryWithLocalStorageFallback(
      ['eventsFailedToday', datasetId],
      () => fetchChartData({
        ...(isMasterDataset 
          ? _.get(chartMeta, 'failed_events_summary_master_datasets.query')
          : _.get(chartMeta, 'failed_events_summary.query')),
        time: dayjs().endOf('day').unix(),
        dataset: datasetId,
        master: isMasterDataset,
      } as any),
      [0]
    );
  };

export const useDruidDatasource = () => {
    return useQueryWithLocalStorageFallback(
        ['druidDatasource'],
        async () => {
            try {
                const response = await http.get(ENDPOINTS.DRUID_DATASOURCE);
                if (!_.isArray(response.data)) return {};

                return response.data.reduce((acc: Record<string, number>, datasource: any) => {
                    const dataset_id = datasource.name.replace(/_events$/, '');
                    const size = datasource.properties?.segments?.replicatedSize || 0;
                    acc[dataset_id] = size;
                    return acc;
                }, {});
            } catch (error) {
                console.error('Error fetching druid datasource:', error);
                return {};
            }
        },
        {}
    );
}

export const getAllFields = async (datasetId: string, status: string = DatasetStatus.Draft) => {
    return http.get(`${DATASET_ENDPOINTS.GENERATE_FIELDS}/${datasetId}?status=${status}`)
}
