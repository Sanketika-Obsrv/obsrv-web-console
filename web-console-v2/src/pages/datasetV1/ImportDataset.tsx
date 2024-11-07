import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Dialog, DialogTitle, DialogContent, Grid, TextField, Typography, DialogActions, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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
import { DeleteOutlined } from '@ant-design/icons';

const ImportDataset = ({ open, onClose, setOpen }: any) => {
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
    const [contents, setContents] = useState<string[]>([]);
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const [acceptedFiles, setAcceptedFiles] = useState<any[]>([]);

    const flattenContents = (content: Record<string, any> | any) => {
        return content.flat().filter((field: any) => field && Object.keys(field).length > 0);
    };

    const removeFile = (fileIndex: number) => {
        const updatedFiles = acceptedFiles.filter((_, index) => index !== fileIndex);
        setAcceptedFiles(updatedFiles);
        setIsProceedEnabled(updatedFiles.length > 0);
    };

    const FileList = ({ files, onDelete }: { files: File[], onDelete: (index: number) => void }) => (
        <List>
            {files.map((file, index) => (
                <ListItem key={index}>
                    <ListItemText primary={file.name} />
                    <ListItemSecondaryAction>
                        <IconButton edge="end" onClick={() => onDelete(index)}>
                            <DeleteOutlined />
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>
            ))}
        </List>
    );

    const onDrop = useCallback(async (acceptedFiles: any[]) => {
        setAcceptedFiles(acceptedFiles);
        const contents = await Promise.all(acceptedFiles.map((file: File) => readJsonFileContents(file)));
        if (contents.length > 0) {
            setContents(contents as string[])
            const firstContent: any = contents[0];
            setDatasetId(firstContent.dataset_id || '');
            setDatasetName(firstContent.name || '');
        }

        let datasetData;
        try {
            datasetData = await fetchDatasets({ data: { filters: {} } });
            const datasetsArray = datasetData.data;
            if (!Array.isArray(datasetsArray)) {
                throw new Error("Expected datasetData.data to be an array");
            }

            const datasetIds = datasetsArray.map((dataset: any) => dataset.dataset_id);

            const contentDatasetIds = contents.map((data: any) => data.dataset_id).filter(Boolean);

            const matchingIds = contentDatasetIds.filter((id: string) => datasetIds.includes(id));

            if (matchingIds.length > 0) {
                const conflictingIds = matchingIds;
                setIsProceedEnabled(false);
                setConflictingIds(conflictingIds);
                setCheckValidation(true);
                onClose();
                setOpenImportDialog(true);
            } else {
                setIsProceedEnabled(true);
                setConflictingIds([]);
            }
        } catch (error) {
            console.error('Error fetching datasets:', error);
        }
    }, []);

    const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'application/json': ['.json'] }, maxFiles: 1, multiple: false });

    const fetchDataset = async () => {
        return datasetRead({ datasetId: `${datasetId}?status=${DatasetStatus.Live}` }).then((response: any) => {
            return response?.data?.result
        }).catch((err: any) => { console.log(err) })
    }

    const onSubmit = async (config: any) => {
        setLoading(true);
        if ((contents) && config) {
            setLoading(true)
            try {
                const overwrite = _.get(config, "importType") === "overwrite" ? true : false
                const liveDatasetExists = await fetchDataset();
                if (liveDatasetExists && !isLiveExists) {
                    setOpenImportDialog(true)
                    setCheckValidation(true)
                    setIsLiveExists(true)
                    return
                }
                await importDataset(contents[0], config, overwrite);
                setDatasetName("")
                setDatasetId("")
                showAlert(`Dataset imported successfully`, "success");
                navigate(`/home/datasets?status=${DatasetStatus.Draft}`)
                window.location.reload()
            } catch (err) {
                setOpen(false)
                setAcceptedFiles([])
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

    const handleClose = () => {
        setOpenImportDialog(false)
    }

    useEffect(() => {
        setDatasetId('')
        setDatasetName('')
        setAcceptedFiles([])
    }, [open])

    return (
        <>
            <Dialog fullWidth={true} open={open} onClose={onClose}>
                <Box>
                    <DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
                        <Typography variant="h5" component="span">
                            Import Dataset
                        </Typography>
                        <IconButton
                            aria-label="close"
                            onClick={onClose}
                            sx={(theme) => ({
                                position: 'absolute',
                                right: 8,
                                top: 12,
                                color: theme.palette.grey[500],
                            })}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={3} justifyContent="center" alignItems="baseline" display="flex" pb={2} mt={0.5}>
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
                            <Grid>
                                <PlaceholderContent
                                    imageUrl={uploadIcon}
                                    mainText="Select dataset file"
                                    subText="JSON"
                                    type="upload"
                                />
                            </Grid>
                        </Box>
                        <FileList files={acceptedFiles} onDelete={removeFile} />
                    </DialogContent>
                    <DialogActions>
                        <Box>
                            <Typography variant="body2" color={isProceedEnabled ? 'green' : 'red'}>
                                {message}
                            </Typography>
                            <AnimateButton>
                                <Button
                                    variant="contained"
                                    sx={{ my: 1, ml: 1 }}
                                    disabled={!isProceedEnabled}
                                    onClick={
                                        () => onSubmit({ datasetId, datasetName })
                                    }
                                >
                                    Proceed
                                </Button>
                            </AnimateButton>
                        </Box>
                    </DialogActions>
                </Box>
            </Dialog>
            {openImportDialog && (
                <ImportDialog
                    openAlertDialog={openImportDialog}
                    closeDialog={handleClose}
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