export interface Dataset {
  dataset_id: string;
  name: string;
  type?: string;
  status: string;
  tags?: string[];
  version?: number;
  api_version?: string;
  dataset_config?: {
    data_key?: string;
    timestamp_key?: string;
    exclude_fields?: string[];
    entry_topic?: string;
    redis_db_host?: string;
    redis_db_port?: number;
    index_data?: boolean;
    redis_db?: number;
  };
  connector?: string;
  'Current Health'?: string;
  version_key: string;
}

export interface CopyDatasetRequest {
  id: string;
  ver: string;
  ts: string;
  params: {
    msgid: string;
  };
  request: {
    source: {
      datasetId: string;
      isLive: boolean;
    };
    destination: {
      datasetId: string;
    };
  };
}

export interface FilterCriteria {
  status: string[];
  connector: string[];
  tag: string[];
}
