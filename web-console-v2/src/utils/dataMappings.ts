export const dataMappings = {
    text: {
        arrival_format: ['string'],
        store_format: {
            string: {
                jsonSchema: 'string',
                datasource: 'string'
            },
            'date-time': {
                jsonSchema: 'string',
                datasource: 'string'
            },
            date: {
                jsonSchema: 'string',
                datasource: 'string'
            },
            boolean: {
                jsonSchema: 'string',
                datasource: 'boolean'
            },
            epoch: {
                jsonSchema: 'string',
                datasource: 'integer'
            },
            long: {
                jsonSchema: 'string',
                datasource: 'long'
            },
            double: {
                jsonSchema: 'string',
                datasource: 'double'
            },
            bigdecimal: {
                jsonSchema: 'string',
                datasource: 'double'
            },
            integer: {
                jsonSchema: 'string',
                datasource: 'long'
            }
        }
    },
    string: {
        arrival_format: ['string'],
        store_format: {
            string: {
                jsonSchema: 'string',
                datasource: 'string'
            },
            'date-time': {
                jsonSchema: 'string',
                datasource: 'string'
            },
            date: {
                jsonSchema: 'string',
                datasource: 'string'
            },
            boolean: {
                jsonSchema: 'string',
                datasource: 'boolean'
            },
            epoch: {
                jsonSchema: 'string',
                datasource: 'integer'
            },
            long: {
                jsonSchema: 'string',
                datasource: 'long'
            },
            double: {
                jsonSchema: 'string',
                datasource: 'double'
            },
            bigdecimal: {
                jsonSchema: 'string',
                datasource: 'double'
            },
            integer: {
                jsonSchema: 'string',
                datasource: 'long'
            }
        }
    },
    number: {
        arrival_format: ['number', 'integer'],
        store_format: {
            integer: {
                jsonSchema: 'integer',
                datasource: 'long'
            },
            float: {
                jsonSchema: 'number',
                datasource: 'double'
            },
            long: {
                jsonSchema: 'integer',
                datasource: 'long'
            },
            double: {
                jsonSchema: 'number',
                datasource: 'double'
            },
            bigdecimal: {
                jsonSchema: 'number',
                datasource: 'double'
            },
            epoch: {
                jsonSchema: 'integer',
                datasource: 'long'
            },
            number: {
                jsonSchema: 'number',
                datasource: 'double'
            }
        }
    },
    integer: {
        arrival_format: ['integer'],
        store_format: {
            number: {
                jsonSchema: 'integer',
                datasource: 'double'
            }
        }
    },
    object: {
        arrival_format: ['object'],
        store_format: {
            object: {
                jsonSchema: 'object',
                datasource: 'json'
            }
        }
    },

    array: {
        arrival_format: ['array'],
        store_format: {
            array: {
                jsonSchema: 'array',
                datasource: 'array'
            }
        }
    },
    boolean: {
        arrival_format: ['boolean'],
        store_format: {
            boolean: {
                jsonSchema: 'boolean',
                datasource: 'boolean'
            }
        }
    },
    'date-time': {
        arrival_format: ['date-time'],
        store_format: {
            'date-time': {
                jsonSchema: 'date-time',
                datasource: 'date-time'
            }
        }
    }
};
