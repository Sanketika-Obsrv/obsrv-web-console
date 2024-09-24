export interface ITelemetry {
  id: string;
  ver: string;
  pid: string;
  did?: string;
  batchsize: number;
}

export interface IInteractData {
  id: string | undefined;
  type: string;
}

export interface IImpressionData {
  uri: string;
  type: string;
  subtype?: string;
  pageId: string;
}
