import { NextFunction, Request, Response } from 'express';
import appConfig from '../../shared/resources/appConfig';

export default {
    name: 'config:vars',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        response.json({
            "GRAFANA_URL": appConfig.GRAFANA.URL,
            "SUPERSET_URL": appConfig.SUPERSET.URL,
            "ALERT_MANAGER": appConfig.DEFAULT_ALERT_MANAGER,
            "AUTHENTICATION_ALLOWED_TYPES": appConfig.AUTHENTICATION_ALLOWED_TYPES,
            "ENV": appConfig.ENV,
            "BASE_URL": appConfig.BASE_URL,
            "validationLimit": {
                "datasetMaxLen": 100,
                "datasetMinLen": 4,
                "datasetIdMaxLen": 100,
                "datasetIdMinLen": 4,
                "topicLen": 10,
                "brokerServerLen": 500,
                "fieldDescriptionMaxLen": 200,
                "maxTag": 5,
                "alertRuleNameMaxLen":100,
                "alertRuleLabelsMaxLen":100,
                "notificationChannelNameMaxLen":100,
                "transformationFieldMaxLen":100,
                "denormInputFieldMaxLen":100,
                "alertsPerPage":10
            }
        })
    },
};