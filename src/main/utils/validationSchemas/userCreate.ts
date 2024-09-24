export default {
    name: 'userCreate',
    schemas: {
        verify: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            title: 'User Create API JSON',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    enum: ['api.user.create'],
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
                        user_name: {
                            type: 'string',
                        },
                        password: {
                            type: 'string',
                        },
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
                        email_address: {
                            type: 'string',
                            pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$',
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
                                enum: ['admin', 'dataset_manager', 'viewer', 'dataset_creator', 'ingestor'],
                            },
                            minItems: 1,
                            uniqueItems: true,
                        },
                        status: {
                            type: 'string',
                        },
                    },
                    required: ['user_name', 'email_address', 'password'],
                    additionalProperties: false,
                },
            },
            required: ['id', 'ver', 'ts', 'params', 'request'],
            additionalProperties: false,
        },
    },
};
