import axios from 'axios';
import { useAlert } from 'contexts/AlertContextProvider';
import React, { useCallback, useState } from 'react';
import { http } from './http';
import { generateRequestBody } from './utils';
import _ from 'lodash';

export const CONNECTOR_ENDPOINTS = {
  CONNECTOR_REGISTRY: '/config/v2/connector/register',
  CONNECTOR_LIST: '/config/v2/connectors/list',
};

interface ConnectorResponse {
  success: boolean;
  message?: string;
}

export const registerConnector = async (data: File[]) => {
  const formData = new FormData();
  data.forEach((file: any) => {
    formData.append('files', file);
  });
  await http.post<ConnectorResponse>(
    CONNECTOR_ENDPOINTS.CONNECTOR_REGISTRY,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
};

export const fetchConnectors = async () => {
  const request = generateRequestBody({
    request: {},
    apiId: 'api.connectors.list',
  });
  return http
    .post(CONNECTOR_ENDPOINTS.CONNECTOR_LIST, request)
    .then((response) => {
      return _.get(response, ['data', 'result', 'data']);
    })
    .catch((error) => {
      throw new Error('Failed to load');
    });
};
