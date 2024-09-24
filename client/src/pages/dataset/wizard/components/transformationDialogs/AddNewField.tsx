import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {
    Grid, IconButton, TextField, Tooltip, Box,
    DialogContent, Stack, DialogTitle, Popover,
    Typography,
    FormGroup,
    FormControlLabel,
    Radio
} from "@mui/material";
import { useEffect, useState } from "react";
import * as _ from 'lodash';
import { useDispatch, useSelector } from "react-redux";
import { addState, updateState } from "store/reducers/wizard";
import { v4 } from "uuid";
import { saveTransformations } from "services/dataset";
import { error } from "services/toaster";
import interactIds from "data/telemetry/interact.json";
import JSONataPlayground from "components/JSONataPlayground";
import * as yup from "yup";
import { useFormik } from 'formik';
import { StandardWidthButton } from 'components/styled/Buttons';
import Loader from 'components/Loader';
import en from 'utils/locales/en.json';
import { hasSpecialCharacters, hasSpacesInField } from "services/utils";
import { evaluateDataType } from '../../utils/dataTypeUtil';
import { FormattedMessage } from 'react-intl';
import { IWizard } from 'types/formWizard';

export const openJsonAtaEditor = () => {
    window.open('https://try.jsonata.org/', '__blank', 'noopener,noreferrer');
}

