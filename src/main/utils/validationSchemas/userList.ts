export default {
    name: 'userList',
    schemas: {
        verify: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            title: 'User List API JSON',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    enum: ['api.user.list'],
                },
                ver: {
                    type: 'string',
                },
                ts: {
                    type: 'string',
                },
                params: {
                    type: 'object',
                    properties: {
                        msgid: {
                            type: 'string',
                        },
                    },
                    required: ['msgid'],
                    additionalProperties: false,
                },
                request: {
                    type: 'object',
                    properties: {
                        first_name: {
                            type: 'string',
                            minLength: 3,
                            maxLength: 50,
                        },
                        last_name: {
                            type: 'string',
                            minLength: 3,
                            maxLength: 50,
                        },
                        provider: {
                            type: 'string',
                        },
                        mobile_number: {
                            type: 'object',
                            properties: {
                                country_code: {
                                    type: 'string',
                                },
                                number: {
                                    type: 'string',
                                },
                            },
                            required: ['country_code', 'number'],
                            additionalProperties: false,
                        },
                        roles: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['admin', 'dataset_manager', 'viewer', 'dataset_creator', 'ingestor', 'operations_admin'],
                            },
                            minItems: 1,
                            uniqueItems: true,
                        },
                        status: {
                            type: 'string',
                        },
                    },
                    additionalProperties: false,
                },
            },
            required: ['id', 'ver', 'ts', 'params', 'request'],
            additionalProperties: false,
        },
    },
};
