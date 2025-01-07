import React, { useState, useCallback } from 'react';
import { Grid, Stack } from '@mui/material';
import { useFormik } from 'formik';
import * as _ from 'lodash';
import Box from '@mui/material/Box';
import { useAlert } from 'contexts/AlertContextProvider';

import ConnectorFilesPreview from './ConnectorFilesPreview';
import { DropzopType } from 'types/dropzone';
import ConnectorMultiFileUpload from './ConnectorUploadMultiFile';

interface FileEntry {
  name: string;
  content: string;
  path: string;
  size: number;
}

interface ConnectorFileUploadProps {
  data: FileEntry[] | null;
  setData: (data: FileEntry[] | null) => void;
  files: File[] | null;
  setFiles: (files: File[] | null) => void;
  subscribeErrors?: any;
  generateInteractTelemetry?: () => void;
  isMultiple?: boolean;
  datasetImport?: boolean;
}

const ConnectorFileUpload: React.FC<ConnectorFileUploadProps> = ({
  data,
  setData,
  files,
  setFiles,
  subscribeErrors = null,
  generateInteractTelemetry,
  isMultiple = false,
  datasetImport = false,
}) => {
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const { showAlert } = useAlert();

  const form = useFormik({
    initialValues: { files: [] },
    onSubmit: (values) => {
      console.log('Form submitted with values:', values);
    },
    enableReinitialize: true,
  });

  const onUpload = useCallback(
    async (uploadedFiles: File[]) => {
      try {
        console.log('Received files in onUpload:', uploadedFiles);

        if (!uploadedFiles || uploadedFiles.length === 0) {
          console.log('No files received');
          return;
        }

        // Validate file types
        const isValidFile = uploadedFiles.every((file) =>
          file.name.toLowerCase().endsWith('.gz'),
        );

        if (!isValidFile) {
          showAlert('Only .gz files are allowed', 'error');
          return;
        }

        // Update all state at once
        setPreviewFiles(uploadedFiles);
        setFiles(uploadedFiles);
        form.setFieldValue('files', uploadedFiles);

        // Create and set FileEntry objects
        const fileEntries: FileEntry[] = uploadedFiles.map((file) => ({
          name: file.name,
          content: '',
          path: file.name,
          size: file.size,
        }));
        setData(fileEntries);

        showAlert('File uploaded successfully', 'success');
        console.log('States updated with files:', uploadedFiles);
      } catch (err: any) {
        console.error('Upload error:', err);
        const errorMessage = err?.message || 'Error uploading file';
        showAlert(errorMessage, 'warning');
        // Reset all states on error
        setPreviewFiles([]);
        setFiles(null);
        form.setFieldValue('files', []);
        setData(null);
      }
    },
    [setFiles, setData, form.setFieldValue, showAlert],
  );

  const onFileRemove = useCallback(
    (fileToRemove: string | File) => {
      const fileName =
        typeof fileToRemove === 'string' ? fileToRemove : fileToRemove.name;
      console.log('Removing file:', fileName);

      setPreviewFiles((prev) => {
        const updated = prev.filter((file) => file.name !== fileName);
        console.log('Updated preview files:', updated);
        return updated;
      });

      if (files) {
        const updatedFiles = files.filter((file) => file.name !== fileName);
        setFiles(updatedFiles.length > 0 ? updatedFiles : null);

        if (updatedFiles.length > 0) {
          const fileEntries: FileEntry[] = updatedFiles.map((file) => ({
            name: file.name,
            content: '',
            path: file.name,
            size: file.size,
          }));
          setData(fileEntries);
        } else {
          setData(null);
        }
      }

      form.setFieldValue('files', []);
    },
    [files, setFiles, setData, form.setFieldValue],
  );

  return (
    <Box sx={{ margin: '0.125rem 1rem 0px 1rem' }}>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <form onSubmit={form.handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Stack spacing={1.5}>
                  <ConnectorMultiFileUpload
                    setFieldValue={form.setFieldValue}
                    files={previewFiles}
                    error={form.touched.files && !!form.errors.files}
                    onUpload={onUpload}
                    onFileRemove={onFileRemove}
                    subscribeErrors={subscribeErrors}
                    isMultiple={isMultiple}
                  />
                </Stack>
              </Grid>
              <Grid item xs={12}>
                {previewFiles.length > 0 && (
                  <ConnectorFilesPreview
                    files={previewFiles}
                    onRemove={onFileRemove}
                    showList={true}
                    type={DropzopType.standard}
                  />
                )}
              </Grid>
            </Grid>
          </form>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ConnectorFileUpload;
