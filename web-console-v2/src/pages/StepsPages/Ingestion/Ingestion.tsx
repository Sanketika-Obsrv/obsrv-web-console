import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, Typography } from '@mui/material';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { styled } from '@mui/material';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { useFormik } from 'formik';
import _ from 'lodash';
import { useNavigate } from 'react-router-dom';
import { theme } from 'theme';
import { useAlert } from 'contexts/AlertContextProvider';
import Actions from 'components/ActionButtons/Actions';
import FilesPreview from 'components/Dropzone/FilesPreview';
import InjestionForm from 'components/Form/DynamicForm';
import HelpSection from 'components/HelpSection/HelpSection';
import Loader from 'components/Loader';
import Retry from 'components/Retry/Retry';
import styles from 'pages/ConnectorConfiguration/ConnectorConfiguration.module.css';
import UploadFiles from 'pages/Dataset/wizard/UploadFiles';
import {
    useFetchDatasetsById,
    useUploadUrls,
    useUploadToUrl,
    useCreateDataset,
    useGenerateJsonSchema,
    useUpdateDataset,
    useReadUploadedFiles
} from 'services/dataset';
import { readJsonFileContents } from 'services/utils';
import schemas from './Schema';
import ingestionStyle from './Ingestion.module.css';
import helpSectionData from './HelpSectionData.json';
import { getConfigValue } from 'services/configData';
import axios from 'axios';

interface FormData {
    [key: string]: unknown;
}

interface Schema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

