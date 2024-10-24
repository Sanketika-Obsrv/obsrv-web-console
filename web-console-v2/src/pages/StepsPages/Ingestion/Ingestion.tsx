import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, Grid, Paper, TextField, Typography } from '@mui/material';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { styled } from '@mui/material';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { useFormik } from 'formik';
import _, { isEmpty } from 'lodash';
import { useNavigate } from 'react-router-dom';
import { theme } from 'theme';
import { useAlert } from 'contexts/AlertContextProvider';
import Actions from 'components/ActionButtons/Actions';
import FilesPreview from 'components/Dropzone/FilesPreview';
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
import ingestionStyle from './Ingestion.module.css';
import helpSectionData from './HelpSectionData.json';
import axios from 'axios';
import localStyles from "./Ingestion.module.css";
import RejectionFiles from 'components/Dropzone/RejectionFiles';
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

    const [datasetName, setDatasetName] = useState('');
    const [datasetId, setDatasetId] = useState('');
    const [nameError, setNameError] = useState('');

    const [isHelpSectionOpen, setIsHelpSectionOpen] = useState(false);

    const formikRef = useRef<any>();

    const { data: dataState, files: filesState, config: configState } = {} as any;

    const [data, setData] = useState(dataState);

    const [files, setFiles] = useState(filesState);

    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

    const connectorConfigData = sessionStorage.getItem('connectorConfigDetails');

    const ConnectorConfiguration = connectorConfigData ? JSON.parse(connectorConfigData) : null;

    const [fileErrors, setFileErrors] = useState<any>(null);
     const maxFileSizeConfig = 5242880;

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
        datasetId: datasetId,
        queryParams: 'status=Draft&mode=edit&fields=dataset_config'
    });

    const {
        data: updateDatasetData,
        mutate: updateDatasetMutate,
        isPending: isUpdateLoading,
        isError: isErrorUpdate
    } = useUpdateDataset();

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

    const fetchDataset = (id: string) => {
        refetch().then(response => {
            if (response.isSuccess) {
                setNameError('Dataset already exists');
            } else {
                setNameError('');
            }
        }).catch(error => {
            console.error('Error fetching dataset:', error);
        })
    }

    const debouncedFetchDataset = useMemo(
        () => _.debounce(fetchDataset, 800), []
    );

    useEffect(() => {
        if (datasetId) {
            debouncedFetchDataset(datasetId);
        }
    }, [datasetId]);

    const handleDatasetNameClick = (id: string) => setHighlightedSection(id);

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

            const dataset = datasetId;

            const payload = _.isArray(data) ? data : [data];

            generateJsonSchemaMutate({
                _data: {},
                payload: { data: payload, config: { dataset } }
            });
        }
    }, [uploadData, uploadToUrlMutate, files, data, generateJsonSchemaMutate]);

    useEffect(() => {
        if (!_.isEmpty(uploadData) && generateData) {
            const { schema } = generateData;
            const filePaths = _.map(uploadData, 'filePath');
            if (datasetId) {
                const config = {
                    name: datasetName,
                    dataset_id: datasetId,
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
                        data_schema: schema,
                        dataset_id: datasetId
                    }
                });
            }
        }
    }, [uploadData, generateData, createDatasetMutate]);

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
        initialConfigDetails.name = datasetName;
        sessionStorage.setItem('configDetails', JSON.stringify(initialConfigDetails));

        if (!_.isEmpty(files) && _.size(files) > MAX_FILES) {
            showAlert(`Exceeded the maximum number of files, ${MAX_FILES} files are allowed`, 'error');
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

    useEffect(() => {
        if (datasetName) {
            const generatedId = datasetName.toLowerCase().replace(/\s+/g, '-');
            setDatasetId(generatedId);
        } else {
            setDatasetId('');
        }
    }, [datasetName]);

    const nameRegex = /^[^!@#$%^&*()+{}[\]:;<>,?~\\|]*$/;
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (nameRegex.test(newValue)) {
            setDatasetName(newValue);
            setNameError('');
        } else {
            setNameError('The field should exclude any special characters, permitting only alphabets, numbers, ".", "-", and "_".');
        }
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
                                        px={2}
                                        className={`${styles.formContainer} ${ingestionStyle.container} ${isHelpSectionOpen ? styles.expanded : styles.collapsed}`}
                                    >

                                        <GenericCard className={localStyles.datasetDetails}>
                                            <Box className={localStyles?.heading}>
                                                <Typography variant='h1'>Dataset Details</Typography>
                                            </Box>

                                            <Grid container spacing={3} className={localStyles?.gridContainer}>
                                                <Grid item xs={12} sm={6} lg={6}>
                                                    <TextField
                                                        name={'name'}
                                                        label={'Dataset Name'}
                                                        value={datasetName}
                                                        onChange={handleNameChange}
                                                        required
                                                        variant="outlined"
                                                        fullWidth
                                                        error={Boolean(nameError)}
                                                        helperText={nameError}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6} lg={6}>
                                                    <TextField
                                                        name={'dataset_id'}
                                                        label={'Dataset ID'}
                                                        value={datasetId}
                                                        required
                                                        variant="outlined"
                                                        fullWidth
                                                        disabled
                                                    />
                                                </Grid>
                                            </Grid>
                                        </GenericCard>
                                        <GenericCard onClick={() => handleDatasetNameClick('section2')}>
                                            <UploadFiles
                                                data={data}
                                                setData={setData}
                                                files={files}
                                                setFiles={setFiles}
                                                allowSchema
                                                maxFileSize={maxFileSizeConfig}
                                                subscribeErrors={setFileErrors}
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
                                            <Box sx={{marginTop: 30, mr: 1, ml: 1, mb:1}}>
                                                 {fileErrors?.length > 0 && <RejectionFiles fileRejections={fileErrors} />}
                                             </Box>
                                        </GenericCard>
                                    </Box>
                                </Box>
                                <HelpSection
                                    helpSection={{
                                        isOpen: isHelpSectionOpen,
                                        activeMenuId: 'getStarted',
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
                                            disabled: !_.isEmpty(nameError) || isEmpty(datasetId) || isEmpty(files)
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