const AddNewField = (props: any) => {
    const { id, data, onClose, selection, setSelection, mainDatasetId, generateInteractTelemetry, selectedValues, edit = false, existingTransformationSelections, transformation_mode } = props;
    const [evaluationData, setEvaluationData] = useState<string>('');
    const [transformErrors, setTransformErrors] = useState<boolean>(false);
    const dispatch = useDispatch();
    const validationLimitConfig = useSelector((state: any) => state?.config?.validationLimit || {})
    const pushStateToStore: any = (values: Record<string, any>) => dispatch(addState({ id, ...values }));
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [loading, setLoading] = useState<boolean>(false)
    const [disable, setDisable] = useState<boolean>(true)
    const [formErrors, setFormErrors] = useState<any>(null)
    const [sampleEvent, setSampleEvent] = useState<any>({});
    const sampleJsonData: any = useSelector((state: any) => state?.wizard?.pages?.datasetConfiguration?.state?.data || {});
    const open = Boolean(anchorEl);
    let jsonSchema: any = useSelector((state: any) => state?.wizard?.pages?.jsonSchema?.schema) || {};
    const wizardState: IWizard = useSelector((state: any) => state?.wizard?.pages?.additionalFields);

    const newFieldForm: any = useFormik({
        initialValues: selectedValues ? selectedValues : {
            "column": "",
            "transformation": "",
            "transformation_mode": "Strict"
        },
        onSubmit: (values) => {
            onSubmission(values);
        },
        validationSchema: yup.object().shape({
            column: yup.string().required(en.isRequired).test('spaceInField', en.containsSpaces, value => hasSpacesInField(value))
                .max(_.get(validationLimitConfig, ['transformationFieldMaxLen'])).test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
                .test('duplicateFieldName', en.fieldNameAlreadyInUse, async (value: any) => new Promise(
                    (resolve: any) => {
                        const fieldExists = _.find(existingTransformationSelections, ["column", value])
                        if (edit) {
                            if (_.get(newFieldForm, ["initialValues", "column"]) == value) {
                                resolve(true)
                            }
                        }
                        if (fieldExists) resolve(false)
                        else resolve(true)
                    }
                ))
                .test('columnExists', en.columnNameAlreadyExists, async (value: any) => new Promise(
                    (resolve: any) => {
                        const fieldExists = _.find(data, ['column', value])
                        if (fieldExists) resolve(false)
                        else resolve(true)
                    }
                )),
            transformation: yup.string().required(en.isRequired).trim(en.whiteSpaceConflict).strict(true),
            transformation_mode: yup.string().required(en.isRequired)
        }),
        enableReinitialize: true,
    });

    const saveTransformation = async (payload: any, updateStateData: any) => {
        const dispatchError = () => dispatch(error({ message: "Error occured saving the transformation config" }));
        setLoading(true)
        try {
            const data = await saveTransformations({ ...payload, edit, existingTransformations: wizardState, selectedValues });
            if (data.data)
                setSelection((preState: any) => {
                    if (edit) {
                        const copy = _.cloneDeep(preState);
                        const eventIndex = _.findIndex(copy, ['column', _.get(selectedValues, "column")]);
                        const data = _.merge(copy[eventIndex], updateStateData);
                        copy.splice(eventIndex, 1, data);
                        pushStateToStore({ selection: copy });
                        return copy;
                    }
                    const updatedState = [...preState, updateStateData];
                    pushStateToStore({ selection: updatedState });
                    return updateState;
                });
            else dispatchError();
        } catch (err) {
            dispatchError();
        } finally {
            setLoading(true)
        }
    }

    useEffect(() => {
        if (evaluationData !== newFieldForm.values.transformation)
            setEvaluationData(newFieldForm.values.transformation);
    }, [newFieldForm.values])

    const updateAdditionalField = async () => {
        generateInteractTelemetry({ edata: { id: `${interactIds.add_dataset_transformation}:${id}` } });
        onSubmission({});
        if (_.keys(newFieldForm.errors).length > 0) {
            dispatch(error({ message: en["fill-required-fields"] }));
            return;
        }
        const { column, transformation, transformation_mode } = newFieldForm.values;
        if (column && transformation && transformation_mode) {
            let transformedFieldDataType: any = {};
            try {
                transformedFieldDataType = await evaluateDataType(transformation, sampleEvent || sampleJsonData, jsonSchema);
            } catch (err: any) {
                return newFieldForm.setErrors({ transformation: err?.message })
            }
            const uuid = v4();
            const updatedColumnMetadata = { column, transformation, transformation_mode, isModified: true, _transformationType: "custom", id: uuid, _transformedFieldDataType: transformedFieldDataType?.data_type, _transformedFieldSchemaType: transformedFieldDataType?.schema_type }
            const payload = {
                field_key: column,
                transformation_function: {
                    type: "jsonata",
                    expr: transformation,
                    datatype: transformedFieldDataType?.data_type,
                    category: "derived"
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

    const fields: any = [
        {
            name: "column",
            label: "Field Name",
            type: 'text',
            required: true
        },
        {
            name: "transformation",
            label: "Transformation Expression",
            type: 'text',
            required: true,
            helperText: <>
                Ex: $sum(Product.(Price * Quantity)) <br /> FirstName & " " & Surname
            </>,
        }
    ];

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        if (!transformErrors) newFieldForm.setFieldValue("transformation", evaluationData);
        setAnchorEl(null);
    };

    const closeTransformations = () => {
        setAnchorEl(null);
    }

    const onSubmission = (values: any) => { };

    useEffect(() => {
        !(_.isEmpty(newFieldForm?.values?.column) &&
            _.isEmpty(newFieldForm?.values?.transformation)) && setDisable(_.keys(formErrors).length > 0)
    }, [formErrors])

    useEffect(() => {
        setFormErrors(newFieldForm.errors)
    }, [newFieldForm.errors])

    return <>
        {loading && <Loader />}
        <Box sx={{ p: 1, py: 1.5, width: '50vw', maxWidth: "100%", }}>
            <DialogTitle component={Box} display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h5">
                    {edit ? 'Update Field' : 'Add Derived Field'}
                </Typography>
                {onClose ? (
                    <IconButton
                        id="iconButton"
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
                    <form onSubmit={newFieldForm.handleSubmit}>
                        <Grid container spacing={1}>
                            <Grid item xs={12}>
                                {fields.map((item: any) => (
                                    <Tooltip title={item.label} key={item.name}>
                                        <TextField
                                            value={newFieldForm.values[item.name]}
                                            onChange={newFieldForm.handleChange}
                                            name={item.name}
                                            label={item.label}
                                            sx={{ m: 1 }}
                                            variant="outlined"
                                            fullWidth
                                            autoComplete="off"
                                            onBlur={newFieldForm.handleBlur}
                                            error={Boolean(newFieldForm.errors[item.name])}
                                            helperText={newFieldForm.touched[item.name] && newFieldForm.errors[item.name] && String(newFieldForm.errors[item.name]) || item.helperText}
                                        />
                                    </Tooltip>
                                ))}
                            </Grid>
                            <Grid item xs={12}>
                                <FormGroup>
                                    <Typography variant="h6" fontWeight="500" aria-label='form-label' gutterBottom>
                                        <FormattedMessage id="transformation-mode-title" />
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        {transformation_mode.map((option: any) => {
                                            const { value, label } = option;
                                            return <FormControlLabel key={`transformation-${value}`} name={"transformation_mode"} control={
                                                <Radio onBlur={newFieldForm.handleBlur} name={"transformation_mode"} className="size-medium" checked={value === _.get(newFieldForm.values, "transformation_mode")} value={value} onChange={newFieldForm.handleChange} required={true} disabled={false} />
                                            } label={label} />
                                        })}
                                    </Stack>
                                </FormGroup>
                            </Grid>
                            <Grid item xs={12} display="flex" alignItems="center" justifyContent="flex-end">
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
                                </Box>
                                <StandardWidthButton
                                    variant="contained"
                                    onClick={_ => updateAdditionalField()}
                                    size="large"
                                    disabled={disable}
                                    sx={{ width: 'auto' }}
                                >
                                    <Typography variant="h5">
                                        {edit ? 'Update' : 'Add'}
                                    </Typography>
                                </StandardWidthButton>
                            </Grid>
                        </Grid>
                    </form>
                </ Stack>
            </DialogContent>
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

export default AddNewField;
