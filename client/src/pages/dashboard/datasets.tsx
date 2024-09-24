import { useEffect, useState } from 'react';
import { Alert, Box, Grid, Stack, Tab, Tooltip, Typography, useTheme } from '@mui/material';
import * as _ from 'lodash';
import DatasetsList from './datasetsList';
import DraftDatasetsList from './draftDatasetsList';
import useImpression from 'hooks/useImpression';
import pageIds from 'data/telemetry/pageIds';
import RetiredDatasets from './RetiredDatasets';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router';
import { DatasetStatus } from 'types/datasets';
import { ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ReadyToPublishDatasetsList from './ReadyToPublishDatasets';
import { FormattedMessage } from 'react-intl';
import { useSearchParams } from 'react-router-dom';
import { fetchDraftSourceConfig, fetchLiveSourceConfig } from 'services/dataset';


export const getLiveSourceConfig: any = (liveDataset: any, liveSourceConfigs: any) => {
    const condition = (config: any) => {
        return (_.get(liveDataset, 'dataset_id') === _.get(config, 'dataset_id')) && (_.get(liveDataset, 'status') === _.get(config, 'status'));
    }
    _.map(liveSourceConfigs, (config: any) => {
        const existingConnectors = _.get(liveDataset, 'sources') || [];
        if (condition(config))
            _.set(liveDataset, 'sources', _.map([_.get(config, 'connector_type'), ...existingConnectors,], _.toUpper));
    });
    _.set(liveDataset, 'sources', ['API', ..._.uniq(_.get(liveDataset, 'sources') || [])]);
    return liveDataset;
}

export const getDraftSourceConfig: any = (draftDataset: any, draftSourceConfigs: any) => {
    if (!draftDataset?.sources) {
        _.set(draftDataset, "sources", ["API"])
        _.forEach(draftSourceConfigs, config => {
            if (draftDataset?.id === config?.dataset_id) {
                const datasetSource = draftDataset?.sources;
                _.uniq(datasetSource.push(_.toUpper(config?.connector_type)))
                _.set(draftDataset, "sources", datasetSource)
            }
        })
    }
    return draftDataset;
}

const showNoDatasetsError = (message = <FormattedMessage id="datasets-not-found" />) => <Alert severity='error' sx={{ lineHeight: 0, mt: 2 }}><Typography variant="caption" fontSize={14}>{message}</Typography></Alert>
export const renderNoDatasetsMessage = (message: string | any) => <Grid item xs={12}>{showNoDatasetsError(message)}</Grid>

const ClusterHealth = () => {
    const theme = useTheme();
    const [params] = useSearchParams();
    const datasetStatus: string = params.get("status") || DatasetStatus.Live
    const navigate = useNavigate();
    useImpression({ type: "list", pageid: _.get(pageIds, 'dataset.list') });
    const [datasetType, setDatasetType] = useState(datasetStatus);
    const [liveSourceConfigs, setLiveSourceConfigs] = useState([])
    const [draftSourceConfigs, setDraftSourceConfigs] = useState([])

    const handleTabChange = (event: any, newValue: any) => {
        setDatasetType(newValue);
        navigate(`?status=${newValue}`)
    }

    const getSourceConfigs = async () => {
        try {
            const liveConfigs: any = await fetchLiveSourceConfig();
            const draftConfigs: any = await fetchDraftSourceConfig();
            setDraftSourceConfigs(draftConfigs)
            setLiveSourceConfigs(liveConfigs)
        } catch (err: any) {
            console.log(err);
        }
    }

    useEffect(() => {
        getSourceConfigs();
    }, [])

    const renderDatasets = (status: string) => {
        switch (status) {
            case DatasetStatus.Live: return <Grid item xs={12}>
                <DatasetsList sourceConfigs={liveSourceConfigs} setDatasetType={setDatasetType} />
            </Grid>

            case DatasetStatus.ReadyToPublish: return <Grid item xs={12}>
                <ReadyToPublishDatasetsList sourceConfigs={draftSourceConfigs} setDatasetType={setDatasetType} />
            </Grid>

            case DatasetStatus.Draft: return <Grid item xs={12}>
                <DraftDatasetsList sourceConfigs={draftSourceConfigs} />
            </Grid>

            case DatasetStatus.Retired: return <Grid item xs={12}>
                <RetiredDatasets sourceConfigs={draftSourceConfigs}/>
            </Grid>

            default: return renderNoDatasetsMessage("No Datasets");
        }
    }


    const datasetsTab = [
        { id: DatasetStatus.Live, label: <FormattedMessage id="dataset-live-header" />, color: "success", tooltip: <FormattedMessage id="dataset-live-tooltip" /> },
        { id: DatasetStatus.ReadyToPublish, label: <FormattedMessage id="dataset-publish-header" />, color: "info", tooltip: <FormattedMessage id="dataset-publish-tooltip" /> },
        { id: DatasetStatus.Draft, label: <FormattedMessage id="dataset-draft-header" />, color: "warning", tooltip: <FormattedMessage id="dataset-draft-tooltip" /> },
        { id: DatasetStatus.Retired, label: <FormattedMessage id="dataset-retired-header" />, color: "secondary", tooltip: <FormattedMessage id="dataset-retired-tooltip" /> },
        { id: DatasetStatus.Purged, label: <FormattedMessage id="dataset-purged-header" />, color: "error", tooltip: <FormattedMessage id="dataset-purged-tooltip" /> }
    ]

    const actions = [{
        id: "import",
        label: <FormattedMessage id="dataset-actions-import" />,
        icon: <ImportOutlined />,
        onClick: () => { navigate("/datasets/import") },
        disabled: false
    }, {
        id: "add-dataset",
        label: <FormattedMessage id="dataset-actions-add-dataset" />,
        onClick: () => navigate('/dataset/new'),
        icon: <PlusOutlined />,
        disabled: false
    }, {
        id: "add-master-dataset",
        label: <FormattedMessage id="dataset-actions-add-master-dataset" />,
        onClick: () => navigate('/dataset/new/master?master=true'),
        icon: <PlusOutlined />,
        disabled: false
    }]

    const renderDatasetTables = () => {
        return <>
            <TabPanel sx={{ p: 0 }} value={DatasetStatus.Live}>{renderDatasets(DatasetStatus.Live)}</TabPanel>
            <TabPanel sx={{ p: 0 }} value={DatasetStatus.ReadyToPublish}>{renderDatasets(DatasetStatus.ReadyToPublish)}</TabPanel>
            <TabPanel sx={{ p: 0 }} value={DatasetStatus.Draft}>{renderDatasets(DatasetStatus.Draft)}</TabPanel>
            <TabPanel sx={{ p: 0 }} value={DatasetStatus.Retired}>{renderDatasets(DatasetStatus.Retired)}</TabPanel>
            <TabPanel sx={{ p: 0 }} value={DatasetStatus.Purged}>{renderDatasets(DatasetStatus.Purged)}</TabPanel>
        </>
    }

    const renderDatasetActions = (action: Record<string, any>) => {
        const { id, label, onClick, disabled, icon } = action;
        return <Button key={id}
            startIcon={icon}
            size="medium" type="button" disabled={disabled} onClick={onClick}
            sx={{ mx: 1 }} variant="contained"><Typography variant='body1'>{label}</Typography>
        </Button>
    }

    const renderDatasetTableHeaders = (field: Record<string, any>) => {
        const { id, label, color, tooltip } = field;
        return <Tab sx=
            {{
                border: 0,
                "&.Mui-selected": {
                    backgroundColor: theme.palette.primary.main,
                    color: "white"
                }
            }}
            label={<Tooltip title={tooltip}>
                <Box alignItems={"center"} display={"flex"}>
                    <FiberManualRecordIcon color={color as any} sx={{ fontSize: '1.25rem', mr: 1 }} />
                    <Typography variant='body1' fontWeight={500}>{label}</Typography>
                </Box>
            </Tooltip>} value={id} />
    }

    const renderDatasetTabs = () => {
        return <TabContext value={datasetType}>
            <Box>
                <Box sx={{ background: '#FFFFFF', borderColor: "#f1f1f1" }}>
                    <Stack direction={"row"} alignItems={"center"} justifyContent={"space-between"}>
                        <TabList variant='standard' onChange={handleTabChange} TabIndicatorProps={{ hidden: true }}>
                            {_.map(datasetsTab, renderDatasetTableHeaders)}
                        </TabList>
                        <Grid>
                            {_.map(actions, renderDatasetActions)}
                        </Grid>
                    </Stack>
                </Box>
                <Box marginTop={1}>
                    {renderDatasetTables()}
                </Box>
            </Box>
        </TabContext >
    }

    return (
        <>
            {renderDatasetTabs()}
        </>
    )
};

export default ClusterHealth;
