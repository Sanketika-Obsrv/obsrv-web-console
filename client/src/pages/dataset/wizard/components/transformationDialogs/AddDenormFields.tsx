import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {
    Box, DialogActions, DialogContent, DialogTitle,
    Typography, IconButton, Stack
} from "@mui/material";
import MUIForm from "components/form";
import { useEffect, useState } from "react";
import * as _ from 'lodash';
import { useDispatch, useSelector } from "react-redux";
import interactIds from "data/telemetry/interact.json";
import * as yup from "yup";
import { StandardWidthButton } from 'components/styled/Buttons';
import Loader from 'components/Loader';
import en from 'utils/locales/en.json';
import { hasSpecialCharacters } from "services/utils";

const AddDenormField = (props: any) => {
    const { onClose, setSelection, persistState, masterDatasets = [] } = props;
    const [value, subscribe] = useState<any>({});
    const onSubmission = (value: any) => { };
    const wizardState: any = useSelector((state: any) => state?.wizard);
    const validationLimitConfig = useSelector((state: any) => state?.config?.validationLimit || {})
    const jsonSchemaCols = _.get(wizardState, 'pages.columns.state.schema') || [];
    const [formErrors, subscribeErrors] = useState<any>(null);
    const [disabled, setDisabled] = useState(true);

    useEffect(() => {
        if (!_.isEmpty(value)) setDisabled(_.keys(formErrors).length > 0)
    }, [value]);

    const allOptions = _.map(jsonSchemaCols, (schema: any) => {
        const name = _.get(schema, 'column');
        const type = _.get(schema, 'type');
        return { label: name, value: name, type };
    })
    
    const selectOptions = _.filter(allOptions, (schema: any) => schema.type === 'string')

    const fields = [
        {
            name: "denorm_key",
            label: "Dataset Field",
            type: 'autocomplete',
            required: true,
            selectOptions,
        },
        {
            name: "dataset_id",
            label: "Master Dataset",
            type: 'select',
            required: true,
            selectOptions: _.map(masterDatasets, dataset => {
                const name = _.get(dataset, 'name');
                const value = _.get(dataset, "dataset_id")
                return {
                    label: name,
                    value: value,
                }
            })
        },
        {
            name: "denorm_out_field",
            label: "Input Field (to store the data)",
            type: 'text',
            required: true,
        }
    ];

    const validationSchema = yup.object().shape({
        denorm_key: yup.string().required(en.isRequired),
        dataset_id: yup.string().required(en.isRequired),
        denorm_out_field: yup.string().required(en.isRequired).trim(en.whiteSpaceConflict).strict(true)
            .max(_.get(validationLimitConfig, ['denormInputFieldMaxLen'])).test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value)),
    });

    const denormWithMasterDataset = (payload: Record<string, any>) => {
        const { dataset_id } = payload
        const masterDataset = _.find(masterDatasets, dataset => _.get(dataset, 'dataset_id') === dataset_id);
        const masterDatasetId = _.get(masterDataset, 'dataset_id');
        const masterDatasetName = _.get(masterDataset, 'name');
        return {
            ...payload, 
            ...(masterDatasetId && {
                dataset_id: masterDatasetId,
                dataset_name: masterDatasetName
            })
        }
    }

    const updateDenormFields = async (payload: any) => {
        const denormPayload = denormWithMasterDataset(payload);
        setSelection((preState: any) => {
            const data = [...preState, denormPayload];
            persistState({ payload: data, newData: denormPayload });
            return data;
        });
    }

    const addField = async () => {
        onSubmission({});
        if (_.keys(formErrors).length > 0) { return; }
        if (_.size(value) === fields.length) {
            await updateDenormFields(value);
            onClose();
            return;
        }
    }

    return <>
        <Box sx={{ p: 1, py: 1.5, width: '50vw', maxWidth: "100%", height: 'auto' }}>
            <DialogTitle component={Box} display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h5">
                    Add Denorm Field
                </Typography>
                {onClose ? (
                    <IconButton
                        aria-label="close"
                        onClick={onClose}
                        sx={{
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <CloseOutlinedIcon />
                    </IconButton>
                ) : null}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} my={1}>
                    <MUIForm initialValues={{}} subscribe={subscribe} onSubmit={(value: any) => onSubmission(value)} fields={fields} size={{ xs: 12 }} validationSchema={validationSchema} subscribeErrors={subscribeErrors} />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 4 }}>
                <StandardWidthButton
                    data-edataid={interactIds.add_dataset_denorm_field}
                    data-objectid={value}
                    data-objecttype="masterDataset"
                    variant="contained"
                    disabled={disabled}
                    onClick={_ => addField()}
                    size="large"
                    sx={{ width: 'auto' }}
                >
                    <Typography variant="h5">
                        Add Field
                    </Typography>
                </StandardWidthButton>
            </DialogActions>
        </Box>
    </>
}

export default AddDenormField;
