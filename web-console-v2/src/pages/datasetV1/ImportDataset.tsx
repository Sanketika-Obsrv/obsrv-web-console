import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAlert } from 'contexts/AlertContextProvider';
import { Box, Button, Dialog, Grid, TextField, Typography } from '@mui/material';
import { GenericCard } from 'components/Styled/Cards';
import _ from 'lodash';
import { readJsonFileContents } from 'services/utils';
import localStyles from "../StepsPages/Ingestion/Ingestion.module.css";
import AnimateButton from 'components/@extended/AnimateButton';
import Loader from 'components/Loader';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import PlaceholderContent from 'components/Dropzone/PlaceholderContent';
import uploadIcon from 'assets/upload/upload_icon.svg';
import { fetchDatasets } from 'services/datasetV1';
import { DatasetStatus } from 'types/datasets';

const ImportDataset = ({ open, onClose }: any) => {
    const flattenContents = (content: Record<string, any> | any) => {
        const flattenedData = _.filter(_.flattenDeep(content), (field: any) => !_.isEmpty(field));
        return flattenedData;
    }

    const onDrop = useCallback(async (acceptedFiles: any[]) => {
        const contents = await Promise.all(acceptedFiles.map((file: File) => readJsonFileContents(file)));
        console.log(contents)
        const flattenedContents = flattenContents(contents);
        if (_.size(flattenedContents) === 0) throw new Error("Invalid file content");
        console.log('flattendContents', flattenedContents);
        const datasetData = await fetchDatasets({ data: { filters: {  } } });
        console.log(datasetData);
    }, [])
    const { getRootProps, getInputProps } = useDropzone({ onDrop })
    return (
        <Dialog  fullWidth={true} open={open} onClose={onClose}>
            <Box {...getRootProps()}>
                <input {...getInputProps()} />
                <PlaceholderContent
                    imageUrl={uploadIcon}
                    mainText="Upload Sample Data"
                    subText="JSON"
                    type="upload"
                />
            </Box>
            <Box display="flex" justifyContent="flex-end">
                <AnimateButton>
                    <Button
                        variant="contained"
                        sx={{ my: 2, ml: 1 }}
                        type="submit"
                    >
                        Proceed
                    </Button>
                </AnimateButton>
            </Box>
        </Dialog>
    )
};

export default ImportDataset;