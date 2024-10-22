import React, { useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Stack, Typography } from '@mui/material';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import uploadImage from 'assets/upload/upload.svg';
import uploadIcon from 'assets/upload/upload_icon.svg';
import PlaceholderContent from './PlaceholderContent';
import { CustomFile, DropzopType, UploadMultiFileProps } from 'types/dropzone';

const DropzoneWrapper = styled('div')(({ theme }) => ({
    outline: 'none',
    padding: theme.spacing(3, 1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    maxHeight: 428
}));

const useCustomDropzone = (options: DropzoneOptions) => {
    const { multiple, onDrop, accept, maxSize } = options;
    const dropzoneProps = useDropzone({
        multiple,
        onDrop,
        accept,
        maxSize
    });
    return dropzoneProps;
};

const MultiFileUpload = ({
    error,
    showList = false,
    files,
    type,
    setFieldValue,
    sx,
    onUpload,
    maxFileSize = 5242880,
    subscribeErrors = null,
    isMultiple = true,
    ...other
}: UploadMultiFileProps) => {
    const handleDrop = (acceptedFiles: CustomFile[]) => {
        if (files && isMultiple) {
            const data = [
                ...files,
                ...acceptedFiles.map((file: CustomFile) => {
                    return Object.assign(file, {
                        preview: URL.createObjectURL(file)
                    });
                })
            ];
            setFieldValue('files', data);
            onUpload(data);
        } else {
            const data = acceptedFiles.map((file: CustomFile) => {
                return Object.assign(file, {
                    preview: URL.createObjectURL(file)
                });
            });
            setFieldValue('files', data);
            onUpload(data);
        }
    };

    const dropzoneProps = useCustomDropzone({
        multiple: isMultiple,
        onDrop: handleDrop,
        accept: {
            'application/json': ['.json'],
            'text/csv': ['.csv'],
            'application/xml': ['.xml'],
            'application/octet-stream': ['.parquet', '.avro', '.orc']
        },
        maxSize: maxFileSize
    });

    const otherDropzoneProps = useCustomDropzone({
        multiple: isMultiple,
        onDrop: handleDrop,
        accept: {
            'application/json': ['.json'],
            'text/csv': ['.csv'],
            'application/xml': ['.xml'],
            'application/octet-stream': ['.parquet', '.avro', '.orc']
        },
        maxSize: maxFileSize
    });

    useEffect(() => {
        subscribeErrors &&
            subscribeErrors([
                ...dropzoneProps.fileRejections,
                ...otherDropzoneProps.fileRejections
            ]);
    }, [dropzoneProps.fileRejections, otherDropzoneProps.fileRejections, subscribeErrors]);

    return (
        <Box
            sx={{
                width: '100%',
                ...(type === DropzopType.standard && {
                    width: 'auto',
                    display: 'flex'
                }),
                ...sx,
                maxHeight: 128
            }}
        >
            <Stack {...(type === DropzopType.standard && { alignItems: 'center' })}>
                <DropzoneWrapper
                    data-edatatype="DRAG&DROP"
                    sx={{
                        ...(type === DropzopType.standard && {
                            p: 0,
                            m: 1,
                            width: 64,
                            height: 64
                        }),
                        ...(dropzoneProps.isDragActive && { opacity: 0.72 }),
                        ...((dropzoneProps.isDragReject || error) && {
                            color: 'error.main',
                            borderColor: 'error.light',
                            bgcolor: 'error.lighter'
                        })
                    }}
                >
                    <input {...dropzoneProps.getInputProps()} />
                    <input {...otherDropzoneProps.getInputProps()} />
                    <Box mt={1}>
                        <Typography variant="h1Secondary" mt={1} mb={2}>
                            Upload Data
                        </Typography>
                        <Stack direction="row" mt={-3} ml={-4}>
                            <Box {...otherDropzoneProps.getRootProps()}>
                                <PlaceholderContent
                                    imageUrl={uploadIcon}
                                    mainText="Upload Sample Data"
                                    subText="Accepted formats: JSON, CSV, XML, Parquet, Avro, and ORC"
                                    type="upload"
                                />
                            </Box>
                            <Box {...dropzoneProps.getRootProps()} ml={-4}>
                                <PlaceholderContent
                                    imageUrl={uploadImage}
                                    mainText="Upload Schema File"
                                    subText="JSON, XML, ProtoBuf, CSV and Avro"
                                    type="upload"
                                />
                            </Box>
                        </Stack>
                    </Box>
                </DropzoneWrapper>
            </Stack>
        </Box>
    );
};

export default MultiFileUpload;
