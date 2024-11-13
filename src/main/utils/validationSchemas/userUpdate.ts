export default {
    name: 'userUpdate',
    schemas: {
        verify: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            title: 'User Update API JSON',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    enum: ['api.user.update'],
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
                    },
                    required: ['user_name'],
                    additionalProperties: false,
                },
            },
            required: ['id', 'ver', 'ts', 'params', 'request'],
            additionalProperties: false,
        },
    },
};
