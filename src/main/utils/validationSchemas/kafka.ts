export default {
    name: 'kafka',
    schemas: {
        verify: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            title: 'Kafka Connection Verification',
            type: 'object',
            properties: {
                bootstrap: { type: 'string' },
                topic: { type: 'string' },
            },
            required: ['bootstrap', 'topic']
        },
    },
};
