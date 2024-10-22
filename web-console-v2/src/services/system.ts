import { useMutation } from '@tanstack/react-query';
import { http } from 'services/http';
import { v4 } from 'uuid';
import { transformResponse } from './utils';

const ENDPOINTS = {
    DETECT_PII_FIELDS: '/system/data/v1/analyze/pii'
};

export const useDetectPiiFields = () =>
    useMutation({
        mutationFn: ({ event, datasetId }: { event: object; datasetId: string }) => {
            const request = {
                id: v4(),
                dataset_id: datasetId,
                data: [{ ...event }]
            };

            return http.post(ENDPOINTS.DETECT_PII_FIELDS, request).then(transformResponse);
        }
    });
