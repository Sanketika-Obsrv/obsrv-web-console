import {
    IconButton,
    Typography,
    Box,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    Alert,
    Grid,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Select,
    InputLabel,
    MenuItem
} from '@mui/material';
import schema from './Schema';
import React, { useEffect, useState } from 'react';
import * as _ from 'lodash';
import { Stack } from '@mui/material';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import en from 'utils/locales/en.json';

interface FormData {
    [key: string]: unknown;
}

interface Schema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

interface AddPiiFormProps {
    schema: Schema;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

const AddPIIDialog = (props: any) => {
    const {
        data,
        handleAddOrEdit,
        onClose,
        edit = false,
        transformationOptions,
        addedSuggestions
    } = props;

    const [formErrors, setFormErrors] = useState<unknown[]>([]);
    const [formData, setFormData] = useState<any>({
        section: {
            transformations: '',
            transformationType: 'Mask',
            transformationMode: 'Strict',
        }
    });

    if (!_.isEmpty(transformationOptions))
        _.set(
            schema,
            ['schema', 'properties', 'section', 'properties', 'transformations', 'enum'],
            transformationOptions
        );

    useEffect(() => {
        const transformations = _.get(data, ['column'], '');

        if (!_.isEmpty(data)) {
            const existingData = {
                section: {
                    transformations,
                    transformationType: _.get(data, ['transformationType']),
                    transformationMode: _.get(data, ['transformationMode'])
                }
            };

            setFormData(existingData);
        }

        _.set(
            schema,
            ['uiSchema', 'section', 'transformations', 'ui:disabled'],
            _.includes(_.map(addedSuggestions, 'column'), transformations)
        );
    }, [data, addedSuggestions]);

    const onHandleClick = async () => {
        const newData = _.get(formData, ['section']);
        const array = [];

        if (!_.isEmpty(data) && edit) {
            array.push({
                value: { field_key: _.get(data, ['column']) },
                action: 'remove'
            });
        }

        array.push({
            value: {
                field_key: _.get(newData, ['transformations'], ''),
                transformation_function: {
                    type: _.get(newData, ['transformationType'], ''),
                    expr: _.get(newData, ['transformations'], ''),
                    datatype: 'string',
                    category: 'pii'
                },
                mode: _.get(newData, ['transformationMode'], '')
            },
            action: 'upsert'
        });

        handleAddOrEdit(array);
        onClose();
    };

    const handleChange: AddPiiFormProps['onChange'] = (formData, errors) => {
        setFormData(formData);
        if (errors) {
            setFormErrors(errors);
        } else {
            setFormErrors([]);
        }
    };

    const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormData((prevState: any) => ({
            ...prevState,
            section: {
                ...prevState.section,
                [name]: value
            }
        }));
    };

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

    return (
        <Box sx={{ p: 1, py: 1.5, width: '28vw', height: 'auto', maxWidth: '100%' }}>
            <DialogTitle
                component={Box}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
            >
                <Typography variant="h5">{edit ? 'Update Sensitive Field' : 'Add Sensitive Field'}</Typography>
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
                            <InputLabel>Select Sensitive Field</InputLabel>
                            <Select
                                name='transformations'
                                labelId="dedupKey-select-label"
                                id="dedupKey-select"
                                label="Select Sensitive Field"
                                value={formData.section.transformations}
                                onChange={handleInputChange}
                                required
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
                        <FormControl>
                            <FormLabel required>Select Action</FormLabel>
                            <RadioGroup
                                name="transformationType"
                                value={formData.section.transformationType}
                                onChange={handleRadioChange}
                            >
                                <Box display="flex">
                                    <FormControlLabel value="Mask" control={<Radio />} label="Mask" />
                                    <FormControlLabel value="Encrypt" control={<Radio />} label="Encrypt" />
                                </Box>
                            </RadioGroup>
                        </FormControl>
                    </Grid>
                    <Grid>
                        <FormControl>
                            <FormLabel required>Skip On Transformation Failure?</FormLabel>
                            <RadioGroup
                                name="transformationMode"
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
                    <Alert severity="info" sx={{ background: '#f1fcf9' }}>
                    {en.transformationNotSupported}
                </Alert>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 4 }}>
                <Button
                    variant="contained"
                    autoFocus
                    onClick={onHandleClick}
                    disabled={!_.isEmpty(formErrors) || _.isEmpty(_.get(formData, ['section', 'transformations']))}
                    size="large"
                    sx={{ width: 'auto' }}
                >
                    {edit ? 'Update' : 'Add'}
                </Button>
            </DialogActions>
        </Box>
    );
};

export default AddPIIDialog;
