import * as yup from "yup";
import en from 'utils/locales/en.json'
import { hasSpecialCharacters } from "services/utils";

export const batchForm = [
    {
        name: "extractionKey",
        label: "Extraction Key",
        tooltip: "Path to the events property inside the batch object",
        type: 'text',
        required: true,
        validationSchema: yup.string().required(en.isRequired).min(2).max(35).test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
        .trim(en.whiteSpaceConflict).strict(true),
    },
    {
        name: "batchId",
        label: "Batch Identifier",
        type: 'text',
        required: true,
        validationSchema: yup.string().required(en.isRequired).max(35).test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
        .trim(en.whiteSpaceConflict).strict(true),
    },
]



