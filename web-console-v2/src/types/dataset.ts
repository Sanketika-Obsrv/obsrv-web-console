interface DenormField {
  denorm_key: string; 
  denorm_out_field: string;
  dataset_id: string;
}

interface TransformationConfig {
  field_key: string;
  transformation_function: {
    type: string;
    expr: string;
    condition?: {
      type: string;
      expr: string;
    };
    datatype?: string;
    category?: string;
  };
  mode: string;
}

interface ConnectorConfig {
  id: string;
  connector_id: string;
  connector_config: object;
  operations_config?: object;
  version: string;
}

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
    indexing_config?: {
      olap_store_enabled?: boolean
      lakehouse_enabled?: boolean
      cache_enabled?: boolean

    };
    keys_config?: {
      timestamp_key?: string
      data_key?: string
      partition_key?: string
    }
  };
  connector?: string;
  current_health?: string;
  validation_config?: {
    validate: boolean
    mode: string
  }
  extraction_config?: {
    is_batch_event?: boolean;
    extraction_key?: string;
    dedup_config?: {
      drop_duplicates: boolean;
      dedup_key: string;
      dedup_period?: number
    }
  }
  dedup_config?: {
    drop_duplicates: boolean
    dedup_key: string
    dedup_period?: number
  }
  data_schema?: {
    $schema: string;
    type: string;
    properties: object;
    additionalProperties: boolean;
  }
  denorm_config?: {
    denorm_fields: DenormField[];
    redis_db_host: string;
    redis_db_port: number;
  }
  transformations_config?: TransformationConfig[];
  connectors_config?: ConnectorConfig[];
  sample_data?: object
  size?: number
  tag?: string
  volume?: number;
  version_key: string;
  updated_date: Date;
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
