import { IResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

const transform = (payload: Partial<IResponse>) => {
  const { id, ver = 'v1', ets = Date.now(), params = {}, responseCode = 'OK', result = {} } = payload;

  const { resmsgid = `${uuidv4()}`, err = '', status = responseCode === 'OK' ? 'SUCCESSFUL' : 'FAILED', errmsg = '' } = params;

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
