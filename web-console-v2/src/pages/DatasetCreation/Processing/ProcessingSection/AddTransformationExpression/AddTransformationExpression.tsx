import {
    IconButton,
    Typography,
    Box,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    Popover,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import React, { useEffect, useState } from 'react';
import * as _ from 'lodash';
import { Stack } from '@mui/material';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import JSONataPlayground from 'components/JsonPlay/JSONataPlayground';
import { evaluateDataType } from 'pages/DatasetCreation/Processing/utils/dataTypeUtil';
import { Alert } from '@mui/material';
import en from 'utils/locales/en.json';

interface FormData {
    [key: string]: unknown;
}

interface Schema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

interface TransformationFormProps {
    schema: Schema;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

const AddTransformationExpression = (props: any) => {
    const { data, handleAddOrEdit, onClose, edit = false, transformationOptions, jsonData, } = props;

    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | HTMLElement | null>(null);
    const [evaluationData, setEvaluationData] = useState<string>('');
    const [stateId, setStateId] = useState<string>(uuidv4())
    const [transformErrors, setTransformErrors] = useState<boolean>(false);

    const open = Boolean(anchorEl);

    const [formData, setFormData] = useState<any>({
        section: {
            transformations: '',
            transformationType: '',
            transformationMode: 'Strict'
        }
    });

    useEffect(() => {
        if (!_.isEmpty(data)) {
            const type = _.get(data, ['transformation']);
            const existingData = {
                section: {
                    transformations: _.get(data, ['column']),
                    transformationType: type,
                    transformationMode: _.get(data, ['transformationMode']),
                    expression: _.get(data, ['transformation'])
                }
            };

            setFormData(existingData);
            setEvaluationData(_.get(data, ['transformation']));
        }
    }, [data]);

    const handleSelect = (event: React.SyntheticEvent<HTMLDivElement>) => {
        setEvaluationData(transformationType)
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setFormData((prevState: any) => ({
            ...prevState,
            section: {
                ...prevState.section,
                transformationType: evaluationData
            }
        }));
        setAnchorEl(null);
    };

    const closeTransformations = () => {
        setFormData((prevState: any) => ({
            ...prevState,
            section: {
                ...prevState.section,
                transformationType: _.get(data, "transformation") || ""
            }
        }));
        setAnchorEl(null);
    };

    const onHandleClick = async () => {
        const newData = _.get(formData, ['section']);
        const array = [];
        if (!_.isEmpty(data)) {
            array.push({
                value: { field_key: _.get(data, ['column']) },
                action: 'remove'
            });
        }

        const obj = {
            value: {
                field_key: _.get(newData, ['transformations'], ''),
                transformation_function: {
                    type: 'jsonata',
                    expr: _.get(newData, ['transformationType'], ''),
                    category: 'transform'
                },
                mode: _.get(newData, ['transformationMode'], '')
            },
            action: 'upsert'
        };

        try {
            const datatype = await evaluateDataType(_.get(newData, ['transformationType'], ''), jsonData);
            _.set(
                obj,
                ['value', 'transformation_function', 'datatype'],
                _.get(datatype, 'data_type')
            );

            array.push(obj);
            handleAddOrEdit(array);
            onClose();
        }
        catch (error) {
            const message = _.get(error, 'message', 'Invalid transformation type');
            setTransformationTypeError(message);
        }
    };

    const transformationType = _.get(formData, ['section', 'transformationType']);
    const handleErrors = async () => {
        if (transformationType) {
            try {
                await evaluateDataType(transformationType, jsonData);
                setTransformationTypeError(null);
                setStateId(uuidv4());
            } catch (error) {
                const message = _.get(error, 'message', 'Invalid transformation type');
                setTransformationTypeError(message);
            }
        }
    };

    useEffect(() => {
        handleErrors()
        if (_.isEmpty(transformationType)) {
            setTransformationTypeError(null)
        }
    }, [transformationType])

    const [transformationTypeError, setTransformationTypeError] = useState<string | null>(null);
    const handleInputChange: any = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormData((prevState: any) => ({
            ...prevState,
            section: {
                ...prevState.section,
                [name]: value
            }
        }));
    };

    const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prevState: any) => ({
            ...prevState,
            section: {
                ...prevState.section,
                transformationMode: event.target.value
            }
        }));
    };

    return (
        <>
            <Box sx={{ p: 1, py: 1.5, width: '30vw', height: 'auto', maxWidth: '100%' }}>
                <DialogTitle
                    component={Box}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Typography variant="h5">
                        {edit ? 'Update Field Transformation' : 'Add Field Transformation'}
                    </Typography>
                    {onClose ? (
                        <IconButton
                            aria-label="close"
                            onClick={onClose}
                            sx={{
                                color: (theme) => theme.palette.grey[500]
                            }}
                        >
                            <CloseOutlinedIcon />
                        </IconButton>
                    ) : null}
                </DialogTitle>
                <DialogContent>
                    <Stack mt={2} spacing={2} width="auto">
                        <Grid>
                            <FormControl fullWidth >
                                <InputLabel>Select Field</InputLabel>
                                <Select
                                    required
                                    name='transformations'
                                    label="Select Field"
                                    value={formData.section.transformations}
                                    onChange={handleInputChange}
                                >
                                    {transformationOptions.map((option: string) => (
                                        <MenuItem key={option} value={option}>
                                            {option}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid>
                            <TextField
                                name='transformationType'
                                label={'Add JSONAta Expression'}
                                required
                                variant="outlined"
                                fullWidth
                                value={formData.section.transformationType}
                                onSelect={handleSelect}
                                onChange={handleInputChange}
                                error={Boolean(!_.isEmpty(transformationTypeError))}
                                helperText={
                                    transformationTypeError || `Ex: $sum(Product.(Price * Quantity)) FirstName & " " & Surname`
                                }
                            />
                        </Grid>
                        <Grid>
                            <FormControl>
                                <FormLabel required id="demo-radio-buttons-group-label">Skip On Transformation Failure?</FormLabel>
                                <RadioGroup
                                    name="radio-buttons-group"
                                    value={formData.section.transformationMode}
                                    onChange={handleRadioChange}
                                >
                                    <Box display="flex">
                                        <FormControlLabel value="Strict" control={<Radio />} label="Yes" />
                                        <FormControlLabel value="Lenient" control={<Radio />} label="No" />
                                    </Box>
                                </RadioGroup>
                            </FormControl>
                        </Grid>
                    </Stack>

                    <Alert severity="info" sx={{ background: '#f1fcf9' }}>
                        {en.transformationNotSupported}
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ px: 4 }}>
                    <Button
                        variant="contained"
                        autoFocus
                        onClick={onHandleClick}
                        disabled={
                            !_.isEmpty(transformationTypeError) || _.isEmpty(_.get(formData, ["section", "transformations"])) || _.isEmpty(_.get(formData, ["section", "transformationType"]))
                        }
                        size="large"
                        sx={{ width: 'auto' }}
                    >
                        {edit ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
                <Popover
                    open={open}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'left'
                    }}
                    className='jsonata'
                    PaperProps={{ sx: { height: '100%', width: '100%', overflow: 'hidden' } }}
                >
                    <JSONataPlayground
                        sample_data={jsonData}
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
    );
};

export default AddTransformationExpression;
