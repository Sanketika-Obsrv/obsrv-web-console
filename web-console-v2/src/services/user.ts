import {useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { http } from 'services/http';
import { generateRequestBody, transformResponse } from './utils';

const ENDPOINTS = {
    USER_READ: '/api/user/read',
    USER_UPDATE: '/api/user/update',
    USER_CREATE: '/api/user/create',
    USER_STATUS_MANAGE: '/api/user/status/manage',
    USER_ROLES_MANAGE: '/api/user/roles/manage',
    USER_LIST: '/api/user/list',
};

export const endpoints = ENDPOINTS

export const useUserList = (payload = {}) => {

    const request = generateRequestBody({
        request: payload,
        apiId: 'api.user.list'
    });

    return useQuery({
        queryKey: ['userList', payload],
        queryFn: () => http.post(`${ENDPOINTS.USER_LIST}`, request).then(transformResponse)
    });
};

export const useUserRead = () => {
    return useQuery({
        queryKey: ['userRead'],
        queryFn: () => http.get(`${ENDPOINTS.USER_READ}`).then(transformResponse)
    });
};

export const useUserUpdate = (payload = {}) => {
    const request = generateRequestBody({
        request: payload,
        apiId: 'api.user.update'
    });
    return useQuery({
        queryKey: ['userUpdate'],
        queryFn: () => http.post(`${ENDPOINTS.USER_UPDATE}`, request).then(transformResponse)
    });
};

export const useCreateDataset = () =>
    useMutation({
        mutationFn: async ({ payload = {} }: any) => {
            const request = generateRequestBody({
                request: payload,
                apiId: 'api.user.create'
            });

            const response = await http.post(ENDPOINTS.USER_CREATE, request);
            return transformResponse(response);
        }
    });

export const useUserStatusManage = () =>
    useMutation({
        mutationFn: async ({ payload = {} }: any) => {
            const request = generateRequestBody({
                request: payload,
                apiId: 'api.user.status'
            });
            const response = await http.post(`${ENDPOINTS.USER_STATUS_MANAGE}`, request);
            return transformResponse(response);
        }
    });

export const useUserRoleManage = () =>
    useMutation({
        mutationFn: async ({ payload = {} }: any) => {
            const request = generateRequestBody({
                request: payload,
                apiId: 'api.user.roles'
            });
            const response = await http.post(`${ENDPOINTS.USER_ROLES_MANAGE}`, request);
            return transformResponse(response);
        }
    });