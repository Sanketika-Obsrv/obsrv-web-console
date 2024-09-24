import * as yup from "yup";
import en from 'utils/locales/en.json'

const jdbcDatabaseType = [
    {
        name: "type",
        label: "Type",
        type: 'autocomplete',
        selectOptions: [{ label: "MySQL", value: "mysql" }, { label: "PostgreSQL", value: "postgresql" }],
        required: true,
        validationSchema: yup.string().required(en.isRequired)
    }
]

export const jdbcForm = [
    {
        title: "Database Type",
        formField: jdbcDatabaseType
    }
]