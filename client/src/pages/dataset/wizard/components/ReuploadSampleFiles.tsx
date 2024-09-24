import { UploadOutlined } from "@ant-design/icons";
import { Box, Dialog, DialogActions, DialogContent, Grid, Typography, DialogTitle } from "@mui/material";
import { Button } from "@mui/material";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import _ from 'lodash';
import FilesPreview from 'components/third-party/dropzone/FilesPreview';
import { error } from "services/toaster";
import { getUploadUrls, resetDatasetState, saveDatasetIntermediateState, uploadToUrl } from "services/dataset";
import { readJsonFileContents } from "services/utils";
import { IWizard } from "types/formWizard";
import { fetchJsonSchema } from "services/json-schema";
import { addState, reset, setMetadata, updateState } from "store/reducers/wizard";
import AlertDialog from "components/AlertDialog";
import UploadFiles from "../UploadFiles";
import { GenericCard } from "components/styled/Cards";
import Loader from "components/Loader";

const alertDialogContext = {
    title: 'Re Upload Sample Files ?',
    content: <>
        <Box sx={{ display: "flex", flexDirection: 'column', bgcolor: "secondary.100", padding: '0.5rem' }}>
            <p><strong>Please be advised that reupload of sample files will result in the following changes:</strong></p>
            <ul>
                <li><strong>Loss of Previous Changes:</strong> Any previously saved changes will be permanently lost. It will be necessary to update the configuration once again.</li>
            </ul>
        </Box>
    </>
};

export const pageMeta = { pageId: 'sample_data' };

const ReUploadSampleFiles = (props: any) => {
    const { resetColumns, setUploadLoading } = props;
    const maxFileSizeConfig: number = useSelector((state: any) => state?.config?.maxFileSize || 5242880)
    const dispatch = useDispatch();
    const wizardState: IWizard = useSelector((state: any) => state?.wizard);
    const [openConfirmationDialog, toggleConfirmationDialog] = useState(false);
    const [openFileUploader, toggleFileUploader] = useState(false);
    const [data, setData] = useState<any>();
    const [files, setFiles] = useState<any>();
    const [loading, setLoading] = useState<boolean>(false)

    const flattenContents = (content: Record<string, any> | any) => {
        const flattenedData = _.filter(_.flattenDeep(content), (field: any) => !_.isEmpty(field));
        return flattenedData;
    }

    const handleDialogAction = () => {
        toggleFileUploader(true);
    }

    const uploadFiles = async (files: any) => {
        try {
            const uploadUrl = await getUploadUrls(files);
            if (uploadUrl.data && uploadUrl.data?.result) {
                await Promise.all(
                    _.map(_.get(uploadUrl, 'data.result'), (item, index) => uploadToUrl(item.preSignedUrl, files[index]).catch(console.log))
                )
            }
        } catch (err) {
            // throw err;
        }
    };

    const generateJSONSchema = async (data: Array<any>, config: Record<string, any>) => {
        const dataset = _.get(config, 'name');
        const payload = Array.isArray(data) ? data : [data]
        try {
            const response = await fetchJsonSchema({ data: payload, config: { dataset } });
            dispatch(addState({ id: "jsonSchema", ...response }));
            return response;
        } catch (err) {
            dispatch(error({ message: "Failed to Upload Data" }));
            throw err;
        }
    };

    const onUpload = async (data: any[]) => {
        try {
            await resetDatasetState();
            const config = _.get(wizardState, ['pages', 'datasetConfiguration', 'state', 'config']) || {};
            const datasetConfiguration = _.get(wizardState, ['pages', 'datasetConfiguration', 'state',]) || {};
            try {
                await uploadFiles(files);
                const dataSchema: any = await generateJSONSchema(data, config);
                dispatch(addState({ id: 'datasetConfiguration', state: { ...datasetConfiguration, files: files, } }));
                dispatch(reset({ preserve: ['datasetConfiguration', 'jsonSchema'] }));
                let mergedEvent = {}
                _.map(data, (item: any) => {
                    mergedEvent = _.merge(mergedEvent, item)
                });
                dispatch(updateState({ id: pageMeta.pageId, ...mergedEvent }));
                dispatch(updateState({ id: pageMeta.pageId, suggestedPii: [] }));
                saveDatasetIntermediateState({});
                resetColumns(_.get(dataSchema, 'schema'), true);
            } catch (err) {
                dispatch(error({ message: "Failed to upload schema" }));
            }
        } catch (err: any) {
            err?.message && dispatch(error({ message: err?.message }));
            (typeof err === 'string') && dispatch(error({ message: err }));
        }
    }

    const renderUploadButton = () => {
        return <Button onClick={_ => toggleConfirmationDialog(true)} size="large" sx={{ fontSize: '1.25rem' }} startIcon={<UploadOutlined style={{ fontSize: '1.25rem' }} />}>
            <Typography ml={1} variant="body2" color="text.primary">Upload</Typography>
        </Button>
    }

    const onSubmission = async () => {
        setLoading(true)
        try {
            await onUpload(data);
        } catch (err) {
            dispatch(error({ message: "Failed to upload data" }));
        } finally {
            resetState();
            setLoading(false)
        }
    }

    const onFileRemove = async (file: File | string) => {
        const filteredItems = files && files.filter((_file: any) => _file !== file);
        const contents = await Promise.all(filteredItems.map((file: File) => readJsonFileContents(file)));
        const flattenedContents = flattenContents(contents);
        if (_.size(flattenedContents) === 0) {
            setFiles(filteredItems);
            setData(flattenedContents);
            if (!_.isEmpty(filteredItems)) dispatch(error({ message: 'Invalid file contents' }));
        } else {
            setFiles(filteredItems);
            setData(flattenedContents);
        }
    };

    const onRemoveAll = () => {
        setFiles(null);
        setData(null);
    };

    const resetState = () => {
        setUploadLoading(false);
        toggleFileUploader(false);
        setData(null);
        setFiles(null);
    }

    const renderUploadDialog = () => {
        return <>
            <Dialog fullWidth={true} open={openFileUploader} onClose={() => resetState()}>
                <Box>
                    <DialogTitle>Upload Data/Schema</DialogTitle>
                    <DialogContent>
                        <UploadFiles
                            data={data}
                            setData={setData}
                            files={files}
                            setFiles={setFiles}
                            maxFileSize={maxFileSizeConfig}
                            allowSchema={true}
                        />
                        {files && _.size(files) > 0 &&
                            <GenericCard elevation={0}>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="h5" gutterBottom>Files Uploaded</Typography>
                                    <Button onClick={onRemoveAll}>Remove all</Button>
                                </Box>
                                <FilesPreview files={files} showList={false} onRemove={onFileRemove} />
                            </GenericCard>
                        }
                    </DialogContent>
                    <DialogActions>
                        <Button color="error" disabled={loading} onClick={(e) => resetState()}>
                            Cancel
                        </Button>
                        <Button variant="contained" disabled={loading} onClick={_ => onSubmission()} autoFocus>
                            Submit
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </>
    }

    const renderConfirmationDialog = () => {
        return <AlertDialog open={openConfirmationDialog} action={handleDialogAction} handleClose={() => toggleConfirmationDialog(false)} context={alertDialogContext} />
    }

    return <>
        {loading && <Loader />}
        {renderUploadButton()}
        {renderConfirmationDialog()}
        {renderUploadDialog()}
    </>
}

export default ReUploadSampleFiles