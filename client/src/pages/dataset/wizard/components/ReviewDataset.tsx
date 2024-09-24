import { Box, Grid, Stack, Tab, Tabs, Typography, useTheme } from "@mui/material";
import { useState, useEffect } from "react";
import _, { isEmpty } from 'lodash';
import ReviewWithSummary from "./ReviewSummary";
import ReviewAllCongurations from "./ReviewAllConfigurations";
import AnimateButton from "components/@extended/AnimateButton";
import { StandardWidthButton } from "components/styled/Buttons";
import { publishDataset } from "services/dataset";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { fetchDatasetsThunk } from "store/middlewares";
import { DatasetStatus } from "types/datasets";
import { getMasterDatasets } from "./DataDenormalization";
import { error, success } from "services/toaster";
import { fetchDatasetDiff } from 'services/dataset'
import Loader from "components/Loader";
import AlertDialog from "components/AlertDialog";
import { FormattedMessage } from 'react-intl';
import BackdropLoader from "components/BackdropLoader";

const alertDialogContext = ({ reviewDiff }: Record<string, any>) => {
    return {
        title: <FormattedMessage id="save-dataset-title" />, content: <Grid container><Grid item xs={12}><FormattedMessage id="save-dataset-context" /> </Grid>
            <Grid item xs={12}> {!_.isEmpty(reviewDiff) && <FormattedMessage id="review-dataset-context" />}</Grid>
        </Grid>
    }
}

const ReviewDataset = ({ handleBack, master, datasetState, liveDataset = false }: any) => {
    const [loading, setLoading] = useState(false);
    const [diff, setDiff] = useState<null | Record<string, any>>({});
    const [value, setValue] = useState(0);
    const theme = useTheme();
    const [openDialog, setOpenDialog] = useState<boolean>(false)
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const storeState: any = useSelector((state: any) => state);
    const wizardState: any = useSelector((state: any) => state?.wizard);
    const datasets: any = useSelector((state: any) => _.get(state, 'dataset.data.data') || []);
    const masterDatasets = getMasterDatasets(datasets);
    const datasetId = _.get(wizardState, 'pages.datasetConfiguration.state.config.dataset_id');

    const tabs = [
        {
            index: 0,
            label: "All Configurations",
            component: <ReviewAllCongurations master={master} />,
            disabled: () => false
        },
        {
            index: 1,
            label: "Summary",
            component: <ReviewWithSummary diff={diff} />,
            disabled: () => isEmpty(diff)
        }
    ];

    const handleChange = (event: any, newValue: any) => {
        setValue(newValue);
    };

    const fetchDiff = async () => {
        try {
            setLoading(true)
            const diffResponse = await fetchDatasetDiff(datasetId);
            setDiff(diffResponse);
        }
        catch (err) { }
        finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchDiff();
    }, []);

    const renderTabs = () => {
        return (
            <Tabs variant='standard' value={value} onChange={handleChange} TabIndicatorProps={{ hidden: true }} sx={{ 'background': '#FFFFFF' }}>
                {_.map(tabs, (tab) => {
                    const { label, index, disabled } = tab;
                    if (disabled()) return null;
                    return <Tab key={index} label={label} sx={{
                        border: 'unset', "&.Mui-selected": { backgroundColor: theme.palette.primary.main, color: "white" }
                    }} />
                })}
            </Tabs>
        )
    }

    const renderTabContent = () => {
        return _.get(tabs, [value, 'component'])
    }

    const publish = async () => {
        try {
            setLoading(true);
            await publishDataset(wizardState, storeState, master, masterDatasets);
            dispatch(fetchDatasetsThunk({ data: { filters: { status: [DatasetStatus.Live, DatasetStatus.Retired] } } }));
            dispatch(success({ message: 'Dataset Saved.' }));
            navigate(`/datasets?status=${DatasetStatus.ReadyToPublish}`);
        } catch (err) {
            dispatch(error({ message: 'Save Dataset Failed. Please try again later.' }));
        } finally {
            setLoading(false);
        }
    }

    const gotoPreviousSection = () => {
        handleBack();
    }

    const diffExist = (diff: Record<string, any>) => {
        const { additions = [], deletions = [], modifications = [] } = diff;
        const noModifications = _.size(_.flatten([additions, deletions, modifications])) === 0;
        return noModifications;
    }

    const wizardActions = () => {
        if (liveDataset) return null;
        return <Grid item xs={12}>
            <Stack direction="row" justifyContent="space-between">
                <AnimateButton>
                    <StandardWidthButton
                        variant="outlined"
                        type="button"
                        onClick={gotoPreviousSection}
                    >
                        <Typography variant="h5">Previous</Typography>
                    </StandardWidthButton>
                </AnimateButton>
                <AnimateButton>
                    <StandardWidthButton
                        variant="contained"
                        type="button"
                        disabled={!_.isEmpty(diff) ? diffExist(diff) : false}
                        onClick={() => setOpenDialog(true)}
                    >
                        <Typography variant="h5">Save Dataset</Typography>
                    </StandardWidthButton>

                </AnimateButton>
            </Stack>
        </Grid>
    }

    return <>
        <Grid container spacing={2}>
            {loading && <Loader />}
            <BackdropLoader open={loading} />
            <Grid item xs={12} id="tabSectionStart">
                <Box sx={{ width: '100%' }}>
                    {renderTabs()}
                </Box>
            </Grid>
            <Grid xs={12} marginTop={1} >
                {renderTabContent()}
            </Grid>
            {wizardActions()}
            <AlertDialog open={openDialog} handleClose={() => setOpenDialog(false)} context={alertDialogContext({ reviewDiff: diff })} action={publish}></AlertDialog>
        </Grid>
    </>

}


export default ReviewDataset