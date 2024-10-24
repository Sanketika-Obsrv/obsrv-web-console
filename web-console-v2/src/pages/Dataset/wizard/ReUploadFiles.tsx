import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { Box, Dialog, DialogActions, DialogContent, Typography, DialogTitle } from '@mui/material';
import { Button } from '@mui/material';
import React, { useEffect, useState } from 'react';
import _ from 'lodash';
import FilesPreview from 'components/Dropzone/FilesPreview';
import {
    useUploadUrls,
    useUploadToUrl,
    useGenerateJsonSchema,
    useUpdateDataset
} from '../../../services/dataset';
import { readJsonFileContents } from '../../../services/utils';
import AlertDialog from '../../../components/AlertDialog/AlertDialog';
import { useAlert } from '../../../contexts/AlertContextProvider';
import UploadFiles from './UploadFiles';

const alertDialogContext = {
    title: 'Re Upload Sample Files ?',
    content: (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'secondary.100',
                padding: '0.5rem'
            }}
        >
            {' '}
            <strong>
                {' '}
                Please be advised that reupload of sample files will result in the following
                changes:{' '}
            </strong>{' '}
            <Box component="ul" sx={{ mt: 1 }}>
                {' '}
                <Box component="li">
                    {' '}
                    <strong>Loss of Previous Changes:</strong> Any previously saved changes will be
                    permanently lost. It will be necessary to update the configuration once again.{' '}
                </Box>{' '}
            </Box>{' '}
        </Box>
    )
};

export const pageMeta = { pageId: 'ingestion' };

