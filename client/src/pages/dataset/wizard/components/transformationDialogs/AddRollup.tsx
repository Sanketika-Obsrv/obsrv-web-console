import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { IconButton } from "@mui/material";
import { Box, DialogActions, DialogContent, DialogTitle, Typography, Stack } from "@mui/material";
import MUIForm from "components/form";
import { useState } from "react";
import * as _ from 'lodash';
import { useSelector } from "react-redux";
import  interactIds  from "data/telemetry/interact.json";
import * as yup from "yup";
import { StandardWidthButton } from 'components/styled/Buttons';

const aggregateFunctions = [
    {
        label: 'COUNT',
        value: 'COUNT',
    },
    {
        label: 'MIN',
        value: 'MIN',
    },
    {
        label: 'MAX',
        value: 'MAX',
    },
    {
        label: 'AVG',
        value: 'AVG',
    },
    {
        label: 'SUM',
        value: 'AVG',
    },
];

const AddRollup = (props: any) => {
    const { data, onClose, setSelection, persistState } = props;
    const [value, subscribe] = useState<any>({});
    const onSubmission = (value: any) => { };
    const wizardState: any = useSelector((state: any) => state?.wizard);
    const jsonSchemaCols: any = _.get(wizardState, ['pages', 'columns', 'state', 'schema']) || [];
    const [formErrors, subscribeErrors] = useState<any>(null);

    const fields = [
        {
            name: "field",
            label: "Field",
            type: 'autocomplete',
            required: true,
            selectOptions: _.map(jsonSchemaCols, (schema: any) => {
                const name = _.get(schema, 'column');
                return { label: name, value: name };
            }),
        },
        {
            name: "aggregateFunction",
            label: "Aggregate Function",
            type: 'select',
            required: true,
            selectOptions: aggregateFunctions,
        },
        {
            name: "rollupFields",
            label: "Rollup Fields",
            type: 'autocomplete',
            multiple: true,
            selectOptions: _.map(jsonSchemaCols, (schema: any) => {
                const name = _.get(schema, 'column');
                return { label: name, value: name };
            }),
            required: true,
        },
        {
            name: "rollupFieldName",
            label: "Rollup Field Name",
            type: 'text',
            required: true
        }
    ];

    const validationSchema = yup.object().shape({
        field: yup.string().required("This field is required"),
        aggregateFunction: yup.string().required("This field is required"),
        rollupFields: yup.array()
            .min(1, "This field requires atleast 1 property")
            .required("This field is required")
            .nullable(),
        rollupFieldName: yup.string().required("This field is required"),
    });

    const addField = () => {
        onSubmission({});
        if (_.keys(formErrors).length > 0) { return; }
        if (_.size(value) === fields.length) {
            setSelection((preState: any) => {
                const data = [...preState, value];
                persistState(data);
                return data;
            });
            onClose();
        }
    }

    return <>
        <Box sx={{ p: 1, py: 1.5, width: '50vw', height: 'auto', maxWidth: "100%", }}>
            <DialogTitle component={Box} display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h5">
                    Add New Rollup
                </Typography>
                {onClose ? (
                    <IconButton
                        aria-label="close"
                        data-edataid={interactIds.sidebar_close}
                        data-objectid="closeCircleOutlined:addNewRollup"
                        data-objecttype="dataset"
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
                    <MUIForm
                        initialValues={{}}
                        subscribe={subscribe}
                        onSubmit={(value: any) => onSubmission(value)}
                        fields={fields}
                        size={{ xs: 12 }}
                        validationSchema={validationSchema}
                        subscribeErrors={subscribeErrors}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 4 }}>
                <StandardWidthButton
                    data-edataid={interactIds.add_dataset_field}
                    data-objectid={value}
                    data-objecttype="dataset"
                    variant="contained"
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

export default AddRollup;
