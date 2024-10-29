import * as _ from 'lodash';
import { http } from 'services/http';
import { v4 } from 'uuid';
import apiEndpoints from 'data/apiEndpoints';
import { generateRequestBody } from './utils';

export const publishDataset = ({ data, config = {} }: any) => {
    const { datasetId } = data;
    const payload = generateRequestBody({ apiId: "api.datasets.status-transition", request: { dataset_id:datasetId, status: "Live" } })
    return http.post(apiEndpoints.statusTransition, payload, config);
}

export const detectPiiFields = (event: object, dataset_id: string) => {
    const payload = {
        id: v4(),
        dataset_id: dataset_id,
        data: [{ ...event }]
    }
    return http.post(apiEndpoints.detectPiiFields, payload);
}