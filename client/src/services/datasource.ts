import { http } from 'services/http';
import * as _ from 'lodash';

import apiEndpoints from 'data/apiEndpoints';

export const saveDatasource = ({ data = {}, config }: any) => {
    const { ingestionSpec, state } = data;
    const datasetId = _.get(state, ['pages', 'datasetConfiguration', 'state', 'masterId']);
    const datasource = data.datasource || `${datasetId}_day`
    const payload = {
        "dataset_id": datasetId,
        "ingestion_spec": ingestionSpec,
        "datasource": datasource,
        "datasource_ref": datasource,
        "metadata": {
            "aggregated": false,
            "granularity": "day",
        }
    };
    return http.patch(apiEndpoints.saveDatasource, payload, config);
}

export const saveRollupDatasource = (config: any, maskedDataSourceName: any, ingestionSpec: any, state: any, granularity: string, rollupValue: any) => {
    const datasetId = _.get(state, 'datasetConfiguration.state.masterId');
    const datasource = maskedDataSourceName || `${datasetId}_day`
    const payload = {
        "ingestion_spec": ingestionSpec,
        "datasource": datasource,
        "datasource_ref": datasource,
        "dataset_id": datasetId,
        "metadata": {
            "aggregated": true,
            "granularity": granularity,
            "name": datasource,
            "value": rollupValue,
        }
    };
    return http.patch(apiEndpoints.saveDatasource, payload, config);
}

export const deleteDraftRollupDatasources = (datasetId: any, status: any) => {
    return http.delete(`${apiEndpoints.deleteDraftDatasources}/${datasetId}?status="${status}"`);
}
