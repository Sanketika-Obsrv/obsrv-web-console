import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FC, ReactElement, useState, useEffect } from 'react';
import { Box, Button, Stack, Tab, Tabs } from '@mui/material';
import AllConfigurations from './AllConfigurations';
import _, { get, map } from 'lodash';
import PreviewSummary from './PreviewSummary';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import styles from './Preview.module.css';
import Actions from 'components/ActionButtons/Actions';
import { useFetchDatasetsById, usePublishDataset, useDatasetList } from 'services/dataset';
import AlertDialog from 'components/AlertDialog/AlertDialog';
import en from 'utils/locales/en.json';
import Loader from 'components/Loader';
import Retry from 'components/Retry/Retry';

const Preview: FC = (): ReactElement<any> => {
    const navigate = useNavigate();
    const { datasetId }: any = useParams();
    const { search, state } = useLocation();
    const [selectedTab, setSelectedTab] = useState(0);
    const [open, setOpen] = useState<boolean>(false);

    const publishDataset = usePublishDataset();

    const urlToPublish = `/datasets?status=ReadyToPublish`;

    const fetchDatasetById = useFetchDatasetsById({
        datasetId,
        queryParams: 'mode=edit&fields=status,dataset_id'
    });

    const { data: liveDatasets } = useDatasetList({ status: ['Live'] });
    const isInLive = _.some(liveDatasets?.data, { dataset_id: datasetId });

    const dialogContext = {
        title: en['save-dataset-title'],
        content: en['save-dataset-context']
    };

    const tabData = isInLive ? ['All Configurations', 'Summary of changes'] : ['All Configurations'];

    const renderContent = (selectedTab: number) => {
        switch (selectedTab) {
            case 0:
                return <AllConfigurations />;
            case 1:
                return isInLive ? <PreviewSummary /> : null;
            default:
                return null;
        }
    };

    useEffect(() => {
        const tabIndex = Number(get(state, 'tab', 0));

        setSelectedTab(tabIndex);
    }, [search, state]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setSelectedTab(newValue);
    };

    const handleButtonClick = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleAction = () => {
        const payload = {
            dataset_id: datasetId,
            status: 'ReadyToPublish'
        };

        if (_.get(fetchDatasetById, ['data', 'status'], '') === 'Draft') {
            publishDataset.mutate(
                { payload },
                {
                    onSuccess: () => {
                        navigate(urlToPublish)
                    }
                }
            );
        } else {
            navigate(urlToPublish);
        }
        setOpen(false);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {
                publishDataset.isPending ? (
                    <Loader loading={publishDataset.isPending} descriptionText="Please wait while we process your request." />
                ) : (
                    publishDataset.isError ? (
                        <Retry
                            buttonLabel="Retry"
                            onButtonClick={() => navigate(0)}
                            description="Something went wrong."
                        />
                    ) : (
                        <>
                            <Stack
                                flex={1}
                                mx={3.5}
                                overflow="auto"
                                paddingBottom="8rem"
                            >
                                <Box sx={{ml: '5px', mt: '2px'}}>
                                    <Button
                                        variant="back"
                                        className={styles.button}
                                        onClick={() => navigate(`/dataset/edit/storage/${datasetId}`)}
                                        startIcon={
                                            <KeyboardBackspaceIcon
                                                sx={{ color: 'black', width: '24px', height: '24px' }}
                                            />
                                        }
                                    >
                                        Back
                                    </Button>
                                </Box>
                                <Box>
                                    <Tabs
                                        value={selectedTab}
                                        onChange={handleTabChange}
                                        sx={{
                                            borderBottom: '1px solid #eee',
                                            backgroundColor: 'white',
                                            borderRadius: '1.25rem 1.25rem 0rem 0rem',
                                            '& .MuiTabs-indicator': {
                                                top: 0,
                                                height: '0.1875rem',
                                                width: '2.75rem !important',
                                                color: '#056ECE',
                                                marginLeft: '5.2rem'
                                            }
                                        }}
                                    >
                                        {map(tabData, (item, index) => (
                                            <Tab
                                                key={index}
                                                sx={{
                                                    backgroundColor: 'transparent',
                                                    width: 'auto',
                                                    color: '#111111',
                                                    padding: '20px',
                                                    fontSize: '16px',
                                                    '&.Mui-selected': { color: '#056ECE' }
                                                }}
                                                label={item}
                                            />
                                        ))}
                                    </Tabs>

                                    <Stack sx={{ background: 'white' }} height="90%">
                                        {renderContent(selectedTab)}
                                    </Stack>
                                </Box>
                                <AlertDialog
                                    open={open}
                                    handleClose={handleClose}
                                    action={handleAction}
                                    context={dialogContext}
                                />
                            </Stack>

                            <Box
                                className={`${styles.actionContainer}`}
                                sx={{
                                    position: 'fixed',
                                    bottom: 0,
                                    right: 0,
                                    left: 0,
                                    width: '100%'
                                }}
                            >
                                <Actions
                                    buttons={[
                                        {
                                            id: 'btn1',
                                            label: 'Save Dataset',
                                            variant: 'contained',
                                            color: 'primary'
                                        }
                                    ]}
                                    onClick={handleButtonClick}
                                />
                            </Box>
                        </>
                    )
                )
            }

        </Box>
    );
};

export default Preview;
