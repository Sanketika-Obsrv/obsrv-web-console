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
import TransformationForm from 'components/Form/DynamicForm';
import schema from './Schema';
import React, { useEffect, useState } from 'react';
import * as _ from 'lodash';
import { Stack } from '@mui/material';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import JSONataPlayground from 'components/JsonPlay/JSONataPlayground';
import { evaluateDataType } from 'pages/StepsPages/Processing/utils/dataTypeUtil';
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
    schemas: Schema[];
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

const AddTransformationExpression = (props: any) => {
    const { data, handleAddOrEdit, onClose, edit = false, transformationOptions, jsonData } = props;

    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [evaluationData, setEvaluationData] = useState<string>('');
    const [transformErrors, setTransformErrors] = useState<boolean>(false);
    const [extraErrors, setExtraErrors] = useState<any>({});

    const open = Boolean(anchorEl);

    const [formErrors, setFormErrors] = useState<unknown[]>([]);
    const [formData, setFormData] = useState<{ [key: string]: unknown }>({});

    if (!_.isEmpty(transformationOptions))
        _.set(
            schema,
            [0, 'schema', 'properties', 'section', 'properties', 'transformations', 'enum'],
            transformationOptions
        );

    useEffect(() => {
        if (!_.isEmpty(data)) {
            const type = _.get(data, ['transformationType']);

            const existingData = {
                section0: {
                    section: {
                        transformations: _.get(data, ['column']),
                        transformationType: _.isEqual(type, 'custom') ? 'jsonata' : type,
                        transformationMode: _.get(data, ['transformationMode']),
                        expression: _.get(data, ['transformation'])
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

            const keyPath = ['section0', 'section', 'expression'];

            _.set(newData, keyPath, evaluationData);

            setFormData(newData);
        }

        setAnchorEl(null);
    };

    const closeTransformations = () => {
        setAnchorEl(null);
    };

    const isJsonata = _.isEqual(
        'jsonata',
        _.get(formData, ['section0', 'section', 'transformationType'])
    );

    const jsonataData = _.get(formData, ['section0', 'section', 'expression']);

    const onHandleClick = async () => {
        const newData = _.get(formData, ['section0', 'section']);

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
                    type: _.get(newData, ['transformationType'], ''),
                    expr: isJsonata
                        ? _.get(newData, ['expression'], '')
                        : _.get(newData, ['transformations'], ''),
                    category: 'transform'
                },
                mode: _.get(newData, ['transformationMode'], '')
            },
            action: 'upsert'
        };

        if (isJsonata) {
            const datatype = await evaluateDataType(_.get(newData, ['expression'], ''), jsonData);

            _.set(
                obj,
                ['value', 'transformation_function', 'datatype'],
                _.get(datatype, 'data_type')
            );
        }

        array.push(obj);

        handleAddOrEdit(array);

        onClose();
    };

    const handleChange: TransformationFormProps['onChange'] = async (formData, errors) => {
        const expression = _.get(formData, ['section0', 'section', 'expression']);
        const newExtraErrors = {
            section: {
                expression: {
                    __errors: []
                }
            }
        };

        if (errors) {
            setFormErrors(errors);
        } else {
            setFormErrors([]);
        }

        if (expression) {
            try {
                await evaluateDataType(expression, jsonData);
            } catch (error) {
                const message = _.get(error, 'message');

                _.set(newExtraErrors, ['section', 'expression', '__errors', 0], message);
                setFormErrors([message]);
            }
        }
        setExtraErrors(newExtraErrors);

        setFormData(formData);
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
                    <Stack mt={-4} width="auto">
                        <TransformationForm
                            schemas={schema}
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

                    <Alert severity="info" sx={{ background: '#f1fcf9' }}>
                        {en.transformationNotSupported}
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ px: 4 }}>
                    {isJsonata && (
                        <Box mx={2}>
                            <Button onClick={handleClick} sx={{ width: 'auto' }}>
                                Try Out
                            </Button>
                        </Box>
                    )}
                    <Button
                        variant="contained"
                        autoFocus
                        onClick={onHandleClick}
                        disabled={
                            !_.isEmpty(formErrors) ||
                            _.isEmpty(formData.section0) ||
                            (isJsonata && !jsonataData)
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
