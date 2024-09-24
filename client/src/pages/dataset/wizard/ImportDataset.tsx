import { Button, Grid, TextField, Typography, Box, Dialog } from '@mui/material';
import * as yup from 'yup';
import * as _ from 'lodash';
import AnimateButton from 'components/@extended/AnimateButton';
import { useDispatch, useSelector } from 'react-redux';
import { reset } from 'store/reducers/wizard';
import { IWizard } from 'types/formWizard';

import UploadFiles from './UploadFiles';
import React, { useEffect, useRef, useState } from 'react';
import { error, success } from 'services/toaster';
import { useFormik } from 'formik';
import { generateSlug } from 'utils/stringUtils';
import HtmlTooltip from 'components/HtmlTooltip';
import { importDataset, searchDatasets } from 'services/dataset';
import FilesPreview from 'components/third-party/dropzone/FilesPreview';
import { CardTitle, GenericCard } from 'components/styled/Cards';
import interactIds from 'data/telemetry/interact.json';
import RejectionFiles from 'components/third-party/dropzone/RejectionFiles';
import { hasSpecialCharacters, readJsonFileContents, validateFormValues } from 'services/utils';
import Loader from 'components/Loader';
import BackdropLoader from 'components/BackdropLoader';
import en from 'utils/locales/en.json';
import { DatasetStatus } from 'types/datasets';
import { useNavigate } from 'react-router';
import ImportDailog from './components/transformationDialogs/ImportDailog';

export const pageMeta = { pageId: 'datasetConfiguration' };
export const datasourceMeta = { pageId: 'dataSource' }
export const s3Urls = { pageId: 'cloudFiles' };

