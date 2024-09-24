import { Button, Grid, TextField, Typography, Box } from '@mui/material';
import * as yup from 'yup';
import * as _ from 'lodash';
import AnimateButton from 'components/@extended/AnimateButton';
import { useDispatch, useSelector } from 'react-redux';
import { addState, reset, restore, setMetadata, updateState } from 'store/reducers/wizard';
import { IWizard } from 'types/formWizard';
import UploadFiles from './UploadFiles';
import { useEffect, useRef, useState } from 'react';
import { error } from 'services/toaster';
import { useFormik } from 'formik';
import { generateSlug } from 'utils/stringUtils';
import HtmlTooltip from 'components/HtmlTooltip';
import { getUploadUrls, uploadToUrl, createDraftDataset, saveDatasetIntermediateState, searchDatasets, getDatasetState } from 'services/dataset';
import { fetchJsonSchema } from 'services/json-schema';
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

export const pageMeta = { pageId: 'sample_data' };
export const s3Urls = { pageId: 'cloudFiles' };

const DatasetConfiguration = ({ setShowWizard, datasetType, generateInteractTelemetry }: any) => {
    const dispatch = useDispatch();
    const wizardState: IWizard = useSelector((state: any) => state?.wizard);
    const maxFileSizeConfig: Number = useSelector((state: any) => state?.config?.maxFileSize || 5242880);
    const pageData = _.get(wizardState, ['pages', pageMeta.pageId]);
    const { data: dataState, files: filesState, config: configState } = pageData?.state || {};
    const [data, setData] = useState(dataState);
    const [files, setFiles] = useState(filesState);
    const [loading, setLoading] = useState(false);
    const initialValues = pageData?.state?.config || { name: '', dataset_id: '' };
    const [fileErrors, setFileErrors] = useState<any>(null);
    const [value, subscribe] = useState({});
    const [formError, setFormError] = useState<boolean>(true);
    const [datasetIds, setDatasetIds] = useState<any>([])
    const validationLimitConfig = useSelector((state: any) => state?.config?.validationLimit || {});
    const formikRef = useRef<any>();
    const navigate = useNavigate();

    const validationSchema: any = (validationLimitConfig: Record<string, any>) => yup.object().shape({
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
            .test('checkDuplID', 'ID is already taken', (value: any) => new Promise((resolve) => {
                if (_.includes(datasetIds, value)) {
                    resolve(false)
                }
                resolve(true)
            }))
            .test('specialChars', en.hasSpecialCharacters, value => !hasSpecialCharacters(value))
    });

    const generateJSONSchema = async (data: Array<any>, config: Record<string, any>) => {
        const dataset = _.get(config, 'name');
        const payload = Array.isArray(data) ? data : [data];
        try {
            const response = await fetchJsonSchema({ data: payload, config: { dataset } });
            dispatch(addState({ id: 'jsonSchema', ...response }));
            return response;
        } catch (err) {
            dispatch(error({ message: 'Failed to Upload Data' }));
            throw err;
        }
    };

    const createDraft = async (config: Record<string, any>, schema: Record<string, any>) => {
        try {
            const payload = { ...config, data_schema: schema, type: datasetType };
            const data = await createDraftDataset({ data: payload });
            const dataset_id = _.get(data, 'data.result.id');
            await fetchDatasetDetails(dataset_id)
            return data;
        } catch (err: any) {
            throw err;
        }
    };

    const restoreClientState = (restoreData: any) => {
        const dataset_id = _.get(restoreData, 'pages.datasetConfiguration.state.config.dataset_id')
        const activeWizardPage: any = sessionStorage.getItem(`${dataset_id}_activePage` || "")
        _.set(restoreData, `metadata.${dataset_id}_activePage`, parseInt(activeWizardPage))
        dispatch(restore(restoreData));
    }

    const fetchDatasetDetails = async (datasetId: string) => {
        try {
            const datasetState = await getDatasetState(datasetId!, DatasetStatus.Draft);
            restoreClientState(datasetState);
        } catch (err) {
            dispatch(error({ message: 'Dataset does not exists' }));
            navigate('/');
        } finally {
            setLoading(false)
        }
    }

    const uploadFiles = async (files: any) => {
        try {
            const uploadUrl = await getUploadUrls(files);
            if (uploadUrl.data && uploadUrl.data?.result) {
                await Promise.all(_.map(_.get(uploadUrl, 'data.result'), (item, index) => uploadToUrl(item.preSignedUrl, files[index]).catch(console.log)))
            }
        } catch (err) {
            // throw err;
        }
    };

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

    const onSubmit = async (config: any) => {
        setLoading(true);
        if ((data || files) && config) {
            setLoading(true)
            try {
                if (files) { await uploadFiles(files); }
                const jsonSchema: any = await generateJSONSchema(data, config);
                dispatch(addState({ id: pageMeta.pageId, state: { files, data, config, datasetType } }));
                await createDraft(config, _.get(jsonSchema, 'schema'));
                let mergedEvent = {}
                _.map(data, (item: any) => {
                    mergedEvent = _.merge(mergedEvent, item)
                });
                dispatch(updateState({ id: pageMeta.pageId, ...mergedEvent }));
                saveDatasetIntermediateState({});
                setShowWizard(true);
            } catch (err) {
                dispatch(error({ message: "Failed to upload schema" }));
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
        setData(null);
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
                                            error={Boolean(form.errors["name"])}
                                            helperText={form.touched["name"] && form.errors["name"] && String(form.errors["name"])}
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
                                            value={_.get(form.values, "dataset_id")}
                                            variant="outlined"
                                            fullWidth
                                            error={Boolean(form.errors["dataset_id"])}
                                            helperText={form.touched["dataset_id"] && form.errors["dataset_id"] && String(form.errors["dataset_id"])}
                                        />
                                    </HtmlTooltip>
                                </Grid>
                            </Grid>
                        </GenericCard>
                        <GenericCard elevation={1}>
                            <CardTitle>Upload Data/Schema</CardTitle>
                            <Grid container spacing={3} justifyContent="center" alignItems="center">
                                <Grid item xs={12}>
                                    <UploadFiles
                                        generateInteractTelemetry={generateInteractTelemetry}
                                        data={data}
                                        setData={setData}
                                        files={files}
                                        setFiles={setFiles}
                                        maxFileSize={maxFileSizeConfig}
                                        allowSchema
                                        subscribeErrors={setFileErrors}
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
                                    disabled={loading || form.isSubmitting || _.isEmpty(data) || formError}
                                    variant="contained"
                                    sx={{ my: 2, ml: 1 }}
                                    type="submit"
                                >
                                    Create Schema
                                </Button>
                            </AnimateButton>
                        </Box>
                    </form>
                </Grid>
            </Grid>
        </>
    );
};

export default DatasetConfiguration;
