import React, { useEffect, useRef, useState } from 'react';
import * as yup from 'yup';
import en from '../../../../utils/locales/en.json';
import * as _ from 'lodash';
import { Grid } from '@mui/material';
import { Box } from '@mui/material';
import MUIForm from 'components/Form/form';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { Button } from '@mui/material';
import { inputFields } from '../../../../components/EditDataset/EditDataset';
import {
    renderFieldsOnConditionForEditDataset,
    validateFormValues
} from '../../../../services/connectorUtils';
import { useAlert } from '../../../../contexts/AlertContextProvider';

export interface RowType {
    column: string;
    originalColumn: string;
    arrival_format: string;
    data_type: string;
    key: string;
    ref: string;
    required: boolean;
    description: string;
    canExpand: boolean;
    isExpanded: boolean;
    subRows: RowType[];
    suggestions: any[];
    oneof: any[];
    isModified: boolean;
    isNewlyAdded: boolean;
    rollupType: string;
    resolved: boolean;
}

export const EditLiveDataset = (props: any) => {
    const { showAlert } = useAlert();
    const { flattenedData, setFlattenedData, datamappings } = props;
    const [formdata, setFormData] = useState<any>({});
    const inputs: Record<string, any> = inputFields(
        _.filter(flattenedData, (field) => !_.get(field, 'isDeleted')),
        _.get(formdata, 'arrivalformat'),
        _.get(formdata, 'field'),
        datamappings
    );
    const [childFormValue, setChildFormValues] = useState<any>();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const onSubmission = (value: any) => {};
    const formikRef = useRef(_.map(_.get(inputs, '[0].fields', []), () => React.createRef()));
    const [formErrors, setFormErrors] = useState<boolean>(true);
    const [formKey, setFormKey] = useState(0);

    useEffect(() => {
        setFormData((preState: Record<string, any>) => {
            return {
                ...preState,
                ...childFormValue
            };
        });
    }, [childFormValue]);

    function prependProp(input: string): string {
        let fieldpath: string;
        if (input === '$.') fieldpath = '';
        else fieldpath = input;
        const newFieldName = _.get(formdata, 'newfield', '');
        const segments: string[] = fieldpath.split('.');

        // If input is empty, return the newFieldName directly
        if (!input) {
            return `${newFieldName}`;
        }

        let result: string = segments.map((segment) => `properties.${segment}`).join('.');
        if (newFieldName) {
            result = `${newFieldName}`;
        }
        return result;
    }

    const rootField = _.get(formdata, 'field') === '$.(root)' ? '' : _.get(formdata, 'field');

    const updateNewFieldToFlattenedData = () => {
        const newFieldData: RowType = {
            column: _.get(formdata, 'newfield'),
            originalColumn: _.get(formdata, 'newfield'),
            arrival_format: _.get(formdata, 'arrivalformat'),
            data_type: _.get(formdata, 'datatype'),
            key: prependProp(rootField || ''),
            ref: prependProp(rootField || ''),
            required: false,
            description: '',
            canExpand: _.get(formdata, 'datatype') === 'object',
            isExpanded: false,
            subRows: [],
            suggestions: [],
            oneof: [],
            isModified: true,
            isNewlyAdded: true,
            rollupType: 'ignore',
            resolved: true
        };

        const addFieldToSubRows = (rows: RowType[]): RowType[] => {
            return rows.map((item: RowType): RowType => {
                if (item.column === rootField) {
                    if (item.data_type === 'object') {
                        return {
                            ...item,
                            subRows: item.subRows ? [...item.subRows, newFieldData] : [newFieldData]
                        };
                    }
                }

                if (item.subRows && item.subRows.length > 0) {
                    return {
                        ...item,
                        subRows: addFieldToSubRows(item.subRows)
                    };
                }

                return item;
            });
        };

        let updatedFlattenedData: RowType[];

        if (rootField === '') {
            updatedFlattenedData = [...flattenedData, newFieldData];
        } else {
            updatedFlattenedData = addFieldToSubRows(flattenedData);
        }

        setFlattenedData(updatedFlattenedData);
        showAlert(en.newFieldAdded, 'success');
        setFormData({});
        setFormErrors(true);
        setFormKey((prevKey) => prevKey + 1);
    };

    const validateForm = async () => {
        return validateFormValues(formikRef, formdata);
    };

    const subscribeToFormChanges = async () => {
        const isValid = await validateForm();
        setFormErrors(!isValid);
    };

    useEffect(() => {
        if (_.size(formdata) > 0) subscribeToFormChanges();
    }, [formdata]);

    const handleAddNewField = () => {
        const isDuplicateColumn = checkFieldExists(flattenedData, formdata?.newfield)
        if (isDuplicateColumn) {
            showAlert(en.columnAlreadyExists, 'error');
        }
        else {
            updateNewFieldToFlattenedData();
        }
    };

    function checkFieldExists(data: any[], newfield: string): boolean {
        for (const item of data) {
            if (item.key === newfield) {
                return true;
            }

            if (Array.isArray(item.subRows)) {
                if (checkFieldExists(item.subRows, newfield)) {
                    return true;
                }
            }
        }

        return false;
    }

    const handleClear = () => {
        setFormData({});
        setFormErrors(true);
        setFormKey((prevKey) => prevKey + 1);
    };

    const renderForm = (field: any, index: number) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fields, title } = field;
        const modifiedFormField: any = renderFieldsOnConditionForEditDataset(fields, inputs) || [];
        const validations: any = {};
        _.forEach(modifiedFormField, (formItem) => {
            const validationSchema = _.get(formItem, 'validationSchema');
            if (!validationSchema) return;
            validations[formItem.name] = validationSchema;
        });
        const validationSchemas = yup.object().shape(validations);

        return (
            <Grid item xs={12} sx={{ marginBottom: '1rem' }} key={`form-${index}`}>
                <Box sx={{ width: '100%' }}>
                    <Box sx={{ my: 1 }}>
                        <MUIForm
                            key={formKey}
                            subscribe={setChildFormValues}
                            initialValues={{}}
                            onSubmit={(value: any) => onSubmission(value)}
                            fields={modifiedFormField}
                            size={{ sm: 6, xs: 4, lg: 6 }}
                            validationSchema={validationSchemas}
                            ref={formikRef.current[index]}
                        />
                    </Box>
                </Box>
            </Grid>
        );
    };

    const renderConfigsForm = (configs: any, index: number) => {
        return (
            <Grid container key={`config-${index}`}>
                <Grid item xs={12}>
                    {_.map(_.get(configs, 'fields'), (field, fieldIndex: number) =>
                        renderForm(field, fieldIndex)
                    )}
                </Grid>
            </Grid>
        );
    };

    return (
        <Box>
            {_.map(inputs, (input, index: any) => renderConfigsForm(input, index))}
            <Grid sx={{ textAlign: 'end' }}>
                <Button
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 500, mr: 2 }}
                    onClick={() => {
                        handleClear();
                    }}
                >
                    Clear
                </Button>
                <Button
                    variant="contained"
                    size="small"
                    disabled={formErrors}
                    startIcon={<AddOutlinedIcon />}
                    sx={{ fontWeight: 500, textAlign: 'end' }}
                    onClick={handleAddNewField}
                >
                    Add new field
                </Button>
            </Grid>
        </Box>
    );
};
