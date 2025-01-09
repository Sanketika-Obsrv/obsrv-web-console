import React, { useState, MouseEvent, useMemo } from 'react';
import { Dataset } from 'types/dataset';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Box, Grid, IconButton, LinearProgress, LinearProgressProps, Menu, MenuItem, Typography } from '@mui/material';
import _ from 'lodash';
import styles from './DatasetlistCard.module.css';
import { theme } from 'theme';
import DraftStatusCheckboxes from './DraftStatusChecboxes';
import { DatasetType } from 'types/datasets';
import { useDruidDatasource, useEventsFailedToday, useTotalEvents, useTotalEventsToday, useTotalEventsYesterday } from 'services/dataset';
import prettyBytes from 'pretty-bytes';

export interface DatasetlistCardProps {
    dataset: Dataset;
    draftDatasetConfigStatus: {
        isIngestionFilled: boolean;
        isProcessingFilled: boolean;
        isStorageFilled: boolean;
        progress: number;
        isConnectorFilled: boolean;
    };
    actions: (status: string) => Action[];
    onMenuAction: (
        event: React.MouseEvent<HTMLElement>,
        datasetId: string,
        actionType: string,
    ) => void;
}

interface Action {
    label: string;
    icon: React.ElementType;
    type: string;
}

const DatasetlistCard: React.FC<DatasetlistCardProps> = ({
    dataset,
    draftDatasetConfigStatus,
    actions,
    onMenuAction,
}) => {
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
    const { data: druidData } = useDruidDatasource();
    const datasetSize = druidData?.[dataset.dataset_id] || 0;

    const isMasterDataset = dataset.type === DatasetType.MasterDataset;

    const { data: totalEventsData } = useTotalEvents(dataset.dataset_id, isMasterDataset);
    const { data: totalEventsTodayData } = useTotalEventsToday(dataset.dataset_id, isMasterDataset);
    const { data: totalEventsYesterdayData } = useTotalEventsYesterday(dataset.dataset_id, isMasterDataset);
    const { data: eventsFailedTodayData } = useEventsFailedToday(dataset.dataset_id, isMasterDataset);

    const getEventCount = (data: any) => {
        return _.isArray(data) ? _.first(data) || '0' : data || '0';
    }

    const eventCounts = {
        totalEvents: getEventCount(totalEventsData),
        totalEventsToday: getEventCount(totalEventsTodayData),
        totalEventsYesterday: getEventCount(totalEventsYesterdayData),
        eventsFailedToday: getEventCount(eventsFailedTodayData),
    };

    const handleMenuClick = (
        event: MouseEvent<HTMLElement>,
        datasetId: string,
    ) => {
        setMenuAnchor(event.currentTarget);
        setSelectedDataset(datasetId);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
        setSelectedDataset(null);
    };

    const handleMenuAction = (actionType: string) => {
        if (selectedDataset) {
            onMenuAction(
                { currentTarget: menuAnchor } as MouseEvent<HTMLElement>,
                selectedDataset,
                actionType,
            );
            handleMenuClose();
        }
    };

    const olap_store_enabled = _.get(dataset, ["dataset_config", "indexing_config", "olap_store_enabled"])
    const filteredActions = useMemo(() => {
        const allActions = actions(
            (dataset.status && dataset.connector && dataset.tag) || ''
        );
        return olap_store_enabled ? allActions : _.filter(allActions, action => action.type !== "Rollup");
    }, [actions, dataset.status, dataset.connector, dataset.tag, olap_store_enabled]);

    const fieldsToDisplay = useMemo(() => ({
        name: 'Name',
        status: 'Status'
    }), []);

    const eventFields = useMemo(() => [
        { label: 'Total Events (Today)', value: eventCounts.totalEventsToday },
        { label: 'Total Events (Yesterday)', value: eventCounts.totalEventsYesterday },
        { label: 'Events Failed (Today)', value: eventCounts.eventsFailedToday }
    ], [eventCounts]);

    const getStatusLabel = useMemo(() => {
        const statusMap = {
            Live: 'LIVE-Running',
            Draft: 'Draft',
            ReadyToPublish: 'Ready To Publish',
            Retired: 'Retired'
        };
        return (status: string) => statusMap[status as keyof typeof statusMap] || status;
    }, []);

    const LinearProgressWithLabel = useMemo(() => {
        const Component: React.FC<LinearProgressProps & { value: number }> = (props) => (
            <Box className={styles.progressRoot}>
                <Box className={styles.progressBar}>
                    <LinearProgress
                        variant="determinate"
                        {...props}
                        sx={{
                            backgroundColor: theme.palette.grey[200],
                            '& .MuiLinearProgress-bar': {
                                backgroundColor: theme.palette.secondary.main,
                            },
                        }}
                    />
                </Box>
                <Box>
                    <Typography
                        variant="h2"
                        sx={{
                            color: props.value > 50 ? theme.palette.secondary.main : theme.palette.common.black,
                        }}
                    >{`${Math.round(props.value)}%`}</Typography>
                </Box>
            </Box>
        );

        Component.displayName = "LinearProgressWithLabel";

        return Component;
    }, []);

    return (
        <Box
            key={`${dataset.dataset_id}-${dataset.status}`}
            className={dataset.status === 'Retired' ? styles.cardContainerRetired : styles.cardContainerActive}
        >
            {dataset?.status === 'Draft' || dataset?.status === 'ReadyToPublish' ?
                <>
                    <Grid container direction="row">
                        {Object.entries(fieldsToDisplay).map(([key, label]) => (
                            <Grid item xs={1.5} key={key} className={styles.gridItem}>
                                <Typography variant="captionMedium">
                                    {label}
                                </Typography>
                                {key === 'status' ? (
                                    <Typography variant="caption">
                                        {getStatusLabel(String(dataset[key as keyof Dataset]))}
                                    </Typography>
                                ) : (
                                    <Typography variant="caption" sx={{ textAlign: 'start' }}>
                                        {dataset[key as keyof Dataset] !== undefined
                                            ? String(dataset[key as keyof Dataset])
                                            : 'N/A'}
                                    </Typography>
                                )}
                            </Grid>
                        ))}
                        <Grid item xs={5.1} className={styles.draftStatusContainer}>
                            <Box className={styles.draftStatusGroup}>
                                <DraftStatusCheckboxes statusConfig={draftDatasetConfigStatus} dataset={dataset} />
                            </Box>
                        </Grid>
                        <Grid item xs={3.9} className={styles.completionContainer}>
                            <Typography variant="captionMedium">
                                Completion % -
                            </Typography>
                            <LinearProgressWithLabel value={draftDatasetConfigStatus.progress} />
                        </Grid>
                    </Grid>
                </>
                :
                <Grid container direction="row">
                    {Object.entries(fieldsToDisplay).map(([key, label]) => (
                        <Grid item xs={1.5} key={key} className={styles.statusGridItem}>
                            <Typography variant="captionMedium">
                                {label}
                            </Typography>
                            {key === 'status' ? (
                                <Typography variant="caption">
                                    {getStatusLabel(String(dataset[key as keyof Dataset]))}
                                </Typography>
                            ) : (
                                <Typography variant="caption" sx={{ textAlign: 'start' }}>
                                    {dataset[key as keyof Dataset] !== undefined
                                        ? String(dataset[key as keyof Dataset])
                                        : 'N/A'}
                                </Typography>
                            )}
                        </Grid>
                    ))}
                    {dataset.status === 'Retired' && (
                        <>
                            <Grid item xs={1} className={styles.gridItem}>
                                <Typography variant="captionMedium">
                                    Volume
                                </Typography>
                                <Typography variant="caption">
                                    {eventCounts.totalEvents}
                                </Typography>
                            </Grid>
                            <Grid item xs={1} className={styles.gridItemNoBorder}>
                                <Typography variant="captionMedium">
                                    Size
                                </Typography>
                                <Typography variant="caption">
                                    {prettyBytes(datasetSize)}
                                </Typography>
                            </Grid>
                        </>
                    )}
                    {dataset.status !== 'Retired' && (
                        <>
                            <Grid item xs={1.5} className={styles.gridItem}>
                                <Typography variant="captionMedium">
                                    Current Health
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: dataset.current_health?.toLowerCase() === 'healthy'
                                            ? theme.palette.success.main
                                            : theme.palette.error.main
                                    }}
                                >
                                    {dataset.current_health}
                                </Typography>
                            </Grid>
                            {eventFields.map((field, index) => (
                                <Grid item xs={1.8} key={index} className={styles.gridItem}>
                                    <Typography variant="captionMedium">{field.label}</Typography>
                                    <Typography variant="caption">
                                        {field.value}
                                    </Typography>
                                </Grid>
                            ))}
                            <Grid item xs={1.1} className={styles.gridItem}>
                                <Typography variant="captionMedium">
                                    Volume
                                </Typography>
                                <Typography variant="caption">
                                    {eventCounts.totalEvents}
                                </Typography>
                            </Grid>
                            <Grid item xs={1} className={styles.gridItemNoBorder}>
                                <Typography variant="captionMedium">
                                    Size
                                </Typography>
                                <Typography variant="caption">
                                    {prettyBytes(datasetSize)}
                                </Typography>
                            </Grid>
                        </>
                    )}
                </Grid>
            }
            <Box className={styles.menu}>
                <Box>
                    <IconButton
                        aria-controls="simple-menu"
                        aria-haspopup="true"
                        onClick={(event) => {
                            handleMenuClick(event, dataset.dataset_id);
                        }}
                    >
                        <MoreVertIcon color="primary" />
                    </IconButton>
                    <Menu
                        id="simple-menu"
                        anchorEl={menuAnchor}
                        keepMounted
                        open={Boolean(menuAnchor)}
                        onClose={handleMenuClose}
                    >
                        {filteredActions.map((action) => (
                            <MenuItem
                                className={styles.menuItem}
                                key={action.type}
                                onClick={() => {
                                    handleMenuAction(action.type);
                                }}
                            >
                                <action.icon
                                    fontSize="small"
                                    color="primary"
                                    className={styles.menuIcons}
                                />
                                <Typography variant="bodyBold">
                                    {action.label}
                                </Typography>
                            </MenuItem>
                        ))}
                    </Menu>
                </Box>
            </Box>
        </Box>
    );
}

export default React.memo(DatasetlistCard);