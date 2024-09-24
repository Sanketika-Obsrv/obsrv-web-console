export interface User {
    id: string;
    user_name: string;
    password?: string; 
    first_name?: string;
    last_name?: string;
    provider?: string;
    email_address: string;
    mobile_number?: string;
    created_on: string;
    last_updated_on?: string;
}

export enum DatasetStatus {
    Live = 'Live', Draft = 'Draft', Publish = 'Publish', Retired = 'Retired', Purged = 'Purged', ReadToPublish = "ReadyToPublish"
}

export enum TransformationMode {
    Strict = 'Strict', Lenient = 'Lenient',
}

export enum ValidationMode {
    Strict = 'Strict', IgnoreNewFields = 'IgnoreNewFields', DiscardNewFields = 'DiscardNewFields',
}

export enum DatasetType {
    Dataset = 'dataset',
    MasterDataset = 'master-dataset',
}