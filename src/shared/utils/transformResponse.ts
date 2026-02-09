import { IResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as he from 'he';

const transform = (payload: Partial<IResponse>) => {
  let { id, ver = 'v1', ets = Date.now(), params = {}, responseCode = 'OK', result = {} } = payload;

  // Sanitize ID to prevent Reflected XSS
  if (typeof id === 'string') {
    id = he.encode(id);
  }

  let { resmsgid = `${uuidv4()}`, err = '', status = responseCode === 'OK' ? 'SUCCESSFUL' : 'FAILED', errmsg = '' } = params;

  // Sanitize error messages to prevent Reflected XSS
  if (typeof err === 'string') {
    err = he.encode(err);
  }
  if (typeof errmsg === 'string') {
    errmsg = he.encode(errmsg);
  }

  return {
    id,
    ver,
    ets,
    params: { resmsgid, err, status, errmsg },
    responseCode,
    result,
  };
};

export { transform };
