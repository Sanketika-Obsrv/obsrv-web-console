import _ from 'lodash';
import * as yup from 'yup';
import en from 'utils/locales/en.json'
import { hasSpecialCharacters } from "services/utils";

const description = "To add multiple email addresses, use the format: user1@example.com; user2@example.in; and so on"

const form = [
    {
        name: "recipientAddresses",
        label: "Recipient Addresses seprated by ;",
        tooltip: "Valid email address(s) for notification delivery",
        type: 'text',
        required: true,
        validationSchema: yup.string().required(en.isRequired).test("Invalid email addresses", "Enter valid email addresses", (value: any) => {
            const emails = value?.split(';').map((email: string) => email?.trim());
            const regex = /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            const invalidEmails = emails?.filter((email: string) => email === '' || !regex.test(email));
            return invalidEmails?.length === 0;
        }).trim(en.whiteSpaceConflict).strict(true),
    },
    {
        name: "message",
        label: "Optional Message",
        tooltip: "Optional message to include with the email",
        type: 'text',
        required: false,
        validationSchema: yup.string().optional().max(100).test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
            .trim(en.whiteSpaceConflict).strict(true),
    }
];

export default { form, description }