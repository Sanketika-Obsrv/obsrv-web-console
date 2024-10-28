import * as _ from 'lodash';

export default {
    alerts: {
        query: {
            type: 'api',
            url: '/alertmanager/api/v2/alerts',
            method: 'GET',
            headers: {},
            body: {},
            params: {},
            parse: (response: any) => {
                return response || [];
            },
            error() {
                return []
            }
        }
    }
}