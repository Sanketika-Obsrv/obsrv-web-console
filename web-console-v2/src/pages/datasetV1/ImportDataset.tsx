import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Dialog, Typography } from '@mui/material';
import { readJsonFileContents } from 'services/utils';
import AnimateButton from 'components/@extended/AnimateButton';
import PlaceholderContent from 'components/Dropzone/PlaceholderContent';
import uploadIcon from 'assets/upload/upload_icon.svg';
import { fetchDatasets } from 'services/datasetV1';
import ImportDialog from './ImportDialog'; // Import your dialog component

const ImportDataset = ({ open, onClose }: any) => {
    const [openImportDialog, setOpenImportDialog] = useState(false);
    const [flattenedContents, setFlattenedContents] = useState([]);
    const [isProceedEnabled, setIsProceedEnabled] = useState(false);
    const [message, setMessage] = useState('');
    const [conflictingIds, setConflictingIds] = useState<string[]>([]);

    const flattenContents = (content: Record<string, any> | any) => {
        return content.flat().filter((field: any) => field && Object.keys(field).length > 0);
    };

    const onDrop = useCallback(async (acceptedFiles: any[]) => {
        const contents = await Promise.all(acceptedFiles.map((file: File) => readJsonFileContents(file)));
        console.log('contents', contents);
    
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

    return (
        <>
            <Dialog fullWidth={true} open={open} onClose={onClose}>
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
                            onClick={() => {
                                if (isProceedEnabled) {
                                    console.log('Proceeding with import...');
                                }
                            }}
                        >
                            Proceed
                        </Button>
                    </AnimateButton>
                </Box>
            </Dialog>
            {openImportDialog && (
                <ImportDialog
                    setOpenDailog={setOpenImportDialog}
                    setFiles={flattenedContents}
                />
            )}
        </>
    );
};

export default ImportDataset;
