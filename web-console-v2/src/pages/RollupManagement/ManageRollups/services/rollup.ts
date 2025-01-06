import { useMutation, useQuery, skipToken } from '@tanstack/react-query';
import { http } from 'services/http';
import { generateRequestBody, transformResponse } from 'services/utils';
import _ from 'lodash';
import { getAllFields } from 'services/datasetV1';
import { DatasetStatus } from 'types/datasets';
import { v4 } from "uuid";
export interface Metric {
    name: string;
    aggregate: string;
    field: string;
    datatype: string;
}

export interface Dimension {
    name: string;
    field: string;
    datatype: string;
}

export interface TableSpec {
    rollup: boolean;
    granularity: string;
    filter: Record<string, any>;
    metrics: Metric[];
    dimensions: Dimension[];
}

interface RollupPayload {
    dataset_id: string;
    tableSpec: {
        rollup: boolean;
        granularity: string;
        filter: Record<string, unknown>;
        metrics: Array<Record<string, unknown>>;
        dimensions: Array<Record<string, unknown>>;
    };
    id: string;
    name: string;
}

interface UpdateRollupPayload extends Omit<RollupPayload, 'dataset_id' | 'name'> {
    version_key?: string;
}

interface RollupResponse {
    message: string;
    result?: {
        data?: {
            version_key?: string;
            [key: string]: unknown;
        };
        message?: string;
    };
}

interface TableListResponse {
  id: string;
  responseCode: string;
  status_code: number;
  result: {
    data: {
      tables: Table[];
      count: number;
    };
    dataset_id: string;
    message: string;
  };
}

interface Table {
  id: string;
  name: string | null;
  dataset_id: string;
  type: string;
  status: string;
  version: number;
  created_by: string;
  updated_by: string;
  created_date: string;
  updated_date: string;
  version_key?: string;
  spectype?: string;
}

interface TableTransitionParams {
  id: string;
  status: string;
}


export const useTableTransition = () => {
    return useMutation<any, Error, TableTransitionParams>({
        mutationFn: async (params: TableTransitionParams) => {
            const requestBody = {
                id: "api.table.transition",
                ver: "v1",
                ts: new Date().toISOString(),
                params: {
                    msgid: v4()
                },
                request: {
                    id: params.id,
                    status: params.status
                }
            };

            const response = await http.post('management/api/v1/dataset/table/transition', requestBody);
            return transformResponse(response);
        },
        onError: (error) => {
            console.error('Error in table transition:', error);
        }
    });
};

export const processFields = async (datasetId: string) => {
    const response = await getAllFields(datasetId, DatasetStatus.Draft);
    return response;
};

export const useCreateRollup = () =>
    useMutation({
        mutationFn: async ({ payload }: { payload: RollupPayload }) => {
            const request = generateRequestBody({
                request: payload,
                apiId: 'api.table.create'
            });

            const response = await http.post('management/api/v1/dataset/table/create', request);
            const result = transformResponse(response);
            return result as RollupResponse;
        }
    });

export const useUpdateRollup = () =>
    useMutation({
        mutationFn: async ({ payload }: { payload: UpdateRollupPayload }) => {
            const request:any = generateRequestBody({
                request: {
                    ...payload,
                },
                apiId: 'api.table.update'
            });

            const response = await http.patch('management/api/v1/dataset/table/update', request);
            const result = transformResponse(response);
            return result as RollupResponse;
        }
    });

export const useReadRollup = (tableId: string, status = DatasetStatus.Draft) => {
    return useQuery({
        queryKey: ['readRollup', tableId],
        queryFn: tableId ? async () => {
            if (status === DatasetStatus.Draft) {
                const response = await http.get(`management/api/v1/dataset/table/read/${tableId}?mode=edit`);
                return transformResponse(response);
            }
            else {
                const response = await http.get(`management/api/v1/dataset/table/read/${tableId}`);
                return transformResponse(response);
            }
        } : skipToken
    });
};

export const useTableList = (datasetId: string) => {
    return useQuery({
        queryKey: ['tableList', datasetId],
        queryFn: datasetId ? async () => {
            const payload = {
                id: "api.table.list",
                ver: "v1",
                ts: new Date().toISOString(),
                params: {
                    msgid: v4()
                },
                request: {
                    dataset_id: datasetId,
                    status: ["Draft", "ReadyForPublish", "Live", "Retired"]
                }
            };

            const response = await http.post('management/api/v1/dataset/table/list', payload);
            return response?.data?.result?.data || { tables: [], count: 0 };
        } : skipToken
    });
};
