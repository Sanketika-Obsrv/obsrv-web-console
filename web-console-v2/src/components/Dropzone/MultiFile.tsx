import React, { useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Stack, Typography } from '@mui/material';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import uploadImage from 'assets/upload/upload.svg';
import uploadIcon from 'assets/upload/upload_icon.svg';
import PlaceholderContent from './PlaceholderContent';
import { CustomFile, DropzopType, UploadMultiFileProps } from 'types/dropzone';
import _ from 'lodash';

const DropzoneWrapper = styled('div')(({ theme }) => ({
    outline: 'none',
    paddingTop: '5px',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper
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
            !_.isEmpty(data) && onUpload(data);
        }
    };

    const dropzoneProps = useCustomDropzone({
        multiple: isMultiple,
        onDrop: handleDrop,
        accept: {
            'application/json': ['.json']
        },
        maxSize: maxFileSize
    });

    const otherDropzoneProps = useCustomDropzone({
        multiple: isMultiple,
        onDrop: handleDrop,
        accept: {
            'application/json': ['.json']
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
                ...sx
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
                        <Typography variant="h1Secondary" mt={1} mb={1}>
                            Upload Data
                        </Typography>
                        <Stack direction="row" display={"flex"} alignItems={"center"} justifyContent={"center"}>
                            <Box {...otherDropzoneProps.getRootProps()}>
                                <PlaceholderContent
                                    imageUrl={uploadIcon}
                                    mainText="Upload Sample Data"
                                    subText="JSON"
                                    type="upload"
                                />
                            </Box>
                            <Box {...dropzoneProps.getRootProps()}>
                                <PlaceholderContent
                                    imageUrl={uploadImage}
                                    mainText="Upload Schema File"
                                    subText="JSON"
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