interface ConfigureConnectorFormProps {
    schemas: Schema[];
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

const GenericCard = styled(Card)(({ theme }) => ({
    outline: 'none',
    boxShadow: 'none',
    margin: theme.spacing(0, 6, 2, 2)
}));

const MAX_FILES = 10;

const Ingestion = () => {
    const { showAlert } = useAlert();

    const navigate = useNavigate();
    const initialConfigDetails = JSON.parse(sessionStorage.getItem('configDetails') || '{}');

    const datasetId = getConfigValue('dataset_id') || '';
    const datasetName = getConfigValue('name') || '';
    const versionKey = getConfigValue('version_key') || '';

    const [formData, setFormData] = useState<FormData>({
        section0: {
            section1: {
                datasetName: datasetName,
                datasetId: datasetId
            }
        }
    });

    const [formErrors, setFormErrors] = useState<unknown[]>([]);

    const [extraErrors, setExtraErrors] = useState<any>({});

    const [isHelpSectionOpen, setIsHelpSectionOpen] = useState(false);

    const formikRef = useRef<any>();

    const datasetIdRef = useRef<string>('');

    const { data: dataState, files: filesState, config: configState } = {} as any;

    const [data, setData] = useState(dataState);

    const [files, setFiles] = useState(filesState);

    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

    const datasetIdtoFetch = datasetId ? datasetId : datasetIdRef.current;

    const connectorConfigData = sessionStorage.getItem('connectorConfigDetails');

    const ConnectorConfiguration = connectorConfigData ? JSON.parse(connectorConfigData) : null;

    const {
        data: uploadData,
        isPending: isUploadLoading,
        isError: isErrorUpload,
        mutate: uploadFilesMutate
    } = useUploadUrls();

    const [filenames, setFilenames] = useState([]);
    const readUploadedFiles = useReadUploadedFiles({ filenames });

    const {
        isError: isErrorUrl,
        isPending: isUrlLoading,
        mutate: uploadToUrlMutate
    } = useUploadToUrl();

    const {
        data: createData,
        isPending: isCreateLoading,
        isError: isErrorCreateDataset,
        mutate: createDatasetMutate
    } = useCreateDataset();

    const {
        data: generateData,
        isError: isErrorGenerate,
        mutateAsync: generateJsonSchemaMutate,
        isPending: isGenerateLoading
    } = useGenerateJsonSchema();

    const { data: fetchData, refetch } = useFetchDatasetsById({
        datasetId: datasetIdtoFetch,
        queryParams: 'status=Draft&mode=edit&fields=dataset_config'
    });

    const {
        data: updateDatasetData,
        mutate: updateDatasetMutate,
        isPending: isUpdateLoading,
        isError: isErrorUpdate
    } = useUpdateDataset();

    const generateDatasetId = (datasetName: string) =>
        datasetName.toLowerCase().replace(/\s+/g, '-');

    const extractValidJsonFromMultipart = (multipartData: string): string => {
        const boundaryPattern = /------WebKitFormBoundary[\s\S]*?\r?\n\r?\n/;
        const endBoundaryPattern = /------WebKitFormBoundary[\s\S]*?--\r?\n?$/;
        const parts = multipartData.split(boundaryPattern);
        let jsonPart = parts.pop();
        if (jsonPart) {
            jsonPart = jsonPart.replace(endBoundaryPattern, '').trim();
        }
        return jsonPart || '';
    };

    const readFilesFromSignedURL = async (signedUrl: string) => {
        try {
            const response = await axios.get(signedUrl, {
                responseType: 'text' // Get the response as text since it's multipart data
            });
            const fileContent = extractValidJsonFromMultipart(response.data);
            return JSON.parse(fileContent);
        } catch (error) {
            console.error('Error reading file from signed URL:', error);
            throw error;
        }
    };

    const flattenContents = (content: Record<string, any> | any) =>
        _.filter(_.flattenDeep(content), (field: any) => !_.isEmpty(field));

    useEffect(() => {
        if (datasetId !== '' && fetchData) {
            refetch();
            const filePathList = fetchData.dataset_config?.file_upload_path;

            if (filePathList) {
                const filesList = filePathList.map((filePath: string) => {
                    if (!filePath) return null;
                    const fileNameWithExtension = filePath.split('/').pop();
                    return fileNameWithExtension || null;
                });
                setFilenames(filesList.filter(Boolean));
            }
        }
    }, [datasetId, fetchData]);

    useEffect(() => {
        if (filenames.length > 0 && Array.isArray(readUploadedFiles.data)) {
            const filePromises = readUploadedFiles.data?.map(
                async (item: { fileName: string; filePath: string; preSignedUrl: string }) => {
                    const fileBlob = await readFilesFromSignedURL(item.preSignedUrl);
                    const stripName = item.fileName.split(/_(?=[^_]+$)/);
                    const fileName = stripName[0] + '.json';
                    const file = new File([JSON.stringify(fileBlob)], fileName, {
                        type: 'application/json'
                    });
                    (file as any).preview = URL.createObjectURL(file);
                    (file as any).path = fileName;
                    return file;
                }
            );

            Promise.all(filePromises)
                .then(async (resolvedFiles) => {
                    const contents = await Promise.all(
                        resolvedFiles.map((file: File) => readJsonFileContents(file))
                    );
                    const flattenedContents = flattenContents(contents);
                    setData(flattenedContents);
                    setFiles(resolvedFiles);
                })
                .catch((error) => {
                    console.error('Error fetching files:', error);
                });

            // Cleanup function
            return () => {
                files?.forEach((fileObj: any) => {
                    URL.revokeObjectURL((fileObj as any).preview);
                });
                setFiles([]);
            };
        }
    }, [filenames, readUploadedFiles.data]);

    const fetchDataset = _.debounce(async (datasetId) => {
        try {
            const newExtraErrors = {
                section1: {
                    datasetName: {
                        __errors: []
                    }
                }
            };

            const response = await refetch();

            if (response.isSuccess) {
                const message = 'DatasetId is already taken';

                _.set(newExtraErrors, ['section1', 'datasetName', '__errors', 0], message);

                setExtraErrors(newExtraErrors);

                setFormErrors([message]);
            } else {
                setExtraErrors(newExtraErrors);

                setFormErrors([]);
            }
        } catch {
            showAlert('Error fetching dataset:', 'error');
        }
    }, 3000);
    useEffect(() => {
        const datasetName = _.get(formData, ['section0', 'section1', 'datasetName']) as
            | string
            | undefined;
        const generatedId = datasetName ? generateDatasetId(datasetName) : '';
        if (datasetId === '') {
            if (_.get(formData, ['section0', 'section1', 'datasetId']) !== generatedId) {
                const updatedFormData = _.set(
                    _.cloneDeep(formData),
                    ['section0', 'section1', 'datasetId'],
                    generatedId
                );
                setFormData(updatedFormData);
                datasetIdRef.current = generatedId;
                fetchDataset(generatedId);
            }
        }
    }, [formData, fetchDataset]);

    const handleDatasetNameClick = (id: string) => setHighlightedSection(id);

    const handleChange: ConfigureConnectorFormProps['onChange'] = (newFormData, errors) => {
        setFormData(newFormData);

        if (errors) {
            setFormErrors(errors);
        } else {
            setFormErrors([]);
        }

        if (newFormData) handleDatasetNameClick('section1');
    };

    const onFileRemove = async (file: File | string) => {
        const filteredItems = !_.isEmpty(files)
            ? _.filter(files, (_file: string) => _file !== file)
            : [];

        const contents = await Promise.all(
            _.map(filteredItems, (file: File) => readJsonFileContents(file))
        );

        const flattenedContents = flattenContents(contents);

        if (_.size(flattenedContents) === 0) {
            setFiles(filteredItems);

            setData(flattenedContents);

            if (!_.isEmpty(filteredItems)) showAlert('Invalid file contents', 'error');
        } else {
            setFiles(filteredItems);

            setData(flattenedContents);
        }
    };

    useEffect(() => {
        if (!_.isEmpty(uploadData)) {
            Promise.all(
                _.map(uploadData, (item, index) =>
                    uploadToUrlMutate({ url: _.get(item, 'preSignedUrl'), file: files[index] })
                )
            );

            const dataset = _.get(formData, ['section0', 'section1', 'datasetName']);

            const payload = _.isArray(data) ? data : [data];

            generateJsonSchemaMutate({
                _data: {},
                payload: { data: payload, config: { dataset } }
            });
        }
    }, [uploadData, uploadToUrlMutate, files, formData, data, generateJsonSchemaMutate]);

    useEffect(() => {
        if (!_.isEmpty(uploadData) && generateData) {
            const { schema } = generateData;
            const filePaths = _.map(uploadData, 'filePath');
            if (!datasetId) {
                const config = {
                    name: _.get(formData, ['section0', 'section1', 'datasetName']),
                    dataset_id: _.get(formData, ['section0', 'section1', 'datasetId']),
                    dataset_config: {
                        keys_config: {},
                        indexing_config: {},
                        file_upload_path: filePaths
                    },
                    data_schema: schema,
                    type: 'event'
                };
                createDatasetMutate({ payload: config });
            } else {
                updateDatasetMutate({
                    data: {
                        dataset_config: {
                            keys_config: (fetchData && fetchData.dataset_config?.keys_config) || {},
                            indexing_config:
                                (fetchData && fetchData.dataset_config?.indexing_config) || {},
                            file_upload_path: filePaths
                        },
                        data_schema: schema
                    }
                });
            }
        }
    }, [uploadData, generateData, formData, createDatasetMutate]);

    useEffect(() => {
        if (createData) {
            let mergedEvent = {};
            if (data) {
                _.map(data, (item: any) => {
                    mergedEvent = _.merge(mergedEvent, item);
                });
            }

            let updatedConnectorsConfig = [];
            if (
                ConnectorConfiguration !== null &&
                Array.isArray(ConnectorConfiguration.connectors_config)
            ) {
                updatedConnectorsConfig = ConnectorConfiguration.connectors_config.map(
                    (config: { value: any }) => ({
                        ...config,
                        value: {
                            ...config.value,
                            version: 'v2'
                        }
                    })
                );
            }

            updateDatasetMutate({
                data: {
                    sample_data: { mergedEvent },
                    connectors_config: updatedConnectorsConfig
                }
            });
        }
    }, [createData, data, updateDatasetMutate]);

    const handleNavigate = () => {
        navigate(-1);
    };

    useEffect(() => {
        if (updateDatasetData) navigate(`/home/ingestion/schema-details/${datasetId}`);
    }, [updateDatasetData, navigate]);

    const onSubmit = () => {
        initialConfigDetails.name = _.get(formData, ['section0', 'section1', 'datasetName']);
        sessionStorage.setItem('configDetails', JSON.stringify(initialConfigDetails));

        if (!_.isEmpty(files) && _.size(files) > MAX_FILES) {
            showAlert('Pre-signed URL generation failed: limit exceeded', 'error');
            return;
        }
        if (data || !_.isEmpty(files)) {
            try {
                if (!_.isEmpty(files)) uploadFilesMutate({ files });
            } catch {
                showAlert('Failed to upload schema', 'error');
            }
        } else {
            showAlert('Please fill the required fields', 'error');
        }
    };

    const forms = useFormik({
        initialValues: configState,
        onSubmit,
        enableReinitialize: true
    });

    const formRef = useRef(forms);

    if (formikRef) formikRef.current = formRef.current;

    const onRemoveAll = () => {
        setFiles(null);

        setData(null);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Loader
                loading={
                    isUploadLoading ||
                    isUrlLoading ||
                    isCreateLoading ||
                    isGenerateLoading ||
                    isUpdateLoading
                }
                descriptionText="Loading the page"
            />

            {!(
                isUploadLoading ||
                isUrlLoading ||
                isCreateLoading ||
                isGenerateLoading ||
                isUpdateLoading
            ) && (
                    (isErrorUpload ||
                        isErrorUrl ||
                        isErrorCreateDataset ||
                        isErrorGenerate ||
                        isErrorUpdate) ? (
                        <Retry
                            buttonLabel="Retry"
                            onButtonClick={() => navigate(0)}
                            description="Something went wrong."
                        />
                    ) : (
                        <>
                            <Box
                                sx={{
                                    flex: 1, 
                                    overflowY: 'auto',
                                    paddingBottom: '80px',
                                }}
                            >
                                <Box mx={4}>
                                    <Button
                                        variant="text"
                                        sx={{ color: theme.palette.common.black, mt: 2 }}
                                        startIcon={
                                            <KeyboardBackspaceIcon className={ingestionStyle.iconStyle} />
                                        }
                                        onClick={handleNavigate}
                                    >
                                        Back
                                    </Button>
                                </Box>
                                <Box>
                                    <Box
                                        px={3}
                                        className={`${styles.formContainer} ${ingestionStyle.container} ${isHelpSectionOpen ? styles.expanded : styles.collapsed}`}
                                    >
                                        <Box onClick={() => handleDatasetNameClick('section1')}>
                                            <InjestionForm
                                                schemas={schemas}
                                                formData={formData}
                                                setFormData={setFormData}
                                                onChange={handleChange}
                                                extraErrors={extraErrors}
                                            />
                                        </Box>
                                        <GenericCard onClick={() => handleDatasetNameClick('section2')}>
                                            <UploadFiles
                                                data={data}
                                                setData={setData}
                                                files={files}
                                                setFiles={setFiles}
                                                allowSchema
                                            />
                                            {!_.isEmpty(files) && (
                                                <Box mx={3} mt={18}>
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography variant="h5" mt={1.5}>
                                                            Files Uploaded
                                                        </Typography>
                                                        <Button variant="text" onClick={onRemoveAll}>
                                                            <Typography variant="buttonText">
                                                                Remove All
                                                            </Typography>
                                                        </Button>
                                                    </Box>
                                                    <FilesPreview
                                                        files={files}
                                                        showList={false}
                                                        onRemove={onFileRemove}
                                                    />
                                                </Box>
                                            )}
                                        </GenericCard>
                                    </Box>
                                </Box>
                                <HelpSection
                                    helpSection={{
                                        isOpen: isHelpSectionOpen,
                                        activeMenuId: 'setupGuide',
                                        menus: helpSectionData.menus,
                                        highlightedSection
                                    }}
                                    onExpandToggle={() => setIsHelpSectionOpen((prev) => !prev)}
                                    expand={isHelpSectionOpen}
                                />
                            </Box>

                            {/* Fixed action button at the bottom */}
                            <Box
                                className={`${styles.actionContainer}`}
                                sx={{
                                    position: 'fixed',
                                    bottom: 0,
                                    left: -20,
                                    backgroundColor: theme.palette.background.paper,
                                    width: isHelpSectionOpen ? 'calc(100% - 400px)' : '100%',
                                    transition: 'width 0.3s ease',
                                }}
                            >
                                <Actions
                                    buttons={[
                                        {
                                            id: 'btn1',
                                            label: datasetId !== '' ? 'Proceed' : 'Create Schema',
                                            variant: 'contained',
                                            color: 'primary',
                                            disabled:
                                                _.isEmpty(formData) ||
                                                _.isEmpty(data) ||
                                                !_.isEmpty(formErrors)
                                        }
                                    ]}
                                    onClick={onSubmit}
                                />
                            </Box>
                        </>
                    )
                )}
        </Box>
    );
};

export default Ingestion;