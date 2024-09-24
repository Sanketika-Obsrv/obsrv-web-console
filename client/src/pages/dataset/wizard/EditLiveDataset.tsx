import React, { useEffect, useRef, useState } from 'react'
import * as yup from "yup";
import en from 'utils/locales/en.json'
import * as _ from "lodash"
import { Alert, Grid } from '@mui/material';
import { Box } from '@mui/material';
import { Typography } from '@mui/material';
import MUIForm from 'components/form';
import { PlusOutlined } from '@ant-design/icons';
import { Button } from '@mui/material';
import { inputFields } from "data/wizard/editLiveDataset";
import { validateFormValues } from "../Connector/services/utils";
import { renderFeildsOnConditionForEditDataset } from '../Connector/services/utils';
import { dispatch } from 'store';
import { error, success } from 'services/toaster';
import { useSelector } from 'react-redux';
import { IWizard } from 'types/formWizard';
import Skeleton from 'components/Skeleton';

export const EditLiveDataset = (props: any) => {
    const wizardState: IWizard = useSelector((state: any) => state?.wizard);
    const { flattenedData, setFlattenedData } = props;
    const [formdata, setFormData] = useState<any>();
    const datamappings: any = _.get(wizardState, 'pages.jsonSchema.dataMappings', {})
    const inputs: Record<string, any> = inputFields(_.filter(flattenedData, field => !_.get(field, "isDeleted")), _.get(formdata, 'arrivalformat'), _.get(formdata, 'field'), datamappings);
    const [childFormValue, setChildFormValues] = useState<any>();
    const onSubmission = (value: any) => { }
    const formikRef = useRef(_.map(_.get(inputs, '[0].fields', []), () => React.createRef()))
    const [formErrors, setFormErrors] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        setFormData((preState: Record<string, any>) => {
            return {
                ...preState,
                ...childFormValue
            }
        })
    }, [childFormValue])

    function prependProp(input: string): string {
        let fieldpath: string;
        if (input === '$.') fieldpath = ''
        else fieldpath = input
        const newFieldName = _.get(formdata, 'newfield', '');
        const segments: string[] = fieldpath.split('.');

        // If input is empty, return the newFieldName directly
        if (!input) {
            return `properties.${newFieldName}`;
        }

        let result: string = segments.map(segment => `properties.${segment}`).join('.');
        if (newFieldName) {
            result += `.properties.${newFieldName}`;
        }
        return result;
    }

    const datamappingBasedOnArrivalFormat = (arrivalformat: any) => {
        const matchingKey = Object.keys(datamappings).find(key => key === arrivalformat);

        if (matchingKey) {
            const arrivalFormat = datamappings[matchingKey].arrival_format;
            return arrivalFormat ? arrivalFormat[0] : "";
        }
    };

    const rootField = _.get(formdata, 'field') === '$.(root)' ? '' : _.get(formdata, 'field')

    const updateNewFieldToFlattenedData = () => {
        const setFlattenedDataWithNewColumn = {
            arrival_format: _.get(formdata, 'arrivalformat'),
            column: rootField ? `${rootField}.${_.get(formdata, 'newfield')}` : _.get(formdata, 'newfield'),
            data_type: _.get(formdata, 'datatype'),
            key: prependProp(rootField || ""),
            ref: prependProp(rootField || ""),
            required: false,
            type: datamappingBasedOnArrivalFormat(_.get(formdata, 'arrivalformat')),
            isModified: true,
            isNewlyAdded: true,
            rollupType: "ignore",
        }
        const updatedFlattenedData = _.concat(flattenedData, [setFlattenedDataWithNewColumn])
        setFlattenedData(updatedFlattenedData);
        dispatch(success({ message: en.newFieldAdded }));
        setFormData({})
        setTimeout(() => {
            setFormErrors(true)
            setLoading(false)
        }, 200)
    }

    const validateForm = async () => {
        return validateFormValues(formikRef, formdata)
    }

    const subscribeToFormChanges = async () => {
        const isValid = await validateForm();
        setFormErrors(!isValid)
    }

    useEffect(() => {
        if (_.size(formdata) > 0) subscribeToFormChanges();
    }, [formdata])

    const handleAddNewField = () => {
        let isDuplicate: boolean = flattenedData.some((item: any) => item.column === _.get(formdata, 'newfield'))
        if (isDuplicate) {
            dispatch(error({ message: en.columnAlreadyExists }));
        }
        else {
            setLoading(true)
            updateNewFieldToFlattenedData()
        }
    }

    const handleClear = () => {
        setLoading(true)
        setFormData({})
        setFormErrors(true)
        setTimeout(() => { setLoading(false) }, 200)
    }

    const renderForm = (field: any, index: number) => {
        const { fields, title } = field;
        const modifiedFormField: any = renderFeildsOnConditionForEditDataset(fields, inputs) || [];
        const validations: any = {};
        _.forEach(modifiedFormField, formItem => {
            const validationSchema = _.get(formItem, 'validationSchema')
            if (!validationSchema) return;
            validations[formItem.name] = validationSchema
        });
        const validationSchemas = yup.object().shape(validations);

        return <Grid item xs={12} sx={{ marginBottom: "1rem" }}>
            <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
                <Box>
                    <Typography variant="body1" fontWeight={500}>{title}{' : '}</Typography>
                </Box>
                <Box sx={{ my: 1 }}>
                    {loading ? <Skeleton type="table" /> :
                        <MUIForm
                            subscribe={setChildFormValues}
                            initialValues={{}}
                            onSubmit={(value: any) => onSubmission(value)}
                            fields={modifiedFormField}
                            size={{ sm: 4, xs: 4, lg: 6 }}
                            validationSchema={validationSchemas}
                            ref={formikRef.current[index]}
                        />}
                </Box>
            </Box>
        </Grid>
    }

    const renderConfigsForm = (configs: any) => {
        return <Grid container>
            <Grid item xs={12}>{_.map(_.get(configs, 'fields'), renderForm)}</Grid>
        </Grid>
    }

    return (
        <Box>
            {_.map(inputs, renderConfigsForm)}
            <Grid sx={{ textAlign: "end" }}>
                <Button size="medium" sx={{ fontWeight: 500, mt: 2, textAlign: "end" }} onClick={() => {
                    handleClear()
                }}>
                    Clear
                </Button>
                <Button variant='contained' size="medium" disabled={formErrors} startIcon={<PlusOutlined />} sx={{ fontWeight: 500, mt: 2, textAlign: "end" }} onClick={handleAddNewField}>
                    Add new field
                </Button>
            </Grid>
        </Box>
    )
}
