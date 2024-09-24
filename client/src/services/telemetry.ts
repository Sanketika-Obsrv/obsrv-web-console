import * as _ from 'lodash';
import { v4 } from 'uuid'
import { sendEvents } from './dataset';
import { getConfigValue } from './configData';

const getOptions = () => {
    return {
        eid: '',
        ets: Date.now(),
        ver: '1.0.0',
        mid: v4(),
        actor: {
            id: '13234',
            type: 'User'
        },
        context: {
            env: getConfigValue("ENV") || _.get(process, 'env.REACT_APP_ENV') || "local",
            sid: '42342',
            pdata: {
                id: 'dev.obsrv.console',
                ver: '1.0.0'
            }
        },
        object: {},
        edata: {}
    };
};

const sendTelemetryEvents = (event: Record<string, any>) => {
    const payload = { data: { id: v4(), events: [event] } }
    // console.log(payload);
    // sendEvents("web-console-telemetry", payload);
}

const logEvent = (event: Record<string, any>) => {
    sendTelemetryEvents(event);
}

export const generateInteractEvent = ({ object, edata, eid = "INTERACT" }: any) => {
    const defaultPayload = getOptions();
    const event = { ...defaultPayload, eid, object, edata };
    logEvent(event);
}

export const globalInteractEventsHandler = (event: any) => {
    const target = _.get(event, 'target');
    const dataset = _.get(target, 'dataset');
    if (!(target && _.has(dataset, 'edataid'))) return;
    const { edataid, edatatype = 'CLICK', objectid, objecttype, objectversion = '1.0.0' } = dataset as Record<string, any>;
    const edata = { id: edataid, type: edatatype };
    const object = { ...(objectid && objecttype && { id: objectid, type: objecttype, ver: objectversion }) };
    generateInteractEvent({ edata, object, eid: 'INTERACT' })
}

export const generateImpressionEvent = ({ object, edata }: any) => {
    const defaultPayload = getOptions();
    const event = { ...defaultPayload, eid: "IMPRESSION", object, edata };
    logEvent(event);
}

export const generateStartEvent = ({ object, edata }: any) => {
    const defaultPayload = getOptions();
    const event = { ...defaultPayload, eid: "START", object, edata };
    logEvent(event);
}

export const generateEndEvent = ({ object, edata }: any) => {
    const defaultPayload = getOptions();
    const event = { ...defaultPayload, eid: "END", object, edata };
    logEvent(event);
}
