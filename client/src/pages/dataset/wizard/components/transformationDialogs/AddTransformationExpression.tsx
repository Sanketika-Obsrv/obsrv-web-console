import {
    IconButton, Popover, Typography,
    Box, DialogActions, DialogContent, DialogTitle
} from "@mui/material";
import MUIForm from "components/form";
import { useEffect, useMemo, useRef, useState } from "react";
import * as _ from 'lodash';
import { useDispatch, useSelector } from "react-redux";
import { addState } from "store/reducers/wizard";
import { Stack } from "@mui/material";
import { saveTransformations } from "services/dataset";
import { error } from "services/toaster";
import { v4 } from "uuid";
import interactIds from "data/telemetry/interact.json";
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import JSONataPlayground from "components/JSONataPlayground";
import * as yup from "yup";
import { StandardWidthButton } from "components/styled/Buttons";
import Loader from "components/Loader";
import en from 'utils/locales/en.json';
import AlertMessage from "components/AlertMessage";
import { InfoCircleOutlined } from "@ant-design/icons";
import { evaluateDataType } from "../../utils/dataTypeUtil";
import { validateFormValues } from "services/utils";
import { IWizard } from "types/formWizard";

const AddTransformationExpression = (props: any) => {
    const { id, data, onClose, selection, setSelection, actions, transformation_mode, mainDatasetId, generateInteractTelemetry, selectedValues, edit = false, existingTransformationSelections } = props;
    const dispatch = useDispatch();
    const [value, subscribe] = useState<any>({});
    const dataKey = useSelector((state: any) => state?.wizard?.pages?.dataKey?.dataKey || "");
    const filteredData = _.filter(data, payload => {
        if (_.find(selection, ['column', _.get(payload, 'column')])) return false;
        if (['array', 'object'].includes(_.get(payload, 'type'))) return false;
        if (dataKey === _.get(payload, 'column')) return false
        if (_.find(existingTransformationSelections, ['column', _.get(payload, 'column')])) return false;
        return true
    });
    const [sampleEvent, setSampleEvent] = useState<any>({});
    const sampleJsonData: any = useSelector((state: any) => state?.wizard?.pages?.datasetConfiguration?.state?.data || {});
    let jsonSchema: any = useSelector((state: any) => state?.wizard?.pages?.jsonSchema?.schema) || {};
    const [evaluationData, setEvaluationData] = useState<string>('');
    const [transformErrors, setTransformErrors] = useState<boolean>(false);
    const [updateValues, setUpdateValues] = useState<any>(null);
    const [updateErrors, setUpdateErrors] = useState<any>(null);
    const [formErrors, subscribeErrors] = useState<boolean>(true);
    const [loading, setLoading] = useState(false)
    const transformDataPredicate = (payload: Record<string, any>) => ({ label: _.get(payload, 'column'), value: _.get(payload, 'column') });
    const columnsData = edit ? data : filteredData;
    const columns = useMemo(() => _.map(columnsData, transformDataPredicate), [data]);
    const formikRef = useRef(null);

    const pushStateToStore = (values: Record<string, any>) => dispatch(addState({ id, ...values }));
    const onSubmission = (value: any) => { };
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const open = Boolean(anchorEl);
    const wizardState: IWizard = useSelector((state: any) => state?.wizard?.pages?.transformation);

    useEffect(() => {
        if (value.expression !== evaluationData)
            setEvaluationData(value.expression);
    }, [value]);

    const fields = [
        {
            name: "column",
            label: "Select Field",
            type: 'autocomplete',
            required: true,
            selectOptions: columns
        },
        {
            name: "transformation",
            label: "Select Transformation",
            type: 'radio',
            required: true,
            selectOptions: actions,
        },
        {
            name: "expression",
            label: "Add Custom Expression",
            type: 'text',
            dependsOn: {
                key: "transformation",
                value: "custom"
            },
            required: true,
            helperText: <>
                Ex: $sum(Product.(Price * Quantity)) <br /> FirstName & " " & Surname
            </>,
        },
        {
            name: "transformation_mode",
            label: "Transformation Mode",
            type: 'radio',
            required: true,
            selectOptions: transformation_mode,
        }
    ];

    const validationSchema = yup.object().shape({
        column: yup.string().required(en.isRequired),
        transformation: yup.string().required(en.isRequired),
        expression: yup.string().when(
            'transformation', {
            is: 'custom',
            then: yup.string().required(en.isRequired).trim(en.whiteSpaceConflict).strict(true),
        }),
        transformation_mode: yup.string().required(en.isRequired)
    });

    const saveTransformation = async (payload: any, updateStateData: any,) => {
        const dispatchError = () => dispatch(error({ message: "Error occured saving the transformation config" }));
        try {
            setLoading(true)
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

    const updateTransformation = async () => {
        generateInteractTelemetry({ edata: { id: `${interactIds.add_dataset_transformation}:${id}` } });
        onSubmission({});
        if (formErrors) {
            dispatch(error({ message: en["fill-required-fields"] }));
            return;
        }
        const { column, transformation, expression, transformation_mode } = value;
        const targetColumn = _.find(data, ['column', column]);
        if (targetColumn) {
            const uuid = v4();
            let updatedMeta: Record<string, any> = { ...targetColumn, transformation_mode, isModified: true, _transformationType: transformation, id: uuid, };
            if (transformation === "custom" && expression) {
                let transformedFieldDataType: any = {};
                try {
                    transformedFieldDataType = await evaluateDataType(expression, sampleEvent || sampleJsonData, jsonSchema);
                } catch (err: any) {
                    return updateErrors('expression', err?.message)
                }
                updatedMeta = {
                    ...updatedMeta,
                    transformation: expression,
                    _transformedFieldDataType: transformedFieldDataType?.data_type,
                    _transformedFieldSchemaType: transformedFieldDataType?.schema_type,
                };
                const meta = { ...targetColumn, ...updatedMeta };
                const payload = {
                    // id: uuid,
                    field_key: column,
                    transformation_function: {
                        type: "jsonata",
                        expr: expression,
                        datatype: transformedFieldDataType?.data_type,
                        // condition: null
                        category: "transform"
                    },
                    mode: transformation_mode,
                    dataset_id: mainDatasetId,
                    // metadata: {
                    //     _transformationType: "custom",
                    //     _transformedFieldDataType: transformedFieldDataType?.data_type,
                    //     _transformedFieldSchemaType: transformedFieldDataType?.schema_type,
                    //     section: "transformation"
                    // }
                };
                if (edit) {
                    _.set(payload, 'id', selectedValues?.id);
                    _.set(meta, 'id', selectedValues?.id);
                }
                await saveTransformation(payload, meta);
            } else {
                const meta = {
                    ...targetColumn,
                    ...updatedMeta,
                    _transformedFieldDataType: 'string',
                    _transformedFieldSchemaType: 'string',
                };
                const payload = {
                    // id: uuid,
                    field_key: column,
                    transformation_function: {
                        type: transformation,
                        expr: column,
                        datatype: "string",
                        // condition: null
                        category: "transform"
                    },
                    mode: transformation_mode,
                    dataset_id: mainDatasetId,
                    // metadata: {
                    //     _transformationType: transformation,
                    //     _transformedFieldDataType: 'string',
                    //     _transformedFieldSchemaType: 'string',
                    //     section: "transformation"
                    // }
                };
                if (edit) {
                    _.set(payload, 'id', selectedValues?.id);
                    _.set(meta, 'id', selectedValues?.id);
                }
                await saveTransformation(payload, meta);
            }
            onClose();
        } else {
            dispatch(error({ message: en["fill-required-fields"] }))
        }
    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        if (!transformErrors) updateValues('expression', evaluationData);
        setAnchorEl(null);
    };

    const closeTransformations = () => {
        setAnchorEl(null);
    }

    const validateForm = async () => {
        return validateFormValues(formikRef, value)
    }

    const subscribeToFormChanges = async () => {
        const isValid = await validateForm();
        subscribeErrors(!isValid)
    }

    useEffect(() => {
        if (_.size(value) > 0) subscribeToFormChanges();
    }, [value])

    return <>
        {loading && <Loader />}
        <Box sx={{ p: 1, py: 1.5, width: '50vw', height: 'auto', maxWidth: "100%", }}>
            <DialogTitle component={Box} display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h5">
                    {edit ? 'Update Field Transformation' : 'Add Field Transformation'}
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
                        customUpdate={setUpdateValues}
                        customError={setUpdateErrors}
                        ref={formikRef}
                    />
                    <AlertMessage color='info' messsage={en.transformationNotSupported} icon={InfoCircleOutlined} />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 4 }}>
                {_.get(value, 'transformation') === 'custom' &&
                    <Box mx={2}>
                        <StandardWidthButton
                            data-edataid={interactIds.jsonata}
                            onClick={handleClick}
                            sx={{ width: 'auto' }}
                        >
                            <Typography variant="h5">
                                Try Out
                            </Typography>
                        </StandardWidthButton>
                    </Box>}
                <StandardWidthButton
                    variant="contained" autoFocus
                    onClick={_ => updateTransformation()}
                    disabled={formErrors}
                    size="large"
                    sx={{ width: 'auto' }}
                >
                    <Typography variant="h5">
                        {edit ? 'Update' : 'Add'}
                    </Typography>
                </StandardWidthButton>
            </DialogActions>
            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{ sx: { height: '100%', width: '100%', overflow: 'hidden' } }}
            >
                <JSONataPlayground
                    setSampleEvent={setSampleEvent}
                    handleClose={handleClose}
                    evaluationData={evaluationData}
                    setEvaluationData={setEvaluationData}
                    setTransformErrors={setTransformErrors}
                    transformErrors={transformErrors}
                    closeTransformations={closeTransformations}
                />
            </Popover>
        </Box>
    </>
}

export default AddTransformationExpression;
