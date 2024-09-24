import { useState } from 'react';
import { Grid, Stack } from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import UploadMultiFile from 'components/third-party/dropzone/MultiFile';
import { useDispatch } from 'react-redux';
import * as _ from 'lodash';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import PasteData from './PasteData';
import { readJsonFileContents } from 'services/utils';
import { error, success } from 'services/toaster';
import interactIds from 'data/telemetry/interact.json';
import Loader from 'components/Loader';

const tabProps = (index: number) => ({ id: `tab-${index}`, 'aria-controls': `tabpanel-${index}` });

export function TabPanel(props: any) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box py={3}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const UploadFiles = ({ data, setData, files, setFiles, maxFileSize, allowSchema = false, subscribeErrors = null, generateInteractTelemetry, isMultiple = true, datasetImport = false, setNewFile }: any) => {
    const dispatch = useDispatch();
    const [tabIndex, setTabIndex] = useState(0);
    const [loading, setLoading] = useState(false)

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {

        switch (newValue) {
            case 0: {
                generateInteractTelemetry && generateInteractTelemetry({ edata: { id: interactIds.upload_sample_file } })
                break;
            }
            case 1: {
                generateInteractTelemetry && generateInteractTelemetry({ edata: { id: interactIds.editor_schema } })
                break;
            }
        }

        setTabIndex(newValue);
    };

    const form: any = useFormik({
        initialValues: { files },
        onSubmit: (values: any) => { },
        validationSchema: yup.object().shape({
            files: yup.mixed().required('File is a required.')
        }),
        enableReinitialize: true,
    });

    const flattenContents = (content: Record<string, any> | any) => {
        const flattenedData = _.filter(_.flattenDeep(content), (field: any) => !_.isEmpty(field));
        return flattenedData;
    }

    const onUpload = async (files: any) => {
        setLoading(true)
        try {
            datasetImport && setNewFile(false)
            const contents = await Promise.all(files.map((file: File) => readJsonFileContents(file)));
            const flattenedContents = flattenContents(contents);
            if (_.size(flattenedContents) === 0) throw new Error("Invalid file content");
            setData(flattenedContents);
            setFiles(files);
            dispatch(success({ message: 'Files uploaded.' }))
        } catch (err: any) {
            err?.message && dispatch(error({ message: err?.message }));
            (typeof err === 'string') && dispatch(error({ message: err }));
            setFiles(null);
            form.setFieldValue("files", null);
            setData(null);
        } finally {
            setLoading(false)
        }
    }

    const onDataPaste = (event: any) => {
        const jsObject = _.isArray(event) ? event : [event] || {};
        const flattenedData = flattenContents(jsObject);
        if (jsObject && _.isEmpty(flattenedData)) {
            dispatch(error({ message: "Paste valid JSON Data/Schema" }))
            setData()
            return;
        }
        setData(jsObject);
    }

    const onFileRemove = (files: any) => {
        setFiles(files);
    }

    return (
        <>
            {loading && <Loader />}
            <Grid container spacing={1}>
                <Grid item xs={12}>
                    <Box sx={{ width: '100%' }}>
                        {!datasetImport &&
                            <Tabs value={tabIndex} onChange={handleTabChange} variant="fullWidth">
                                <Tab
                                    label={allowSchema ? "Upload JSON Data/Schema" : "Upload JSON Data"}
                                    {...tabProps(0)} />
                                <Tab
                                    label={allowSchema ? "Paste/Edit JSON Data/Schema" : "Paste/Edit JSON Data"}
                                    {...tabProps(1)} />
                            </Tabs>
                        }
                        <TabPanel value={tabIndex} index={0}>
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
                        </TabPanel>
                        <TabPanel value={tabIndex} index={1}>
                            <PasteData initialData={data} onChange={onDataPaste}></PasteData>
                            <Stack direction="row" justifyContent="center"
                                alignItems="center" spacing={1.5} sx={{ mt: 1.5 }}>
                            </Stack>
                        </TabPanel>
                    </Box>
                </Grid>
            </Grid>
        </>
    );
};

export default UploadFiles;
