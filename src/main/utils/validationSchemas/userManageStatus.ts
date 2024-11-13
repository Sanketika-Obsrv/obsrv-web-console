export default {
    name: 'userManageStatus',
    schemas: {
        verify: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            title: 'User status management API JSON',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    enum: ['api.user.status'],
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
                        status: {
                            type: 'string',
                        },
                    },
                    required: ['user_name', 'status'],
                    additionalProperties: false,
                },
            },
            required: ['id', 'ver', 'ts', 'params', 'request'],
            additionalProperties: false,
        },
    },
};
