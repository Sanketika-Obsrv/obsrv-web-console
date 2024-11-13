import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { Box, Button, Card, FormControl, FormControlLabel, FormLabel, Grid, Radio, RadioGroup, styled, TextField, Typography } from '@mui/material';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import CreateDataset from 'assets/help/createDataset';
import axios from 'axios';
import Actions from 'components/ActionButtons/Actions';
import FilesPreview from 'components/Dropzone/FilesPreview';
import RejectionFiles from 'components/Dropzone/RejectionFiles';
import HelpSection from 'components/HelpSection/HelpSection';
import Loader from 'components/Loader';
import Retry from 'components/Retry/Retry';
import { useAlert } from 'contexts/AlertContextProvider';
import { useFormik } from 'formik';
import _, { isEmpty } from 'lodash';
import styles from 'pages/ConnectorConfiguration/ConnectorConfiguration.module.css';
import UploadFiles from 'pages/Dataset/wizard/UploadFiles';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    useCreateDataset,
    useFetchDatasetExists,
    useFetchDatasetsById,
    useGenerateJsonSchema,
    useReadUploadedFiles,
    useUpdateDataset,
    useUploadToUrl,
    useUploadUrls
} from 'services/dataset';
import { readJsonFileContents } from 'services/utils';
import { theme } from 'theme';
import { default as ingestionStyle, default as localStyles } from './Ingestion.module.css';

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
    const location = useLocation();
    const navigate = useNavigate();
    const { connectorConfig, datasetType: datasetTypeParam, selectedConnectorId } = location.state || {};
    const { datasetId: datasetIdParam }: any = useParams();
    const [datasetType, setDatasetType] = useState<string>(datasetTypeParam || 'event');
    const [datasetName, setDatasetName] = useState('');
    const [connectorConfigState, setConnectorConfigState] = useState<any>(undefined);
    const [datasetId, setDatasetId] = useState(datasetIdParam === '<new>'? null : datasetIdParam);
    const [nameError, setNameError] = useState('');

    const [isHelpSectionOpen, setIsHelpSectionOpen] = useState(true);

    const formikRef = useRef<any>();

    const { data: dataState, files: filesState, config: configState } = {} as any;

    const [data, setData] = useState(dataState);

    const [files, setFiles] = useState(filesState);

    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
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

    let readDatasetQueryParams = 'status=Draft&fields=dataset_config,name,version_key,connectors_config';
    if(datasetIdParam !== '<new>') readDatasetQueryParams += '&mode=edit'
    const { data: fetchData, refetch } = useFetchDatasetsById({
        datasetId: datasetId,
        queryParams: readDatasetQueryParams
    });
    const { data: datasetExistsData, refetch: refetchExists } = useFetchDatasetExists({
        datasetId: datasetId
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
        if (datasetIdParam === '<new>') {
            return
        }
        if (datasetId !== '' && fetchData) {
            setDatasetName(_.get(fetchData, 'name'));
            if(fetchData.connectors_config && fetchData.connectors_config[0]) {
                setConnectorConfigState(fetchData.connectors_config[0])
            }
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
        refetchExists().then(response => {
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
        if (datasetIdParam === '<new>' && datasetId) {
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
            let mergedEvent = {};
            if (data) {
                _.map(data, (item: any) => {
                    mergedEvent = _.merge(mergedEvent, item);
                });
            }
            if (datasetIdParam === '<new>' && datasetId) {
                const connectors_config = (connectorConfig) ? [{
                    ...connectorConfig,
                    id: `${datasetId}-${connectorConfig.connector_id}`,
                    version: 'v2'
                }] : []
                const config = {
                    name: datasetName,
                    dataset_id: datasetId,
                    dataset_config: {
                        keys_config: {},
                        indexing_config: {},
                        file_upload_path: filePaths
                    },
                    connectors_config: connectors_config,
                    data_schema: schema,
                    type: datasetType,
                    sample_data: { mergedEvent }
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
                        dataset_id: datasetId,
                        type: datasetType,
                        sample_data: { mergedEvent }
                    }
                });
            }
        }
    }, [uploadData, generateData, data]);

    const handleNavigate = () => {

        if(!connectorConfig && !connectorConfigState) {
            navigate(`/dataset/edit/connector/list/${datasetIdParam}`);
        } else {
            navigate(`/dataset/edit/connector/configure/${datasetIdParam}`, {
                state: {selectedConnectorId, connectorConfig}
            });
        }
    };

    useEffect(() => {
        if (updateDatasetData || createData) navigate(`/dataset/edit/ingestion/schema/${datasetId}`);
    }, [updateDatasetData, createData, navigate]);

    const onSubmit = () => {
        if (!_.isEmpty(files) && _.size(files) > MAX_FILES) {
            showAlert(`Exceeded the maximum number of files, ${MAX_FILES} files are allowed`, 'error');
            return;
        }
        if(datasetIdParam === '<new>') {
            if (data || !_.isEmpty(files)) {
                try {
                    if (!_.isEmpty(files)) uploadFilesMutate({ files });
                } catch {
                    showAlert('Failed to upload schema', 'error');
                }
            } else {
                showAlert('Please fill the required fields', 'error');
            }
        } else {
            if (data || !_.isEmpty(files)) {
                try {
                    if (!_.isEmpty(files)) uploadFilesMutate({ files });
                } catch {
                    showAlert('Failed to upload schema', 'error');
                }
            } else {
                updateDatasetMutate({
                    data: {
                        name: datasetName,
                        dataset_id: datasetIdParam,
                        type: datasetType
                    }
                });
            }
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

    const handleFileSelection = (selectedFiles:any) => {
        if (selectedFiles?.length > 0) {
            // Keep only the latest selected file
            setFiles([selectedFiles[selectedFiles.length - 1]]); 
        }
    };
    
    // File removal logic to clear the selected file
    const handleFileRemove = (fileToRemove:any) => {
        setFiles([]);
    };
    useEffect(() => {
        if(datasetIdParam === '<new>') {
            if (nameRegex.test(datasetName)) {
                const generatedId = datasetName.toLowerCase().replace(/\s+/g, '-');
                setDatasetId(generatedId);
            } else {
                setNameError('The field should exclude any special characters, permitting only alphabets, numbers, ".", "-", and "_".');
            }
        }
    }, [datasetName])

    const nameRegex = /^[^!@#$%^&*()+{}[\]:;<>,?~\\|]*$/;
    const handleNameChange = (newValue: any) => {
        if (nameRegex.test(newValue)) {
            setDatasetName(newValue);
            if(datasetIdParam === '<new>') {
                const generatedId = datasetName.toLowerCase().replace(/\s+/g, '-');
                setDatasetId(generatedId);
            }
            setNameError('');
        } else {
            setNameError('The field should exclude any special characters, permitting only alphabets, numbers, ".", "-", and "_".');
        }
        console.log("### datasetName", datasetName)
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
                                        variant="back"
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

                                        <GenericCard className={localStyles.datasetDetails} onClick={() => handleDatasetNameClick('section1')}>
                                            <Box className={localStyles?.heading}>
                                                <Typography variant='h1'>Dataset Details</Typography>
                                            </Box>

                                            <Grid container columnSpacing={4} rowSpacing={2} className={localStyles?.gridContainer}>
                                                <Grid item xs={12} sm={6} lg={6}>
                                                    <TextField
                                                        name={'name'}
                                                        label={'Dataset Name'}
                                                        value={datasetName}
                                                        onChange={(e) => handleNameChange(e.target.value)}
                                                        onBlur={(e) => handleNameChange(e.target.value)}
                                                        required
                                                        variant="outlined"
                                                        fullWidth
                                                        error={Boolean(nameError || (datasetName.length > 0 && (datasetName.length < 4 || datasetName.length > 100)))}
                                                        helperText={nameError || (datasetName.length > 0 && (datasetName.length < 4 || datasetName.length > 100) ? 'Dataset name should be between 4 and 100 characters' : 'Enter a unique, descriptive dataset name (use only alphabets)')}
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
                                                        key={datasetId}
                                                        disabled
                                                        helperText="This field is auto-generated using the Dataset name"
                                                    />
                                                </Grid>
                                                <Grid item xs={24} sm={12} lg={12}>
                                                    <Typography variant='body1'>
                                                        <strong>Dataset Type:</strong> Choose the type of data you&apos;re working with: <strong>Event Data</strong> for ongoing records, <strong>Data Changes</strong> for updates like transactions, or <strong>Master Data</strong> for data used in denormalization of other datasets.
                                                    </Typography>
                                                    <FormControl sx={{paddingLeft: '5px'}}>
                                                        <RadioGroup
                                                            row
                                                            aria-labelledby="demo-row-radio-buttons-group-label"
                                                            name="row-radio-buttons-group"
                                                            value={datasetType}
                                                            onChange={(event) => {setDatasetType(event.target.value)}}
                                                        >
                                                            <FormControlLabel value="event" control={<Radio />} label="Event/Telemetry Data" title='Is this data a time-series of ongoing records or measurements that are only added (append-only), like sensor data or usage events?'/>
                                                            <FormControlLabel value="transaction" control={<Radio />} label="Data Changes (Updates or Transactions)" title="Does this data capture updates, transactions, or changes over time (like transactions or change data capture)?" />
                                                            <FormControlLabel value="master" control={<Radio />} label="Master Data" title='Is this reference data that doesn’t change frequently, like customer or product details?'/>
                                                        </RadioGroup>
                                                    </FormControl>
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
                                                <Box mx={3} mt={0}>
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
                                            <Box sx={{ marginTop: 0, mr: 1, ml: 1, mb: 1 }}>
                                                {fileErrors?.length > 0 && <RejectionFiles fileRejections={fileErrors} />}
                                            </Box>
                                        </GenericCard>
                                    </Box>
                                </Box>
                                <HelpSection
                                    helpSection={{
                                        defaultHighlight: "section1"
                                    }}
                                    helpText={<CreateDataset />}
                                    highlightSection={highlightedSection}
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
                                    left: 0,
                                    backgroundColor: theme.palette.background.paper,
                                    width: isHelpSectionOpen ? 'calc(100% - 23rem)' : '100%',
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
                                            disabled: datasetIdParam === '<new>' && (!_.isEmpty(nameError) || isEmpty(datasetId) || isEmpty(files) || (datasetName.length < 4 || datasetName.length > 100))
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
