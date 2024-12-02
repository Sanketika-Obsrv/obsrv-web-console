/* eslint-disable prettier/prettier */
import { Request, Response } from "express";
import _ from 'lodash'
import { incrementApiCalls, incrementFailedApiCalls, setQueryResponseTime } from "./prometheus";
import appConfig from "../../shared/resources/appConfig";
import promEntities from '../resources/prometheusEntities';

const authenticationType = appConfig.AUTHENTICATION_TYPE;

export const onError = ({ entity }: any) => (err: any, req: Request, res: Response) => {
    incrementFailedApiCalls({ entity, endpoint: req.url });
    res.status(500).send('Something went wrong. Please try again later.');
}

export const onProxyRes = ({ entity }: any) => (proxyReq: any, req: any, res: Response) => {
    const startTime = req?.startTime;
    const duration = startTime && (Date.now() - startTime);
    duration && setQueryResponseTime(duration, { entity, endpoint: req.url });
    if (proxyReq?.statusCode >= 400) {
        incrementFailedApiCalls({ entity, endpoint: req.url });
    }
}

export const onProxyReq = ({ entity }: any) => (proxyReq: any, req: any, res: Response) => {
    const startTime = Date.now();
    req.startTime = startTime;
    if (entity !== promEntities.alerts) {
        if(authenticationType === 'keycloak'){
            const keycloakToken = JSON.parse(req?.session['keycloak-token']);
            const access_token: string = keycloakToken.access_token;
            proxyReq.setHeader('Authorization', `Bearer ${access_token}`);
        }else if(authenticationType === 'basic'){
            const jwtToken: string = req.session?.token;
            proxyReq.setHeader('Authorization', `Bearer ${jwtToken}`);
        }
    }
    incrementApiCalls({ entity, endpoint: req.url });
}