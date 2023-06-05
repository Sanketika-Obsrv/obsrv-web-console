export interface IChartFetchRequest {
    id?: string;
    type: string;
    retryIntervalInMs: number;
    timeout: number;
    url: string;
    method: string;
    headers: object;
    body: object;
    params: object;
    parse: (response: object) => Array<object>
    setConfig: (options: any, setOptions: any, response: any) => void;
    error: () => Array<any>;
    context?: (payload: Record<string, any>) => Record<string, any>
}