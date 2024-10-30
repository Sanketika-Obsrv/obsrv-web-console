import { RJSFSchema, UiSchema } from '@rjsf/utils';
interface FormSchema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}
const schema: FormSchema = 
    {
        title: 'Configure Kafka Connector',
        schema: {
            "title": "Kafka Connector Setup Instructions",
            "description": "",
            "type": "object",
            "properties": {
                "source_kafka_broker_servers": {
                    "title": "Kafka Brokers",
                    "type": "string",
                    "description": "Enter Kafka broker address in the format: <broker1-hostname>:<port>,<broker2-hostname>:<port>,<broker3-hostname>:<port>"
                },
                "source_kafka_topic": {
                    "title": "Kafka Topic",
                    "type": "string",
                    "pattern": "^[a-zA-Z0-9\\\\._\\\\-]+$",
                    "description": "Enter Kafka topic name. Only alphanumeric characters, dots, dashes, and underscores are allowed."
                },
                "source_kafka_auto_offset_reset": {
                    "title": "Kafka Auto Offset Reset",
                    "type": "string",
                    "description": "Select the suitable offset reset strategy.",
                    "enum": [
                        "earliest",
                        "latest",
                        "none"
                    ],
                    "default": "earliest"
                },
                "source_kafka_consumer_id": {
                    "title": "Kafka Consumer Id",
                    "type": "string",
                    "pattern": "^[a-zA-Z0-9\\\\._\\\\-]+$",
                    "description": "Enter Kafka consumer group ID.",
                    "default": "kafka-connector-group"
                }
            },
            "required": [
                "source_kafka_broker_servers",
                "source_kafka_topic",
                "source_kafka_consumer_id",
                "source_kafka_auto_offset_reset"
            ]
        },
        uiSchema: {}
    };
export default schema;
