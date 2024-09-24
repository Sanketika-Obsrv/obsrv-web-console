import * as yup from 'yup';
import en from 'utils/locales/en.json'
import { hasSpecialCharacters } from "services/utils";

const description = " Access your Slack workspace settings, create or select an app, enable 'Incoming Webhooks', choose a target channel, customize settings if needed, and retrieve the unique webhook URL"

const form = [
    {
        name: "channel",
        label: "Slack Channel Name",
        tooltip: "Slack Channel name for notification delivery",
        type: 'text',
        required: true,
        validationSchema: yup.string().required(en.isRequired).max(100).test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
            .trim(en.whiteSpaceConflict).strict(true),
    },
    {
        name: "webhookUrl",
        label: "Webhook URL",
        tooltip: "Slack incoming webhook URL endpoint.",
        type: 'text',
        required: true,
        validationSchema: yup.string().url().required(en.isRequired),
    }
]

export default { form, description }