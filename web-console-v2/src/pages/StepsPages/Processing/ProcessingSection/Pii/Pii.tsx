import {
    IconButton,
    Typography,
    Box,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    Alert
} from '@mui/material';
import AddPii from 'components/Form/DynamicForm';
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
    const [formData, setFormData] = useState<{ [key: string]: unknown }>({});

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
                    transformationMode: _.get(data, ['transformationMode']),
                    expression: _.get(data, ['transformation'])
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

    return (
        <Box sx={{ p: 1, py: 1.5, width: '28vw', height: 'auto', maxWidth: '100%' }}>
            <DialogTitle
                component={Box}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
            >
                <Typography variant="h5">{edit ? 'Update PII Field' : 'Add PII Field'}</Typography>
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
                <Stack mt={-4} width="auto">
                    <AddPii
                        schema={schema}
                        formData={formData}
                        setFormData={setFormData}
                        onChange={handleChange}
                        customClassNames={{
                            container: 'customContainerClass',
                            sectionContainer: 'customSectionContainerClass',
                            connectorName: 'customConnectorNameClass',
                            sectionContainers: 'customSectionContainersClass'
                        }}
                    />
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
                    disabled={!_.isEmpty(formErrors) || _.isEmpty(formData.section)}
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
