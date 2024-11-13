import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { http } from './http';
import { AxiosResponse } from 'axios';
import _ from 'lodash';
import { fetchSessionStorageItem, storeSessionStorageItem } from 'utils/sessionStorage';
import { generateRequestBody, setDatasetId, setVersionKey, transformResponse } from './utils';
import { queryClient } from 'queryClient';

// const ENDPOINTS = {
//     DATASETS_READ: '/console/config/v2/datasets/read',
//     CREATE_DATASET: '/console/config/v2/datasets/create',
//     UPLOAD_FILES: '/console/config/v2/files/generate-url',
//     GENERATE_JSON_SCHEMA: '/console/config/v2/datasets/dataschema',
//     UPDATE_DATASCHEMA: '/console/config/v2/datasets/update',
//     LIST_DATASET: '/console/config/v2/datasets/list',
//     DATASETS_DIFF: '/console/api/dataset/diff',
//     PUBLISH_DATASET: '/console/config/v2/datasets/status-transition',
//     LIST_CONNECTORS: '/console/config/v2/connectors/list',
//     READ_CONNECTORS: '/console/config/v2/connectors/read'
// };

//USE THESE ROUTES FOR LOCAL TESTING

const ENDPOINTS = {
    DATASETS_READ: '/config/v2/datasets/read',
    CREATE_DATASET: '/config/v2/datasets/create',
    UPLOAD_FILES: '/config/v2/files/generate-url',
    GENERATE_JSON_SCHEMA: '/config/v2/datasets/dataschema',
    UPDATE_DATASCHEMA: '/config/v2/datasets/update',
    LIST_DATASET: '/config/v2/datasets/list',
    DATASETS_DIFF: '/api/dataset/diff',
    PUBLISH_DATASET: '/config/v2/datasets/status-transition',
    LIST_CONNECTORS: '/config/v2/connectors/list',
    READ_CONNECTORS: '/config/v2/connectors/read',
    DATASET_EXISTS: '/api/dataset/exists'
};

export const endpoints = ENDPOINTS

const configDetailKey = 'configDetails';

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
        mutationFn: async ({ files }: any) => {
            const payload = {
                files: _.map(files, 'path'),
                access: 'write'
            };
            const request = generateRequestBody({
                request: payload,
                apiId: 'api.files.generate-url'
            });

            const response = await http.post(ENDPOINTS.UPLOAD_FILES, request);
            return transformResponse(response);
        },
        onSuccess() {
            queryClient.removeQueries({ queryKey: ['fetchDatasetsById', 'datasetId'] });
            queryClient.invalidateQueries({ queryKey: ['fetchDatasetsById', 'datasetId'] });
        }
    });

export const useUploadToUrl = () =>
    useMutation({
        mutationFn: ({ url, file }: any) => {
            const formData = new FormData();

            formData.append('Content-Type', _.get(file, 'type'));

            formData.append('file', file);

            const headers = {
                'Content-Type': 'multipart/form-data',
                'x-ms-blob-type': 'BlockBlob'
            };

            return http.put(url, formData, { headers });
        }
    });

export const useCreateDataset = () =>
    useMutation({
        mutationFn: ({ payload = {}, config }: any) => {
            const request = generateRequestBody({
                request: payload,
                apiId: 'api.datasets.create'
            });

            return http.post(ENDPOINTS.CREATE_DATASET, request, config).then(transformResponse);
        },
        onSuccess: (response, variables) => {
            const configDetail = {
                version_key: _.get(response, 'version_key'),
                dataset_id: _.get(response, 'id')
            };

            storeSessionStorageItem(configDetailKey, configDetail);
        }
    });

export const useGenerateJsonSchema = () =>
    useMutation({
        mutationFn: ({ _data, payload }: any) => {
            const request = generateRequestBody({
                request: payload,
                apiId: 'api.datasets.dataschema'
            });

            return http.post(ENDPOINTS.GENERATE_JSON_SCHEMA, request).then(transformResponse);
        },
        onSuccess() {
            queryClient.invalidateQueries({ queryKey: ['fetchDatasetsById'] });
        }
    });

export const useUpdateDataset = () =>
    useMutation({
        mutationFn: ({ data }: any) => {
            if(data?.data_schema) {
                data['data_schema'] = omitSuggestions(data?.data_schema)
            }
            const configDetail = fetchSessionStorageItem('configDetails') || {};
            const request = generateRequestBody({
                request: {
                    ...data,
                    ..._.pick(configDetail, ['version_key'])
                },
                apiId: 'api.datasets.update'
            });

            return http.patch(ENDPOINTS.UPDATE_DATASCHEMA, request).then(transformResponse);
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({
                queryKey: ['fetchDatasetsById', 'datasetId', 'status'],
                exact: false
            });
            setVersionKey(_.get(response, ['version_key']));
        }
    });

export const useDatasetList = ({ status }: { status: string[] }) => {
    const request = generateRequestBody({
        request: { filters: { status } },
        apiId: 'api.datasets.list'
    });

    return useQuery({
        queryKey: ['datasetList'],
        queryFn: () => http.post(`${ENDPOINTS.LIST_DATASET}`, request).then(transformResponse)
    });
};

export const useFetchDatasetDiff = ({ datasetId }: { datasetId: string }) => {
    return useQuery({
        queryKey: ['fetchDatasetDiff'],
        queryFn: () => http.get(`${ENDPOINTS.DATASETS_DIFF}/${datasetId}`).then((res) => res.data),
        enabled: !!datasetId
    });
};

export const useFetchDatasetExists = ({ datasetId }: { datasetId: string }) => {
    return useQuery({
        queryKey: ['fetchDatasetExists', 'datasetId'],
        queryFn: () => http.get(`${ENDPOINTS.DATASET_EXISTS}/${datasetId}`).then((res) => res.data),
        enabled: !!datasetId
    });
};

export const usePublishDataset = () =>
    useMutation({
        mutationFn: ({ payload = {} }: any) => {
            const request = generateRequestBody({
                request: payload,
                apiId: 'api.datasets.status-transition'
            });

            return http.post(ENDPOINTS.PUBLISH_DATASET, request);
        }
    });

export const useConnectorsList = () =>
    useMutation({
        mutationFn: ({ payload = {} }: any) => {
            const request = generateRequestBody({
                request: payload,
                apiId: 'api.connectors.list'
            });

            return http.post(ENDPOINTS.LIST_CONNECTORS, request);
        }
    });

export const useReadConnectors = ({ connectorId }: { connectorId: string }) => {
    return useQuery({
        queryKey: ['connectorId'],
        queryFn: () =>
            http.get(`${ENDPOINTS.READ_CONNECTORS}/${connectorId}`).then(transformResponse),
        enabled: !!connectorId
    });
};

const omitSuggestions = (schema: any): any => {
    if (typeof schema === 'object' && schema !== null) {
        // Recursively omit 'suggestions' key from the object
        const result: any = {};
        for (const key in schema) {
            if (key !== 'suggestions') {
                result[key] = omitSuggestions(schema[key]);
            }
        }
        return result;
    }
    return schema;
}

export const getConfigValue = (variable: string) => {
    const config: string | any = sessionStorage.getItem('systemSettings');
    return _.get(JSON.parse(config), variable);
};

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