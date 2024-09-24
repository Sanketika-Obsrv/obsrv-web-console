export default {
    name: 'userManageRoles',
    schemas: {
        verify: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            title: 'User roles management API JSON',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    enum: ['api.user.roles'],
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
                        roles: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    value: {
                                        type: 'string',
                                        enum: ['admin', 'dataset_manager', 'viewer', 'dataset_creator', 'ingestor'],
                                        minLength: 1,
                                    },
                                    action: {
                                        type: 'string',
                                        enum: ['upsert', 'remove'],
                                    },
                                },
                                required: ['value', 'action'],
                            },
                        },
                    },
                    required: ['user_name', 'roles'],
                    additionalProperties: false,
                },
            },
            required: ['id', 'ver', 'ts', 'params', 'request'],
            additionalProperties: false,
        },
    },
};
