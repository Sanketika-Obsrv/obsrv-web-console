import React, { useEffect, useRef, useState } from 'react';
import { useAlert } from 'contexts/AlertContextProvider';
import UploadFiles from 'pages/Dataset/wizard/UploadFiles';
import { CardTitle, GenericCard } from 'components/Styled/Cards';
import { Box, Button, Dialog, Grid, TextField, Typography } from '@mui/material';
import RejectionFiles from 'components/Dropzone/RejectionFiles';
import FilesPreview from 'components/Dropzone/FilesPreview';
import _ from 'lodash';
import { readJsonFileContents } from 'services/utils';
import localStyles from "../StepsPages/Ingestion/Ingestion.module.css";
import AnimateButton from 'components/@extended/AnimateButton';
import Loader from 'components/Loader';

const ImportDataset = ({ open, onClose }: any) => {
    const { data: dataState, files: filesState, config: configState } = {} as any;
    const [data, setData] = useState(dataState);
    const [datasetId, setDatasetId] = useState('');
    const [files, setFiles] = useState(filesState);
    const maxFileSizeConfig = 5242880;
    const [fileErrors, setFileErrors] = useState<any>(null);
    const [datasetName, setDatasetName] = useState('');
    const [nameError, setNameError] = useState('');
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);

    const flattenContents = (content: Record<string, any> | any) =>
        _.filter(_.flattenDeep(content), (field: any) => !_.isEmpty(field));

    const onFileUpload = async (uploadedFiles: File[]) => {
        const contents = await Promise.all(
            _.map(uploadedFiles, (file: File) => readJsonFileContents(file))
        );

        console.log('contents', contents)
        const flattenedContents = flattenContents(contents);
        console.log('flattendcontents', flattenedContents);

        if (flattenedContents.length > 0 && _.get(flattenedContents, "name") || '') {
            setDatasetName(_.get(flattenedContents, "name") || '');
        }

        setFiles(uploadedFiles);
        setData(flattenedContents);
    };

    const onRemoveAll = () => {
        setFiles(null);
        setData(null);
        setDatasetName('');
    };

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

    const onFileRemove = async (file: File | string) => {
        const filteredItems = files && files.filter((_file: any) => _file !== file);
        const contents = await Promise.all(filteredItems.map((file: File) => readJsonFileContents(file)));
        const flattenedContents = flattenContents(contents);
        if (_.size(flattenedContents) === 0) {
            setFiles(filteredItems);
            setData(flattenedContents);
            if (!_.isEmpty(filteredItems)) showAlert('Invalid file contents', "error");
        } else {
            setFiles(filteredItems);
            setData(flattenedContents);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <Box>
            {loading && <Loader loading={loading}/>}
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
            <GenericCard>
                <UploadFiles
                    data={data}
                    setData={setData}
                    files={files}
                    setFiles={setFiles}
                    maxFileSize={maxFileSizeConfig}
                    datasetImport={true}
                    allowSchema
                    subscribeErrors={setFileErrors}
                    onUpload={onFileUpload}
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
                <Box sx={{ marginTop: 30, mr: 1, ml: 1, mb: 1 }}>
                    {fileErrors?.length > 0 && <RejectionFiles fileRejections={fileErrors} />}
                </Box>
            </GenericCard>
            <Box display="flex" justifyContent="flex-end">
                <AnimateButton>
                    <Button
                        variant="contained"
                        sx={{ my: 2, ml: 1 }}
                        type="submit"
                    disabled={loading || _.isEmpty(data)}
                    >
                        Proceed
                    </Button>
                </AnimateButton>
            </Box>
        </Box>
        </Dialog>
    );
};

export default ImportDataset;
