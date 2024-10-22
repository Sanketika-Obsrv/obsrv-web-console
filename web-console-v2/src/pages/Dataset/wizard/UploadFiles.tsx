import React from 'react';
import { Grid, Stack } from '@mui/material';
import { useFormik } from 'formik';
import UploadMultiFile from 'components/Dropzone/MultiFile';

import * as _ from 'lodash';
import Box from '@mui/material/Box';
import { readJsonFileContents } from 'services/utils';
import { useAlert } from 'contexts/AlertContextProvider';

const UploadFiles = ({
    data,
    setData,
    files,
    setFiles,
    maxFileSize,
    allowSchema = false,
    subscribeErrors = null,
    generateInteractTelemetry,
    isMultiple = true,
    datasetImport = false
}: any) => {
    const form: any = useFormik({
        initialValues: { files },
        onSubmit: (values: any) => {
            return values;
        },
        enableReinitialize: true
    });
    const { showAlert } = useAlert();

    const flattenContents = (content: Record<string, any> | any) => {
        const flattenedData = _.filter(_.flattenDeep(content), (field: any) => !_.isEmpty(field));
        return flattenedData;
    };

    const onUpload = async (files: any) => {
        try {
            const contents = await Promise.all(
                files.map((file: File) => readJsonFileContents(file))
            );
            const flattenedContents = flattenContents(contents);
            if (_.size(flattenedContents) === 0) throw new Error('Invalid file content');
            setData(flattenedContents);
            setFiles(files);
            showAlert('Files uploaded', 'success');
        } catch (err: any) {
            err?.message && showAlert(err?.message, 'error');
            typeof err === 'string' && showAlert(err, 'error');
            setFiles(null);
            form.setFieldValue('files', null);
            setData(null);
        }
    };

    const onFileRemove = (files: any) => {
        setFiles(files);
    };

    return (
        <Box
            sx={{
                margin: '0.125rem 2.9375rem 210px 1.0625rem'
            }}
        >
            <Grid container spacing={1}>
                <Grid item xs={12}>
                    <form onSubmit={form.handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Stack spacing={1.5} alignItems="center">
                                    <UploadMultiFile
                                        showList={false}
                                        setFieldValue={form.setFieldValue}
                                        files={form.values.files}
                                        error={form.touched.files && !!form.errors.files}
                                        onUpload={onUpload}
                                        onFileRemove={onFileRemove}
                                        maxFileSize={maxFileSize}
                                        subscribeErrors={subscribeErrors}
                                        isMultiple={isMultiple}
                                    />
                                </Stack>
                            </Grid>
                        </Grid>
                    </form>
                </Grid>
            </Grid>
        </Box>
    );
};

export default UploadFiles;
