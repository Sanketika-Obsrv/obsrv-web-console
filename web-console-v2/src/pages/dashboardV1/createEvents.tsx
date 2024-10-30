/* eslint-disable */
import { QuestionCircleFilled } from '@ant-design/icons';
import { Alert, Grid, Button, Box, Typography, } from '@mui/material';
import MainCard from 'components/MainCard';
import interactIds from 'data/telemetry/interact.json';
import UploadFiles from 'pages/datasetV1/UploadFiles';
import { useState } from 'react';
import { useParams } from 'react-router';
import { datasetRead, sendEvents } from 'services/datasetV1';
import { v4 } from "uuid";
import * as _ from "lodash";
import { GenericCard } from 'components/Styled/Cards';
import FilesPreview from 'components/third-party/dropzone/FilesPreview';
import { readJsonFileContents } from 'services/utils';
import AnimateButton from 'components/@extended/AnimateButton';
import RejectionFiles from 'components/third-party/dropzone/RejectionFiles';
import Loader from 'components/Loader';
import { DatasetStatus } from 'types/datasets';
import { useAlert } from 'contexts/AlertContextProvider';

const DatasetCreateEvents = () => {
    const [data, setData] = useState<any>();
    const [files, setFiles] = useState<any>();
    const [loading, setLoading] = useState(false)
    const params = useParams();
    const [formErrors, setFormErrors] = useState<any>(null);
    const { datasetId } = params;
    const [datasetName, setDatasetName] = useState<string>(`${datasetId}`)
    const { showAlert } = useAlert();


    const dispatchEvents = async (payload: any) => {
        try {
            setLoading(true);
            const response = await sendEvents(datasetId, payload);
            if (!response?.data) throw new Error('');
            showAlert('Events pushed successfully.', 'success');
        } catch (err) {
            showAlert('Failed to push events. Please try again later', 'error')
        } finally {
            onRemoveAll();
            setLoading(false);
        }
    }

    const dispatchEventsInParallel = async (payloads: any) => {
        try {
            setLoading(true);
            const payloadPromises = _.chunk(_.map(payloads, payload => sendEvents(datasetId, payload)), 6)
            const response = await Promise.allSettled(_.flatten(payloadPromises));
            let errorCount = 0;
            let successCount = 0;
            for (const payload of _.flatten(response)) {
                if (payload.status === "fulfilled") successCount++;
                else errorCount++;
            }
            if (successCount !== 0 && errorCount !== 0) showAlert(`Successfully pushed ${successCount} events. Failed to push ${errorCount} events`, 'warning');
            else if (successCount === 0) showAlert('Failed to push events', 'error');
            else showAlert('Events pushed successfully.', 'success');
        } catch (err) {
            showAlert('Failed to push events. Please try again later', 'error')
        } finally {
            onRemoveAll();
            setLoading(false);
        }
    }

    const pushEvents = async () => {
        const datasetConfigurations = await datasetRead({ datasetId })

        if (!datasetConfigurations) {
            showAlert('Invalid Dataset', 'error');
            return
        }

        const configuredBatchKey = _.get(datasetConfigurations, ['extraction_config', 'extraction_key']) || null;
        const configuredBatchId = _.get(datasetConfigurations, ['extraction_config', 'batch_id']) || 'id';
        let payload: any = {};

        if (configuredBatchKey) {
            const batchData = Array.isArray(data) ? data : [data];
            payload = { data: { [configuredBatchId]: v4(), [configuredBatchKey]: batchData } };
            dispatchEvents(payload);
        } else {
            if (Array.isArray(data)) {
                payload = _.map(data, event => ({ data: { id: v4(), event } }));
                await dispatchEventsInParallel(payload);
            } else {
                payload = { data: { id: v4(), event: data } };
                dispatchEvents(payload)
            }
        }
    }

    const flattenContents = (content: Record<string, any> | any) => {
        const flattenedData = _.filter(_.flattenDeep(content), (field: any) => !_.isEmpty(field));
        return flattenedData;
    }

    const onFileRemove = async (file: File | string) => {
        const filteredItems = files && files.filter((_file: any) => _file !== file);
        const contents = await Promise.all(filteredItems.map((file: File) => readJsonFileContents(file)));
        const flattenedContents = flattenContents(contents);
        if (_.size(flattenedContents) === 0) {
            setFiles(filteredItems);
            setData(flattenedContents);
            if (!_.isEmpty(filteredItems)) showAlert('Invalid file contents', 'error');
        } else {
            setFiles(filteredItems);
            setData(flattenedContents);
        }
    };

    const onRemoveAll = () => {
        setFiles(null);
        setData(null);
    };

    return <>
        {loading && <Loader loading={loading} />}
        <MainCard title={`Add Events to Dataset (${_.capitalize(datasetName)})`}>
            <Grid container spacing={1}>
                <Grid item xs={12} sm={12}>
                    <Alert color="info" icon={<QuestionCircleFilled />}>
                        Submit your events to the Datasource by uploading a JSON file or editing JSON data.
                    </Alert>
                </Grid>
                <Grid item xs={12} sm={12}>
                    <UploadFiles data={data} setData={setData} files={files} setFiles={setFiles} subscribeErrors={setFormErrors} />
                </Grid>
            </Grid>
        </MainCard >
        {files && _.size(files) > 0 &&
            <GenericCard elevation={1}>
                <Box display="flex" justifyContent="space-between">
                    <Typography variant="h5" gutterBottom>Files Uploaded</Typography>
                    <Button onClick={onRemoveAll}>Remove all</Button>
                </Box>
                <FilesPreview files={files} showList={false} onRemove={onFileRemove} />
            </GenericCard>
        }
        {formErrors?.length > 0 && <RejectionFiles fileRejections={formErrors} />}
        <Box display="flex" justifyContent="flex-end">
            <AnimateButton>
                <Button
                    data-edataid={`${interactIds.create_events}${params.datasetName}`}
                    data-objectid={params.datasetId}
                    data-objecttype="dataset"
                    disabled={_.isEmpty(data) ? true : loading}
                    variant="contained"
                    sx={{ my: 2, ml: 1 }}
                    onClick={(e: any) => pushEvents()}
                >
                    Send Events
                </Button>
            </AnimateButton>
        </Box>
    </>
};

export default DatasetCreateEvents;
