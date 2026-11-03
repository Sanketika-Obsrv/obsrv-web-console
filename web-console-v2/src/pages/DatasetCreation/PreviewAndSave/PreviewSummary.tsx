import React, { useEffect, useState } from 'react';
import { Box, Alert, Grid, Stack, Typography } from '@mui/material';
import AdditionSummary from './AdditionSummary';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import _ from 'lodash';
import en from 'utils/locales/en.json';
import { endpoints, useFetchDatasetDiff, useFetchDatasetsById } from 'services/dataset';
import { http } from 'services/http';
import { renderSections } from 'pages/alertManager/services/utils';
import UpdateSummary from './UpdateSummary';
import DeletionSummary from './DeletionSummary';
import { useParams } from 'react-router-dom';
import Loader from 'components/Loader';
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import MuiAccordionSummary, {
    AccordionSummaryProps,
} from '@mui/material/AccordionSummary';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import { styled } from '@mui/material/styles';

const ReviewDataset = () => {
    const { datasetId }:any = useParams();

    const { data, isPending } = useFetchDatasetDiff({
        datasetId
    });

    // The diff response has no connector ui_spec on it -- fetch the draft's connectors
    // separately so Addition/Update summaries can mask credentials off the real schema
    // instead of guessing from field names.
    const draftDataset = useFetchDatasetsById({
        datasetId,
        queryParams: 'status=Draft&mode=edit&fields=connectors_config'
    });
    const [connectorSpecsById, setConnectorSpecsById] = useState<Record<string, any>>({});

    useEffect(() => {
        const connectorIds: string[] = _.uniq(
            _.map(_.get(draftDataset.data, 'connectors_config', []), 'connector_id')
        ).filter(Boolean);
        if (connectorIds.length === 0) return;
        Promise.all(
            connectorIds.map((id) =>
                http.get(`${endpoints.READ_CONNECTORS}/${id}`).then((response: any) => [
                    id,
                    _.get(response, ['data', 'result', 'ui_spec'])
                ])
            )
        ).then((pairs) => setConnectorSpecsById(Object.fromEntries(pairs)));
    }, [draftDataset.data]);

    const { additions = [], deletions = [], modifications = [] } = data || {};
    const noModifications = _.size(_.flatten([additions, deletions, modifications])) === 0;

    const transform = (data: Record<string, any>[]) => {
        return _.flatten(
            _.map(data, (payload) => {
                const { type, items = [], value } = payload;
                return [
                    ..._.map(items, (item) => ({ type, ...item })),
                    ...(value ? [{ type, value }] : [])
                ];
            })
        );
    };

    const [expanded, setExpanded] = React.useState<string | false>('added');

    const handleChange = (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
        setExpanded(newExpanded ? panel : false);
    };

    const Accordion = styled((props: AccordionProps) => (
        <MuiAccordion disableGutters elevation={0} square {...props} />
    ))(({ theme }) => ({
        border: `1px solid ${theme.palette.divider}`,
        '&:not(:last-child)': {
            borderBottom: 0,
        },
        '&::before': {
            display: 'none',
        },
    }));

    const AccordionSummary = styled((props: AccordionSummaryProps) => (
        <MuiAccordionSummary
            expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />}
            {...props}
        />
    ))(({ theme }) => ({
        backgroundColor:
            theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, .05)'
                : 'rgba(0, 0, 0, .03)',
        flexDirection: 'row-reverse',
        '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
            transform: 'rotate(90deg)',
        },
        '& .MuiAccordionSummary-content': {
            marginLeft: theme.spacing(1),
        },
    }));

    const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
        padding: theme.spacing(2),
        borderTop: '1px solid rgba(0, 0, 0, .125)',
    }));

    
    return (
        <>
            {(isPending) ? <Loader loading={isPending} descriptionText="Please wait while we process your request." /> : 
                <>
                {noModifications && (
                    <Grid item xs={12}>
                        <Alert severity="info">{en['no-summary-modifications']}</Alert>
                    </Grid>
                )}
                {!noModifications && (
                    <>
                        <Box>
                            <Accordion expanded={expanded === 'added'} onChange={handleChange('added')}>
                                <AccordionSummary aria-controls="panel1d-content" id="panel1d-header" disabled={additions.length === 0}>
                                    <Typography variant='h6'>Added</Typography>
                                </AccordionSummary>
                                {additions?.length && (<AccordionDetails>
                                    <AdditionSummary diff={additions} transform={transform} connectorSpecsById={connectorSpecsById} />
                                </AccordionDetails>)}
                            </Accordion>
                            <Accordion expanded={expanded === 'modified'} onChange={handleChange('modified')}>
                                <AccordionSummary aria-controls="panel1d-content" id="panel1d-header" disabled={modifications.length === 0}>
                                    <Typography variant='h6'>Modified</Typography>
                                </AccordionSummary>
                                {modifications?.length && (<AccordionDetails>
                                    <UpdateSummary diff={modifications} transform={transform} connectorSpecsById={connectorSpecsById} />
                                </AccordionDetails>)}
                            </Accordion>
                            <Accordion expanded={expanded === 'deleted'} onChange={handleChange('deleted')}>
                                <AccordionSummary aria-controls="panel1d-content" id="panel1d-header" disabled={deletions.length === 0}>
                                    <Typography variant='h6'>Deleted</Typography>
                                </AccordionSummary>
                                {deletions?.length && (<AccordionDetails>
                                    <DeletionSummary diff={deletions} transform={transform} />
                                </AccordionDetails>)}
                            </Accordion>
                        </Box>
                        <Grid item xs={12}>
                            <Alert severity="error">{en['dataset-summary-review-warning']}</Alert>
                        </Grid>
                    </>
                )}
                </>
            }
        </>
    );
};

export default ReviewDataset;
