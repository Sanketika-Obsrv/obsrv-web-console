import {
    IconButton,
    Typography,
    Box,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    Popover
} from '@mui/material';
import AddNewFields from 'components/Form/DynamicForm';
import schema from './Schema';
import React, { useEffect, useState } from 'react';
import * as _ from 'lodash';
import { Stack } from '@mui/material';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import JSONataPlayground from 'components/JsonPlay/JSONataPlayground';
import { evaluateDataType } from 'pages/StepsPages/Processing/utils/dataTypeUtil';

interface FormData {
    [key: string]: unknown;
}

interface Schema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

interface ConfigureConnectorFormProps {
    schema: Schema;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

const AddNewField = (props: any) => {
    const { data, handleAddOrEdit, onClose, edit = false, jsonData } = props;

    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [evaluationData, setEvaluationData] = useState<string>('');
    const [transformErrors, setTransformErrors] = useState<boolean>(false);
    const [extraErrors, setExtraErrors] = useState<any>({
        section: {
            transformationType: {
                __errors: []
            }
        }
    });

    const open = Boolean(anchorEl);

    const [formErrors, setFormErrors] = useState<unknown[]>([]);
    const [formData, setFormData] = useState<FormData>({
        section: {
            transformations: '',
            transformationType: ''
        }
    });

    useEffect(() => {
        if (!_.isEmpty(data)) {
            const existingData = {
                section0: {
                    section: {
                        transformations: _.get(data, ['column']),
                        transformationType: _.get(data, ['transformation']),
                        transformationMode: _.get(data, ['transformationMode'])
                    }
                }
            };

            setFormData(existingData);
            setEvaluationData(_.get(data, ['transformation']));
        }
    }, [data]);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        if (!transformErrors) {
            const newData = _.cloneDeep(formData);

            const keyPath = ['section', 'transformationType'];

            _.set(newData, keyPath, evaluationData);

            setFormData(newData);
        }

        setAnchorEl(null);
    };

    const closeTransformations = () => {
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

        const datatype = await evaluateDataType(
            _.get(newData, ['transformationType'], ''),
            jsonData
        );

        array.push({
            value: {
                field_key: _.get(newData, ['transformations'], ''),
                transformation_function: {
                    type: 'jsonata',
                    expr: _.get(newData, ['transformationType'], ''),
                    datatype: _.get(datatype, 'data_type'),
                    category: 'derived'
                },
                mode: _.get(newData, ['transformationMode'], '')
            },
            action: 'upsert'
        });

        handleAddOrEdit(array);

        onClose();
    };

    const handleChange: ConfigureConnectorFormProps['onChange'] = async (formData, errors) => {
        setFormData(formData);
        const transformationType = _.get(formData, ['section', 'transformationType']);
        
        if (errors) {
            setFormErrors(errors);
        } else {
            setFormErrors([]);
        }

        if (transformationType) {
            try {
                await evaluateDataType(transformationType, jsonData);
                _.set(extraErrors, ['section', 'transformationType', '__errors'], []);
            } catch (error) {
                const message = _.get(error, 'message');
                _.set(extraErrors, ['section', 'transformationType', '__errors'], [message]);
                setFormErrors([message]);
            }
        }
        setExtraErrors(extraErrors);
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
                    <Typography variant="h5" component="span">
                        {edit ? 'Update Field' : 'Add Derived Field'}
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
                    <Stack mt={-4} width="auto">
                        <AddNewFields
                            schema={schema}
                            formData={formData}
                            setFormData={setFormData}
                            onChange={handleChange}
                            extraErrors={extraErrors}
                            customClassNames={{
                                container: 'customContainerClass',
                                sectionContainer: 'customSectionContainerClass',
                                connectorName: 'customConnectorNameClass',
                                sectionContainers: 'customSectionContainersClass'
                            }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 4 }}>
                    <Box mx={2}>
                        <Button onClick={handleClick} sx={{ width: 'auto' }}>
                            Try Out
                        </Button>
                    </Box>
                    <Button
                        variant="contained"
                        autoFocus
                        onClick={onHandleClick}
                        disabled={!_.isEmpty(formErrors) || _.isEmpty(_.get(formData, ["section", "transformations"])) || _.isEmpty(_.get(formData, ["section", "transformationType"]))}
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

export default AddNewField;