const ImportDataset = ({ setShowWizard, datasetType, generateInteractTelemetry }: any) => {
    const dispatch = useDispatch();
    const wizardState: IWizard = useSelector((state: any) => state?.wizard);
    const maxFileSizeConfig: Number = useSelector((state: any) => state?.config?.maxFileSize || 5242880);
    const pageData = _.get(wizardState, ['pages', pageMeta.pageId]);
    const { data: dataState, files: filesState, config: configState } = pageData?.state || {};
    const [data, setData] = useState(dataState);
    const [files, setFiles] = useState(filesState);
    const [openDailog, setOpenDailog] = useState(false)
    const [checkvalidation, setCheckValidation] = useState(false)
    const [loading, setLoading] = useState(false);
    const datasetId = _.get(data, [0, "api_version"]) === "v2" ? _.get(data, [0, 'dataset_id']) : _.get(data, '[0].data.metadata.dataset_id')
    const datasetName = _.get(data, [0, "api_version"]) === "v2" ? _.get(data, [0, 'name']) : _.get(data, '[0].data.metadata.dataset_id')
    const initialValues = _.get(pageData, ["state", "config"]) || { name: datasetName || "", dataset_id: datasetId || "" };
    const [fileErrors, setFileErrors] = useState<any>(null);
    const [value, subscribe] = useState({});
    const [formError, setFormError] = useState<boolean>(true);
    const [datasetIds, setDatasetIds] = useState<any>([])
    const validationLimitConfig = useSelector((state: any) => state?.config?.validationLimit || {});
    const formikRef = useRef<any>();
    const navigate = useNavigate();

    const validationSchema: any = (validationLimitConfig: Record<string, any>) => checkvalidation && yup.object().shape({
        name: yup
            .string()
            .required('Dataset Name is required')
            .min(_.get(validationLimitConfig, 'datasetMinLen'))
            .max(_.get(validationLimitConfig, 'datasetMaxLen'))
            .trim(en.whiteSpaceConflict).strict(true)
            .test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value)),
        dataset_id: yup
            .string()
            .required('Dataset ID is Required')
            .min(_.get(validationLimitConfig, 'datasetIdMinLen'))
            .max(_.get(validationLimitConfig, 'datasetIdMaxLen'))
            .trim(en.whiteSpaceConflict).strict(true)
            .test('checkDuplID', 'ID is already taken', async (value: any) => new Promise((resolve) => {
                if (_.includes(datasetIds, value)) {
                    resolve(false)
                }
                resolve(true)
            }))
            .test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
    });

    const datasetList = async () => {
        try {
            const result = await searchDatasets({ data: {} })
            const datasets = _.get(result, ["data", "result", "data"])
            if (_.size(datasets)) {
                const datasetId = _.map(datasets, list => _.get(list, "dataset_id"))
                setDatasetIds(datasetId)
            }
        } catch (error) {
            setDatasetIds([])
        }
    }

    useEffect(() => {
        datasetList()
    }, [])

    useEffect(() => {
        if (data) {
            form.setFieldValue("name", datasetName)
            form.setFieldValue("dataset_id", datasetId)
        }
    }, [checkvalidation])

    const onSubmit = async (config: any) => {
        setLoading(true);
        if ((data || files) && config) {
            setLoading(true)
            try {
                const overwrite = _.get(config, "importType") === "overwrite" ? true : false
                await importDataset(data[0], config, overwrite);
                navigate(`/datasets?status=${DatasetStatus.Draft}`);
                dispatch(success({ message: `Dataset imported successfully` }));
            } catch (err) {
                const errStatus = _.get(err, ["response", "status"]);
                const errCode = _.get(err, ["response", "data", "error", "code"])
                if (errStatus === 409 && errCode == "DATASET_EXISTS") {
                    setOpenDailog(true)
                    setCheckValidation(true)
                }
                else {
                    dispatch(error({ message: "Failed to import dataset" }));
                }
            } finally {
                setLoading(false)
            }
        } else {
            dispatch(error({ message: 'Please fill the required fields' }));
        }
        setLoading(false);
    };

    const form = useFormik({ initialValues: configState || initialValues, validationSchema: validationSchema(validationLimitConfig), onSubmit, enableReinitialize: true });
    const formRef = useRef(form);
    if (formikRef) { formikRef.current = formRef.current; }

    const handleNameChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        fieldUpdate: (field: string, value: any, shouldValidate?: boolean | undefined) => void,
        slugName: string,
        fieldName: string
    ) => {
        fieldUpdate(fieldName, e.target.value);
        fieldUpdate(slugName, generateSlug(e.target.value));
    };

    const resetState = () => {
        dispatch(reset({ omit: ['datasetConfiguration'] }));
    };

    const flattenContents = (content: Record<string, any> | any) => {
        const flattenedData = _.filter(_.flattenDeep(content), (field: any) => !_.isEmpty(field));
        return flattenedData;
    }

    const onFileRemove = async (file: File | string) => {
        const filteredItems = files && files.filter((_file: any) => _file !== file);
        const contents = await Promise.all(filteredItems.map((file: File) => readJsonFileContents(file)));
        const flattenedContents = flattenContents(contents);
        if (_.size(flattenedContents) === 0) {
            setFiles(filteredItems);
            setData(flattenedContents);
            if (!_.isEmpty(filteredItems)) dispatch(error({ message: 'Invalid file contents' }));
        } else {
            setFiles(filteredItems);
            setData(flattenedContents);
        }
    };

    useEffect(() => {
        if (value !== form.values)
            subscribe(form.values)
    }, [form.values])

    const onRemoveAll = () => {
        generateInteractTelemetry({ edata: { id: interactIds.file_remove_multiple } });
        setFiles(null);
        setData([]);
        resetState();
    };

    const validateForm = async () => {
        return validateFormValues(formikRef, value)
    }

    const subscribeToFormChanges = async () => {
        const isValid = await validateForm();
        setFormError(!isValid)
    }

    useEffect(() => {
        if (!_.isEmpty(data)) subscribeToFormChanges();
    }, [value, data]);

    const importDialog = () => {
        return React.cloneElement(<ImportDailog />, { setFiles,setOpenDailog, setCheckValidation, form, handleNameChange, onSubmit, subscribeToFormChanges });
    }

    return (
        <>
            {loading && <Loader />}
            <BackdropLoader open={loading} />
            <Grid container spacing={1}>
                <Grid item xs={12} sm={12}>
                    <form onSubmit={form.handleSubmit}>
                        <GenericCard elevation={1}>
                            <CardTitle>Basic Details</CardTitle>
                            <Grid container spacing={3} justifyContent="center" alignItems="baseline" display="flex">
                                <Grid item xs={12} sm={6} lg={6}>
                                    <HtmlTooltip title="Name of the dataset" arrow placement="top-start">
                                        <TextField
                                            name={'name'}
                                            label={'Dataset Name'}
                                            onBlur={form.handleBlur}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                handleNameChange(e, form.setFieldValue, 'dataset_id', 'name')
                                            }
                                            required
                                            value={_.get(form.values, "name") || ''}
                                            variant="outlined"
                                            fullWidth
                                            error={checkvalidation ? Boolean(form.errors["name"]) : false}
                                            helperText={form.touched["name"] && form.errors["name"] && checkvalidation && String(form.errors["name"])}
                                        />
                                    </HtmlTooltip>
                                </Grid>
                                <Grid item xs={12} sm={6} lg={6}>
                                    <HtmlTooltip title="ID for the dataset - for querying" arrow placement="top-start">
                                        <TextField
                                            name={'dataset_id'}
                                            label={'Dataset ID'}
                                            onBlur={form.handleBlur}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.handleChange(e)}
                                            required
                                            value={_.get(form.values, "dataset_id") || ''}
                                            variant="outlined"
                                            fullWidth
                                            error={checkvalidation ? Boolean(form.errors["dataset_id"]) : false}
                                            helperText={form.touched["dataset_id"] && form.errors["dataset_id"] && checkvalidation && String(form.errors["dataset_id"])}
                                        />
                                    </HtmlTooltip>
                                </Grid>
                            </Grid>
                        </GenericCard>
                        <GenericCard elevation={1}>
                            <CardTitle>Import Dataset</CardTitle>
                            <Grid container spacing={3} justifyContent="center" alignItems="center">
                                <Grid item xs={12}>
                                    <UploadFiles
                                        generateInteractTelemetry={generateInteractTelemetry}
                                        data={data}
                                        setData={setData}
                                        files={files}
                                        setFiles={setFiles}
                                        maxFileSize={maxFileSizeConfig}
                                        datasetImport={true}
                                        allowSchema
                                        subscribeErrors={setFileErrors}
                                        isMultiple={false}
                                        setNewFile={setCheckValidation}
                                    />
                                </Grid>
                            </Grid>
                        </GenericCard>
                        {files && _.size(files) > 0 && (
                            <GenericCard elevation={1}>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="h5" gutterBottom>
                                        Files Uploaded
                                    </Typography>
                                    <Button onClick={onRemoveAll}>Remove all</Button>
                                </Box>
                                <FilesPreview files={files} showList={false} onRemove={onFileRemove} />
                            </GenericCard>
                        )}
                        {fileErrors?.length > 0 && <RejectionFiles fileRejections={fileErrors} />}
                        <Box display="flex" justifyContent="flex-end">
                            <AnimateButton>
                                <Button
                                    onClick={(_) => generateInteractTelemetry({ edata: { id: interactIds.create_dataset } })}
                                    disabled={loading || form.isSubmitting || _.isEmpty(data) || (checkvalidation && formError)}
                                    variant="contained"
                                    sx={{ my: 2, ml: 1 }}
                                    type="submit"
                                >
                                    Proceed
                                </Button>
                            </AnimateButton>
                        </Box>
                    </form>
                    <Dialog maxWidth={'sm'} fullWidth={true} open={openDailog} onClose={_ => setOpenDailog(false)}>
                        {importDialog()}
                    </Dialog>
                </Grid>
            </Grid>
        </>
    );
};

export default ImportDataset;