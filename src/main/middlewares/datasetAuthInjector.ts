import { NextFunction, Request, Response } from "express";
import appConfig from "../../shared/resources/appConfig";
import { datasetServiceHttpInstance } from "../services/dataset";

const authenticationType = appConfig.AUTHENTICATION_TYPE;

export default {
    name: 'datasetAuthInjector',
    handler: () => (request: any, response: Response, next: NextFunction) => {
        if (authenticationType === 'keycloak') {
            const keycloakToken = JSON.parse(request?.session['keycloak-token']);
            const access_token: string = keycloakToken.access_token;
            datasetServiceHttpInstance.defaults.headers['Authorization'] = `Bearer ${access_token}`;
        } else if (authenticationType === 'basic') {
            const jwtToken: string = request?.session?.token;
            datasetServiceHttpInstance.defaults.headers['Authorization'] = `Bearer ${jwtToken}`;
        }
        next();
    }
};