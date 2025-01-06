import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAlert } from 'contexts/AlertContextProvider';
import styles from './Connector.module.css';

interface ConnectorMultiFileUploadProps {
  setFieldValue: (field: string, value: any) => void;
  files: File[];
  error?: boolean;
  onUpload: (files: File[]) => void;
  onFileRemove: (file: File | string) => void;
  subscribeErrors?: (errors: any) => void;
  isMultiple?: boolean;
}

const ConnectorMultiFileUpload: React.FC<ConnectorMultiFileUploadProps> = ({
  setFieldValue,
  files,
  error,
  onUpload,
  onFileRemove,
  subscribeErrors,
  isMultiple = true,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles?.length > 0) {
        setFieldValue('files', acceptedFiles);
        onUpload(acceptedFiles);
      }
    },
    [onUpload, setFieldValue],
  );

  const { showAlert } = useAlert();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: isMultiple,
    accept: {
      'application/gzip': ['.gz'],
      'application/x-gzip': ['.gz'],
      'application/gz': ['.gz'],
      '': ['.gz'],
    },
    onDropRejected: (fileRejections) => {
      showAlert('only .gz files are allowed', 'warning');
      if (subscribeErrors) {
        subscribeErrors(fileRejections);
        showAlert('only .gz files are allowed', 'warning');
      }
    },
    noClick: false,
    noKeyboard: false,
    preventDropOnDocument: true,
  });

  return (
    <Box
      {...getRootProps()}
      className={`${styles.dropzoneWrapper} ${error ? styles.dropzoneWrapperError : ''
        } ${isDragActive ? styles.dropzoneWrapperDragActive : ''}`}
    >
      <input {...getInputProps()} />
      <Box className={styles.dropzoneContent}>
        <CloudUploadIcon
          className={`${styles.cloudUploadIcon} ${error ? styles.cloudUploadIconError : styles.cloudUploadIconPrimary
            }`}
        />
        <Typography
          variant="h6"
          className={error ? styles.textError : styles.textPrimary}
        >
          Drag & Drop or Choose a ZIP File
        </Typography>
        <Typography variant="body2" className={styles.textSecondary}>
          Only .gz files are supported
        </Typography>
        {error && (
          <Typography variant="caption" className={styles.textCaption}>
            Please upload valid .gz files
          </Typography>
        )}
        {files?.length > 0 && (
          <Typography variant="body2" className={styles.fileCountText}>
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ConnectorMultiFileUpload;
