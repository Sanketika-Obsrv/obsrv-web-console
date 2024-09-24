import {
    Stack, IconButton, Typography, Box, DialogActions,
    DialogContent, DialogTitle,
} from "@mui/material";
import MUIForm from "components/form";
import { useEffect, useMemo, useState } from "react";
import * as _ from 'lodash';
import { useDispatch, useSelector } from "react-redux";
import { addState } from "store/reducers/wizard";
import { v4 } from "uuid";
import { saveTransformations } from "services/dataset";
import { error } from "services/toaster";
import interactIds from "data/telemetry/interact.json";
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import * as yup from "yup";
import { StandardWidthButton } from "components/styled/Buttons";
import Loader from "components/Loader";
import en from 'utils/locales/en.json';
import AlertMessage from "components/AlertMessage";
import { InfoCircleOutlined } from "@ant-design/icons";
import { IWizard } from "types/formWizard";

const AddPIIDialog = (props: any) => {
    const { id, data, onClose, selection, setSelection, actions, mainDatasetId, generateInteractTelemetry, selectedValues, edit = false, existingTransformationSelections, transformation_mode, filterAddedSuggestions } = props;
    const [value, subscribe] = useState<any>({});
    const [loading, setLoading] = useState<boolean>(false)
    const dispatch = useDispatch();
    const [errors, subscribeErrors] = useState<any>(null);
    const [disable, setDisable] = useState<boolean>(true)
    const dataKey = useSelector((state: any) => state?.wizard?.pages?.dataKey?.dataKey || "");
    const wizardState: IWizard = useSelector((state: any) => state?.wizard?.pages?.pii);

    const filteredData = _.filter(data, payload => {
        if (_.find(selection, ['column', _.get(payload, 'column')])) return false;
        if (['array', 'object'].includes(_.get(payload, 'type'))) return false;
        if (dataKey === _.get(payload, 'column')) return false
        if (_.find(existingTransformationSelections, ['column', _.get(payload, 'column')])) return false;
        return true
    });

    const transformDataPredicate = (payload: Record<string, any>) => ({ label: _.get(payload, 'column'), value: _.get(payload, 'column') });
    const columnsData = edit ? data : filteredData;
    const columns = useMemo(() => _.map(columnsData, transformDataPredicate), [data]);

    const onSubmission = (value: any) => { };
    const pushStateToStore = (values: Record<string, any>) => dispatch(addState({ id, ...values }));

    const saveTransformation = async (payload: any, updateStateData: any) => {
        const dispatchError = () => dispatch(error({ message: "Error occured saving the transformation config" }));
        setLoading(true)
        try {
            const data = await saveTransformations({ ...payload, edit, existingTransformations: wizardState, selectedValues });
            if (data.data)
                setSelection((preState: Array<any>) => {
                    if (edit) {
                        const copy = _.cloneDeep(preState);
                        const eventIndex = _.findIndex(copy, ['column', updateStateData?.column]);
                        const data = _.merge(copy[eventIndex], updateStateData);
                        copy.splice(eventIndex, 1, data);
                        pushStateToStore({ selection: copy });
                        return copy;
                    }
                    const updatedState = [...preState, updateStateData];
                    pushStateToStore({ selection: updatedState });
                    return updatedState;
                });
            else dispatchError();
        } catch (err) {
            dispatchError();
        } finally {
            setLoading(false)
        }
    }

    const updatePIIMeta = async () => {
        generateInteractTelemetry({ edata: { id: `${interactIds.add_dataset_transformation}:${id}` } });
        onSubmission({});
        if (_.keys(errors).length > 0) {
            dispatch(error({ message: en["fill-required-fields"] }));
            return;
        }
        const { column, transformation, transformation_mode } = value;
        const targetColumn = _.find(data, ['column', column]);
        if (targetColumn) {
            const uuid = v4();
            const updatedColumnMetadata = { ...targetColumn, transformation_mode, isModified: true, _transformationType: transformation, _transformedFieldDataType: 'string', _transformedFieldSchemaType: 'string', id: uuid };
            const payload: any = {
                id: uuid,
                field_key: column,
                transformation_function: {
                    type: transformation,
                    expr: column,
                    category: "pii",
                    datatype: "string"
                },
                mode: transformation_mode,
                dataset_id: mainDatasetId,
            };
            if (edit) {
                _.set(payload, 'id', selectedValues?.id);
                _.set(updatedColumnMetadata, 'id', selectedValues?.id);
            }
            await saveTransformation(payload, updatedColumnMetadata);
            onClose();
        } else {
            dispatch(error({ message: en["fill-required-fields"] }))
        }
    }

    function isSelectedField(selection: any, selectedValues: any) {
        const disableSuggestedField = selection.find((ele: any) => {
            return ele?.isSuggestedField && ele?.column === selectedValues?.column;
        }) !== undefined;
        return disableSuggestedField
    }

    const fields = [
        {
            name: "column",
            label: "Select Field",
            type: 'autocomplete',
            required: true,
            selectOptions: columns,
            disabled: isSelectedField(filterAddedSuggestions, selectedValues)
        },
        {
            name: "transformation",
            label: "Select Transformation",
            type: 'radio',
            required: true,
            selectOptions: actions
        },
        {
            name: "transformation_mode",
            label: "Transformation Mode",
            type: 'radio',
            required: true,
            selectOptions: transformation_mode,
        }
    ]

    const validationSchema = yup.object().shape({
        column: yup.string().required(en.isRequired),
        transformation: yup.string().required(en.isRequired),
        transformation_mode: yup.string().required(en.isRequired)
    });

    useEffect(() => {
        !_.isEmpty(value) && setDisable(_.keys(errors).length > 0)
    }, [value])

    return <>
        {loading && <Loader />}
        <Box sx={{ p: 1, py: 1.5, width: '50vw', maxWidth: "100%", }}>
            <DialogTitle component={Box} display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h5">
                    {edit ? 'Update PII Field' : 'Add PII Field'}
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
                    <MUIForm
                        initialValues={selectedValues ? selectedValues : { "transformation_mode": "Strict" }}
                        subscribe={subscribe}
                        onSubmit={(value: any) => onSubmission(value)}
                        fields={fields}
                        size={{ xs: 12 }}
                        validationSchema={validationSchema}
                        subscribeErrors={subscribeErrors}
                    />
                    <AlertMessage color='info' messsage={en.transformationNotSupported} icon={InfoCircleOutlined} />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 4 }}>
                <StandardWidthButton
                    variant="contained"
                    onClick={_ => updatePIIMeta()}
                    disabled={disable}
                    size="large"
                    sx={{ width: 'auto' }}
                >
                    <Typography variant="h5">
                        {edit ? 'Update' : 'Add'}
                    </Typography>
                </StandardWidthButton>
            </DialogActions>
        </Box></>
}

export default AddPIIDialog;