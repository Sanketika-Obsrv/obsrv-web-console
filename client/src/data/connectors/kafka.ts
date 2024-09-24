import * as yup from "yup";
import en from 'utils/locales/en.json'
import { hasSpecialCharacters, kafkaBrokersValidationRegex, kafkaTopicValidationRegex } from "services/utils";

export const kafkaForm = [
    {
        name: "topic",
        label: "Kafka Topic Name",
        tooltip: "Name of the kafka topic where raw data is stored",
        type: 'text',
        required: true,
        validationSchema: yup.string().required(en.isRequired).min(4, en.minLen.replace("{length}", '4')).max(50, en.maxLen.replace("{length}", '50')).trim(en.whiteSpaceConflict).strict(true)
            .test('invalidTopic', en.invalidKafkaTopic, value => hasSpecialCharacters(value, kafkaTopicValidationRegex))
    },
    {
        name: "kafkaBrokers",
        label: "Comma Seprated List of Broker Urls",
        tooltip: "The list of brokers seprated by comma that we want to send the messages to",
        type: 'text',
        required: true,
        validationSchema: yup.string().required(en.isRequired).min(10, en.minLen.replace("{length}", '10')).trim(en.whiteSpaceConflict).strict(true)
    }
]