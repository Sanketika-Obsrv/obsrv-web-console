import * as yup from "yup";
import en from 'utils/locales/en.json'
import { doubleQuotesValidationRegEx, hasSpecialCharacters, jdbcHostValidationRegex, jdbcPortValidationRegex } from "services/utils";
import { Typography } from "@mui/material";

const jdbcAuthInfo = [
    {
        name: "jdbc_user",
        label: "Database Username",
        tooltip: "Enter the database username for authentication.",
        type: 'text',
        required: true,
        validationSchema: yup.string().required(en.isRequired).test("doubleQuotesValidation", en.doubleQuotesInvalid, (value: any) => !hasSpecialCharacters(value, doubleQuotesValidationRegEx))
    },
    {
        name: "jdbc_password",
        label: "Password",
        tooltip: "Enter the corresponding password for the username",
        type: 'password',
        required: true,
        validationSchema: yup.string().required(en.isRequired)
    }
]

const jdbcConnectionInfo = [
    {
        name: "jdbc_host",
        label: "Host",
        tooltip: "Enter the host name of the database",
        type: 'text',
        required: true,
        validationSchema: yup.string().required(en.isRequired)
            .trim(en.whiteSpaceConflict).strict(true).test("invalidHostname", en.invalidJDBCHostName, value => hasSpecialCharacters(value, jdbcHostValidationRegex)),
    },
    {
        name: "jdbc_port",
        label: "Port",
        tooltip: "Enter the port number at which database is running",
        type: 'text',
        required: true,
        validationSchema: yup.string().required(en.isRequired).test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
            .trim(en.whiteSpaceConflict).strict(true).test("invalidPortNumber", en.invalidJDBCPort, value => hasSpecialCharacters(value, jdbcPortValidationRegex))
    },
    {
        name: "databaseName",
        label: "Database name",
        tooltip: "Enter the name of the database you want to connect",
        type: 'text',
        required: true,
        validationSchema: yup.string().required(en.isRequired).test("doubleQuotesValidation", en.doubleQuotesInvalid, (value: any) => !hasSpecialCharacters(value, doubleQuotesValidationRegEx))
    },
    {
        name: "tableName",
        label: "Table name",
        tooltip: "Enter the name of the Database table",
        type: 'text',
        required: true,
        validationSchema: yup.string().required(en.isRequired).test("doubleQuotesValidation", en.doubleQuotesInvalid, (value: any) => !hasSpecialCharacters(value, doubleQuotesValidationRegEx))
    }
]

const pollingIntervalForm = [
    {
        name: "pollingIntervalType",
        label: "Polling Interval",
        type: 'select',
        selectOptions: [{ label: "Periodic", value: "periodic" }],
        required: true,
        validationSchema: yup.string().required(en.isRequired)
    },
    {
        name: "schedule",
        label: "Schedule",
        dependsOn: {
            key: "pollingIntervalType",
            value: "periodic"
        },
        type: 'select',
        selectOptions: [{ value: "hourly", label: "Hourly" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }],
        required: true,
        validationSchema: yup.string().required(en.isRequired)
    }
]

export const jdbcConfigForm = [
    {
        title: "Connection Information",
        formField: jdbcConnectionInfo
    },
    {
        title: "Polling Interval",
        formField: pollingIntervalForm
    },
    {
        title: "Authentication Mechanism",
        formField: jdbcAuthInfo,
        description: <Typography variant="caption" fontSize={14}>
            It is recommended to create a new user and grant only <strong>SELECT</strong> permission on the table above.
            The table needs to have a timestamp field. Periodically we will look for records updated/created based on the selected timestamp field and will sync them to our platform.
        </Typography>,
    }
]