const ReUploadFiles = (props: any) => {
    const { showAlert } = useAlert();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { resetColumns, setUploadLoading, setIsErrorUpload, datasetConfig } = props;

    const maxFileSizeConfig = 5242880;

    const [openConfirmationDialog, toggleConfirmationDialog] = useState(false);
    const [openFileUploader, toggleFileUploader] = useState(false);
    const [data, setData] = useState<any>();
    const [files, setFiles] = useState<any>();
    const [filePaths, setFilePaths] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const configDetails = sessionStorage.getItem('configDetails');
    const configData = configDetails ? JSON.parse(configDetails) : null;
    const { dataset_id: datasetId, name, version_key: versionKey } = configData || {};
    const { mutateAsync: uploadFilesMutate } = useUploadUrls();

    const { mutate: uploadToUrlMutate } = useUploadToUrl();
    const generateJsonSchemaMutate = useGenerateJsonSchema();
    const updateDatasetMutate = useUpdateDataset();

    const flattenContents = (content: Record<string, any> | any) => {
        const flattenedData = _.filter(_.flattenDeep(content), (field: any) => !_.isEmpty(field));
        return flattenedData;
    };

    const handleDialogAction = () => {
        toggleFileUploader(true);
    };

    const uploadFiles = async (files: any[]) => {
        try {
            if (files && files.length > 0) {
                const uploadData = await uploadFilesMutate({ files });

                if (!_.isEmpty(uploadData)) {
                    Promise.all(
                        _.map(uploadData, (item, index: any) =>
                            uploadToUrlMutate({
                                url: _.get(item, 'preSignedUrl'),
                                file: files[index]
                            })
                        )
                    );
                    const filePath = _.map(uploadData, 'filePath');

                    setFilePaths(filePath);

                    const config = {
                        name,
                        dataset_id: datasetId,
                        dataset_config: {
                            keys_config: (datasetConfig && datasetConfig?.keys_config) || {},
                            indexing_config:
                                (datasetConfig && datasetConfig?.indexing_config) || {},
                            file_upload_path: filePath
                        },
                        sample_data: { data },
                        type: 'event'
                    };
                    const dataset = _.get(config, 'name');
                    const payload = Array.isArray(data) ? data : [data];

                    generateJsonSchemaMutate.mutate({
                        _data: {},
                        payload: { data: payload, config: { dataset } }
                    });
                }
            }
        } catch (err) {
            setIsErrorUpload(true);
            throw new Error('Failed to upload files');
        }
    };

    useEffect(() => {
        if (generateJsonSchemaMutate.data) {
            const { schema, configurations, dataMappings, ...restGenerateData } =
                generateJsonSchemaMutate.data;
            const { ...restSchema } = schema;

            const cleanedData = {
                ...restGenerateData,
                dataset_config: {
                    keys_config: (datasetConfig && datasetConfig?.keys_config) || {},
                    indexing_config: (datasetConfig && datasetConfig?.indexing_config) || {},
                    file_upload_path: filePaths
                },
                data_schema: restSchema
            };

            updateDatasetMutate.mutate(
                {
                    config: {
                        name,
                        dataset_id: datasetId,
                        version_key: versionKey
                    },
                    data: cleanedData
                },
                {
                    onError: () => {
                        setIsErrorUpload(true);
                    }
                }
            );
        }

        const newData = generateJsonSchemaMutate.data;
        const newSchema = _.get(newData, 'schema');
        const { properties } = newSchema || {};
        if (properties) {
            const newSchema = _.omit(properties, ['configurations', 'dataMappings']);
            resetColumns(newSchema, false);
        }
    }, [generateJsonSchemaMutate.data]);

    const onUpload = async (data: any[]) => {
        try {
            await uploadFiles(files);
        } catch (err) {
            setIsErrorUpload(true);

            showAlert('Failed to upload schema', 'error');
        }
    };

    const renderUploadButton = () => {
        return (
            <Button
                variant="outlined"
                onClick={(_) => toggleConfirmationDialog(true)}
                sx={{ fontSize: '1.25rem', backgroundColor: '#ffffff' }}
                startIcon={<FileUploadOutlinedIcon style={{ fontSize: '1.25rem' }} />}
            >
                <Typography ml={1} component="span" variant="h2" color="primary">
                    Upload
                </Typography>
            </Button>
        );
    };

    const MAX_FILES = 10;
    const onSubmission = async () => {
        try {
            if (!_.isEmpty(files) && _.size(files) > MAX_FILES) {
                showAlert('Pre-signed URL generation failed: limit exceeded', 'error');
                return;
            }
            await onUpload(data);
        } catch (err) {
            setIsErrorUpload(true);
            showAlert('Failed to upload data', 'error');
        } finally {
            resetState();
            setLoading(false);
        }
    };

    const onFileRemove = async (file: File | string) => {
        const filteredItems = files && files.filter((_file: any) => _file !== file);
        const contents = await Promise.all(
            filteredItems.map((file: File) => readJsonFileContents(file))
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

    const onRemoveAll = () => {
        setFiles([]);
        setData([]);
    };

    const resetState = () => {
        setUploadLoading(false);
        toggleFileUploader(false);
        setFiles([]);
        setData([]);
    };

    const renderUploadDialog = () => {
        return (
            <>
                <Dialog
                    fullWidth={true}
                    open={openFileUploader}
                    onClose={() => resetState()}
                    sx={{
                        '& .MuiDialog-paper': {
                            maxWidth: 'fit-content'
                        }
                    }}
                >
                    <DialogTitle>Upload Data/Schema</DialogTitle>
                    <DialogContent>
                        <UploadFiles
                            data={data}
                            setData={setData}
                            files={files}
                            setFiles={setFiles}
                            maxFileSize={maxFileSizeConfig}
                            allowSchema={true}
                        />
                        {files && _.size(files) > 0 && (
                            <>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="h5" component="span" gutterBottom>
                                        Files Uploaded
                                    </Typography>
                                    <Button onClick={onRemoveAll}>Remove all</Button>
                                </Box>
                                <FilesPreview
                                    files={files}
                                    showList={false}
                                    onRemove={onFileRemove}
                                />
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button disabled={loading} onClick={(e) => resetState()}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            disabled={loading}
                            onClick={(_) => onSubmission()}
                            autoFocus
                        >
                            Submit
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const renderConfirmationDialog = () => {
        return (
            <AlertDialog
                open={openConfirmationDialog}
                action={handleDialogAction}
                handleClose={() => toggleConfirmationDialog(false)}
                context={alertDialogContext}
            />
        );
    };

    return (
        <>
            {renderUploadButton()}
            {renderConfirmationDialog()}
            {renderUploadDialog()}
        </>
    );
};

export default ReUploadFiles;
