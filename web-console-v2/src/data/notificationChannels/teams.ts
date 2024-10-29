import * as yup from 'yup'
import en from 'utils/locales/en.json'
import { hasSpecialCharacters } from "services/utils";

const description = 'To create a Microsoft Teams webhook URL, navigate to the desired channels settings, configure an incoming webhook, customize details like name and icon, then copy the provided URL.'

const form = [
    {
        name: "channel",
        label: "Microsoft Teams Channel Name",
        tooltip: "Teams Channel Name for delivering notification",
        type: "text",
        required: true,
        validationSchema: yup.string().required(en.isRequired).max(100).test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
            .trim(en.whiteSpaceConflict).strict(true)
    },
    {
        name: "webhookUrl",
        label: "Webhook URL",
        tooltip: "Microsoft Teams incoming webhook URL endpoint",
        type: "text",
        required: true,
        validationSchema: yup.string().url().required(en.isRequired)
    }
]

export default { form, description }