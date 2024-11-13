export interface IRoute {
  path: string;
  routes?: IRoute[];
  method?: string;
  middlewares?: Function[];
  pathPrefix?: string
}

export interface IController {
  name: string;
  handler: (config: Record<string, any>) => Function;
  [key: string]: any;
}

export interface IMiddleware {
  name: string;
  handler: (config?: Record<string, any>) => Function;
  [key: string]: any;
}

export interface IParams {
  resmsgid: string;
  msgid: string;
  err: string;
  status: string;
  errmsg: string;
}

export interface IResult {
  [key: string]: any;
}

export interface IResponse {
  id: string;
  ver: string;
  ets: string;
  params: Partial<IParams>;
  responseCode: string;
  result?: IResult;
}

export interface ISchemaValidator {
  name: string;
  schemas: object;
}

export interface ErrorObj {
  status: number;
  message: string;
  responseCode: string;
  errorCode: string;
}

export interface IProxy {
  path: string,
  name: string;
  handler: (config: Record<string, any>) => Function;
  [key: string]: any;
}

export interface IPostgres {
  [key: string]: any;
}