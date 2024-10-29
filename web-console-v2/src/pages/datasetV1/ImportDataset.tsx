import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Dialog, Grid, TextField, Typography } from '@mui/material';
import { readJsonFileContents } from 'services/utils';
import AnimateButton from 'components/@extended/AnimateButton';
import PlaceholderContent from 'components/Dropzone/PlaceholderContent';
import uploadIcon from 'assets/upload/upload_icon.svg';
import { datasetRead, fetchDatasets, importDataset } from 'services/datasetV1';
import ImportDialog from './ImportDialog'; // Import your dialog component
import HtmlTooltip from 'components/HtmlTooltip';
import _ from 'lodash';
import { DatasetStatus } from 'types/datasets';
import { useNavigate } from 'react-router-dom';
import { useAlert } from 'contexts/AlertContextProvider';

const ImportDataset = ({ open, onClose }: any) => {
    const [openImportDialog, setOpenImportDialog] = useState(false);
    const [flattenedContents, setFlattenedContents] = useState([]);
    const [isProceedEnabled, setIsProceedEnabled] = useState(false);
    const [message, setMessage] = useState('');
    const [conflictingIds, setConflictingIds] = useState<string[]>([]);
    const [datasetId, setDatasetId] = useState('');
    const [datasetName, setDatasetName] = useState('');
    const [checkValidation, setCheckValidation] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isLiveExists, setIsLiveExists] = useState<boolean>(false);
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    const flattenContents = (content: Record<string, any> | any) => {
        return content.flat().filter((field: any) => field && Object.keys(field).length > 0);
    };

    const onDrop = useCallback(async (acceptedFiles: any[]) => {
        const contents = await Promise.all(acceptedFiles.map((file: File) => readJsonFileContents(file)));
        console.log('contents', contents);
         if (contents.length > 0) {
            const firstContent: any = contents[0]; 
            setDatasetId(firstContent.dataset_id || ''); 
            setDatasetName(firstContent.name || '');
        }

        let datasetData;
        try {
            datasetData = await fetchDatasets({ data: { filters: {} } });
            const datasetsArray = datasetData.data;
            console.log(datasetsArray);
            if (!Array.isArray(datasetsArray)) {
                throw new Error("Expected datasetData.data to be an array");
            }

            const datasetIds = datasetsArray.map((dataset: any) => dataset.dataset_id);
            console.log(datasetIds);

            const contentDatasetIds = contents.map((data: any) => data.dataset_id).filter(Boolean);
            console.log('Content dataset IDs:', contentDatasetIds);

            const matchingIds = contentDatasetIds.filter((id: string) => datasetIds.includes(id));

            if (matchingIds.length > 0) {
                const conflictingIds = matchingIds;
                setOpenImportDialog(true);
                setIsProceedEnabled(false);
                setConflictingIds(conflictingIds);
                setMessage(`Conflicting dataset IDs found: ${conflictingIds.join(', ')}.`);
                setCheckValidation(true);
            } else {
                setIsProceedEnabled(true);
                setConflictingIds([]);
                setMessage('No conflicting dataset IDs found.');
            }
        } catch (error) {
            console.error('Error fetching datasets:', error);
        }
    }, []);

    const { getRootProps, getInputProps } = useDropzone({ onDrop });

    const fetchDataset = async () => {
        return datasetRead({ datasetId: `${datasetId}?status=${DatasetStatus.Live}` }).then((response: any) => {
            return response?.data?.result
        }).catch((err: any) => { console.log(err) })
    }

    const onSubmit = async () => {
        setLoading(true);
        if ((datasetId || datasetName) ) {
            setLoading(true)
            try {
                const liveDatasetExists = await fetchDataset();
                if (liveDatasetExists && !isLiveExists) {
                    setOpenImportDialog(true)
                    setCheckValidation(true)
                    setIsLiveExists(true)
                    return
                }
                await importDataset(datasetId, {}, true);
                navigate(`/datasets?status=${DatasetStatus.Draft}`);
                showAlert(`Dataset imported successfully`, "success");
            } catch (err) {
                const errStatus = _.get(err, ["response", "status"]);
                const errCode = _.get(err, ["response", "data", "error", "code"])
                if (errStatus === 409 && errCode == "DATASET_EXISTS") {
                    setOpenImportDialog(true)
                    setCheckValidation(true)
                }
                else {
                    showAlert("Failed to import dataset", "error");
                }
            } finally {
                setLoading(false)
            }
        } else {
            showAlert('Please fill the required fields', "error");
        }
        setLoading(false);
    };

    return (
        <>
            <Dialog fullWidth={true} open={open} onClose={onClose}>
                <Grid container spacing={3} justifyContent="center" alignItems="baseline" display="flex">
                    <Grid item xs={12} sm={6} lg={6}>
                        <HtmlTooltip title="Name of the dataset" arrow placement="top-start">
                            <TextField
                                name={'name'}
                                label={'Dataset Name'}
                                required
                                variant="outlined"
                                fullWidth
                                value={datasetName}
                                onChange={(e) => setDatasetName(e.target.value)}
                            />
                        </HtmlTooltip>
                    </Grid>
                    <Grid item xs={12} sm={6} lg={6}>
                        <HtmlTooltip title="ID for the dataset - for querying" arrow placement="top-start">
                            <TextField
                                name={'dataset_id'}
                                label={'Dataset ID'}
                                required
                                variant="outlined"
                                fullWidth
                                value={datasetId}
                                onChange={(e) => setDatasetId(e.target.value)}
                            />
                        </HtmlTooltip>
                    </Grid>
                </Grid>
                <Box {...getRootProps()} sx={{ p: 2, border: '2px dashed #ccc' }}>
                    <input {...getInputProps()} />
                    <PlaceholderContent
                        imageUrl={uploadIcon}
                        mainText="Upload Sample Data"
                        subText="JSON"
                        type="upload"
                    />
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
                    <Typography variant="body2" color={isProceedEnabled ? 'green' : 'red'}>
                        {message}
                    </Typography>
                    <AnimateButton>
                        <Button
                            variant="contained"
                            sx={{ my: 2, ml: 1 }}
                            disabled={!isProceedEnabled}
                            onClick={
                                onSubmit
                            }
                        >
                            Proceed
                        </Button>
                    </AnimateButton>
                </Box>
            </Dialog>
            {openImportDialog && (
                <ImportDialog
                    setOpenDailog={setOpenImportDialog}
                    setCheckValidation={setCheckValidation}
                    setDatasetName={setDatasetName}
                    setDatasetId={setDatasetId}
                    onSubmit={onSubmit}
                    isLiveExists={isLiveExists}
                    datasetId={datasetId}
                    datasetName={datasetName}
                />
            )}
        </>
    );
};

export default ImportDataset;
