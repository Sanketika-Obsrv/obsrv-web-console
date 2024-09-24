export enum DatasetStatus {
    Live = 'Live', Draft = 'Draft', Publish = 'Publish', ReadyToPublish = 'ReadyToPublish', Retired = 'Retired', Purged = 'Purged'
}

export enum TransformationMode {
    Strict = 'Strict', Lenient = 'Lenient',
}

export enum ValidationMode {
    Strict = 'Strict', IgnoreNewFields = 'IgnoreNewFields'
}

export enum DatasetType {
    Dataset = 'event',
    MasterDataset = 'master',
}

export enum DatasetActions {
    Create = 'Create', Edit = 'Edit', Retire = 'Retire', Purge = 'Purge', AddRollup = 'AddRollup',
}
