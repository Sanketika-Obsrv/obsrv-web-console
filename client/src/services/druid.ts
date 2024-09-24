import * as _ from 'lodash';

export const druidQueries = {
    druid_avg_processing_time: ({ datasetId, intervals, master = false, }: any) => {
        const dataSource = "system-events";
        return {
            "context": {
                "dataSource": dataSource
            },
            "query": {
                "queryType": "groupBy",
                "dataSource": dataSource,
                "intervals": intervals,
                "granularity": {
                    "type": "all",
                    "timeZone": "Asia/Kolkata"
                },
                "filter": {
                    "type": "and",
                    "fields": [
                        {
                            "type": "selector",
                            "dimension": "ctx_module",
                            "value": "processing"
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_dataset",
                            "value": datasetId
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_pdata_id",
                            "value": master ? "MasterDataProcessorJob" : "DruidRouterJob"
                        },
                        {
                            "type": "selector",
                            "dimension": "error_code",
                            "value": null
                        }
                    ]
                },
                "aggregations": [
                    {
                        "type": "longSum",
                        "name": "processing_time",
                        "fieldName": "total_processing_time"
                    },
                    {
                        "type": "longSum",
                        "name": "count",
                        "fieldName": "count"
                    }
                ],
                "postAggregations": [
                    {
                        "type": "expression",
                        "name": "average_processing_time",
                        "expression": "case_searched((count > 0),(processing_time/count),0",
                    }
                ]
            }
        }
    },
    druid_max_processing_time: ({ datasetId, intervals, master = false, }: any) => {
        const dataSource = "system-events";
        return {
            "context": {
                "dataSource": dataSource,
            },
            "query": {
                "queryType": "topN",
                "dataSource": dataSource,
                "virtualColumns": [
                    {
                        "type": "expression",
                        "name": "v0",
                        "expression": "case_searched((count > 0),(total_processing_time/count),0",
                        "outputType": "DOUBLE"
                    }
                ],
                "dimension": {
                    "type": "default",
                    "dimension": "dataset",
                    "outputName": "dataset",
                    "outputType": "STRING"
                },
                "metric": {
                    "type": "numeric",
                    "metric": "max_processing_time"
                },
                "filter": {
                    "type": "and",
                    "fields": [
                        {
                            "type": "selector",
                            "dimension": "ctx_module",
                            "value": "processing"
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_dataset",
                            "value": datasetId
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_pdata_id",
                            "value": master ? "MasterDataProcessorJob" : "DruidRouterJob"
                        },
                        {
                            "type": "selector",
                            "dimension": "error_code",
                            "value": null
                        }
                    ]
                },
                "intervals": intervals,
                "granularity": {
                    "type": "all",
                    "timeZone": "Asia/Kolkata"
                },
                "aggregations": [
                    {
                        "type": "doubleMax",
                        "name": "max_processing_time",
                        "fieldName": "v0"
                    }
                ]
            }
        }
    },
    druid_min_processing_time: ({ datasetId, intervals, master = false, }: any) => {
        const dataSource = "system-events";
        return {
            "context": {
                "dataSource": dataSource,
            },
            "query": {
                "queryType": "topN",
                "dataSource": dataSource,
                "virtualColumns": [
                    {
                        "type": "expression",
                        "name": "v0",
                        "expression": "case_searched((count > 0),(total_processing_time/count),0",
                        "outputType": "DOUBLE"
                    }
                ],
                "dimension": {
                    "type": "default",
                    "dimension": "dataset",
                    "outputName": "dataset",
                    "outputType": "STRING"
                },
                "metric": {
                    "type": "numeric",
                    "metric": "min_processing_time"
                },
                "filter": {
                    "type": "and",
                    "fields": [
                        {
                            "type": "selector",
                            "dimension": "ctx_module",
                            "value": "processing"
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_dataset",
                            "value": datasetId
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_pdata_id",
                            "value": master ? "MasterDataProcessorJob" : "DruidRouterJob"
                        },
                        {
                            "type": "selector",
                            "dimension": "error_code",
                            "value": null
                        }
                    ]
                },
                "intervals": intervals,
                "granularity": {
                    "type": "all",
                    "timeZone": "Asia/Kolkata"
                },
                "aggregations": [
                    {
                        "type": "doubleMin",
                        "name": "min_processing_time",
                        "fieldName": "v0"
                    }
                ]
            }
        }
    },
    last_synced_time: ({ datasetId, intervals, master = false, }: any) => {
        const dataSource = "system-events";
        return {
            "context": {
                "dataSource": dataSource,
            },
            "query": {
                "queryType": "groupBy",
                "dataSource": dataSource,
                "intervals": intervals,
                "granularity": {
                    "type": "all",
                    "timeZone": "Asia/Kolkata"
                },
                "filter": {
                    "type": "and",
                    "fields": [
                        {
                            "type": "selector",
                            "dimension": "ctx_module",
                            "value": "processing"
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_dataset",
                            "value": datasetId
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_pdata_id",
                            "value": master ? "MasterDataProcessorJob" : "DruidRouterJob"
                        },
                    ]
                },
                "aggregations": [
                    {
                        "type": "longMax",
                        "name": "last_synced_time",
                        "fieldName": "__time"
                    }
                ]
            }
        }
    },
    total_events_processed: ({ datasetId, intervals, master = false, }: any) => {
        const dataSource = "system-events";
        return {
            "context": {
                "dataSource": dataSource,
            },
            "query": {
                "queryType": "timeseries",
                "dataSource": dataSource,
                "intervals": intervals,
                "granularity": {
                    "type": "all",
                    "timeZone": "Asia/Kolkata"
                },
                "filter": {
                    "type": "and",
                    "fields": [
                        {
                            "type": "selector",
                            "dimension": "ctx_module",
                            "value": "processing"
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_dataset",
                            "value": datasetId
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_pdata_id",
                            "value": master ? "MasterDataProcessorJob" : "DruidRouterJob"
                        },
                        {
                            "type": "selector",
                            "dimension": "error_code",
                            "value": null
                        }
                    ]
                },
                "aggregations": [
                    {
                        "type": "longSum",
                        "name": "count",
                        "fieldName": "count"
                    }
                ]
            }
        }
    },
    totalEventsProcessedTimeSeries: ({ datasetId, intervals, master = false, }: any) => {
        const dataSource = "system-events";
        return {
            "context": {
                "dataSource": dataSource,
            },
            "query": {
                "queryType": "timeseries",
                "dataSource": dataSource,
                "intervals": intervals,
                "granularity": {
                    "type": "period",
                    "period": "PT5M",
                    "timeZone": "Asia/Kolkata"
                },
                "filter": {
                    "type": "and",
                    "fields": [
                        {
                            "type": "selector",
                            "dimension": "ctx_module",
                            "value": "processing"
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_dataset",
                            "value": datasetId
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_pdata_id",
                            "value": master ? "MasterDataProcessorJob" : "DruidRouterJob"
                        },
                        {
                            "type": "selector",
                            "dimension": "error_code",
                            "value": null
                        }
                    ]
                },
                "aggregations": [
                    {
                        "type": "count",
                        "name": "count",
                        "fieldName": "count"
                    }
                ]
            }
        }
    },
    failedEventsCount: ({ datasetId, intervals, master = false, }: any) => {
        const dataSource = "system-events";
        return {
            "context": {
                "dataSource": dataSource,
            },
            "query": {
                "queryType": "timeseries",
                "dataSource": dataSource,
                "intervals": intervals,
                "granularity": {
                    "type": "all",
                    "timeZone": "Asia/Kolkata"
                },
                "filter": {
                    "type": "and",
                    "fields": [
                        {
                            "type": "selector",
                            "dimension": "ctx_module",
                            "value": "processing"
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_dataset",
                            "value": datasetId
                        },
                        {
                            "type": "selector",
                            "dimension": "ctx_pdata_id",
                            "value": master ? "MasterDataProcessorJob" : "DruidRouterJob"
                        },
                        {
                            "type": "not",
                            "field": {
                                "type": "selector",
                                "dimension": "error_code",
                                "value": null
                              }
                        }
                    ]
                },
                "aggregations": [
                    {
                        "type": "longSum",
                        "name": "count",
                        "fieldName": "error_count"
                    }
                ]
            }
        }
    }
};
