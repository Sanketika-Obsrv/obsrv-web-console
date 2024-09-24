import { useMemo } from 'react';
import { Grid, Box, Stack, Typography, Accordion, useTheme, AccordionDetails, Paper, Collapse, AccordionSummary, Chip, } from '@mui/material';
import { CheckCircleOutlined, FileSearchOutlined, InfoCircleOutlined } from '@ant-design/icons';
import * as _ from 'lodash';
import { CardTitle } from 'components/styled/Cards';
import SuggestionBox from 'components/SuggestionBox';
import interactIds from 'data/telemetry/interact.json';
import { getNonDeletedRows } from 'services/dataset';

interface Props {
    flattenedData: Array<Record<string, any>>;
    showSuggestions: boolean;
    setRequiredFilter: React.Dispatch<React.SetStateAction<string>>;
    requiredFilter: string;
    generateInteractTelemetry?: any
}

const CollapsibleSuggestions = ({ showSuggestions = false, flattenedData, setRequiredFilter, requiredFilter, generateInteractTelemetry }: Props) => {
    const theme = useTheme();

    const getRequiredFields = useMemo(() => {
        let requiredCount = 0;
        let notRequiredCount = 0;
        let totalCount = 0;
        _.map(getNonDeletedRows(flattenedData), (item) => {
            if (_.has(item, 'required') && item.required)
                requiredCount += 1;
            else notRequiredCount += 1;
            totalCount += 1;
        });
        return { requiredCount, totalCount, notRequiredCount };
    }, [flattenedData]);

    const formatNumber = (val: number) => {
        return val.toString().padStart(2, '0');
    }

    const filterDataTypeSuggestions = (payload: any) => {
        if (_.has(payload, 'suggestions')) {
            const data: any = [];
            _.map(payload.suggestions, (suggestion: any) => {
                if (suggestion.resolutionType === 'DATA_TYPE' || suggestion.severity === 'MUST-FIX') {
                    data.push(suggestion);
                }
            });
            return data;
        } else return [];
    }

    const countDataTypeSuggestions = useMemo(() => {
        const data = _.map(flattenedData, (payload, index) => {
            if (_.has(payload, 'suggestions')) {
                const dataTypeSuggestions: any = filterDataTypeSuggestions(payload);
                return _.size(dataTypeSuggestions) > 0;
            } else return false;
        });
        return _.includes(data, true);
    }, [flattenedData]);

    return (
        <Box>
            <Collapse orientation="vertical" in={showSuggestions}>
                <Paper elevation={4} sx={{ mb: 2, pt: 3 }}>
                    <CardTitle px={2}>Suggestions</CardTitle>
                    {countDataTypeSuggestions && (
                        <Accordion square={false} defaultExpanded={true}>
                            <AccordionSummary aria-controls="data-type-suggestions" id="data-type-suggestions-header">
                                <Typography variant="h5">
                                    {`Data type suggestions`}
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 1, maxHeight: 270, overflow: 'auto' }}>
                                {_.map(flattenedData, (payload, index) => {
                                    let resolved = payload.resolved ? payload.resolved : false;
                                    const dataTypeSuggestions = filterDataTypeSuggestions(payload);
                                    if (_.size(dataTypeSuggestions) > 0) {
                                        return (
                                            <Stack key={index} direction="column" mb={0.5}>
                                                {
                                                    _.map(payload.suggestions, suggestion => {
                                                        if (suggestion.severity === 'MUST-FIX' && resolved)
                                                            return (
                                                                <Grid key={Math.random()} item xs={12} mx={1} my={0.5}>
                                                                    <SuggestionBox color={theme.palette.success.main} suggestion={suggestion} Icon={CheckCircleOutlined} />
                                                                </Grid>
                                                            );
                                                        else if (suggestion.severity === 'MUST-FIX' && !resolved) return (
                                                            <Grid key={Math.random()} item xs={12} mx={1} my={0.5}>
                                                                <SuggestionBox color={theme.palette.error.main} suggestion={suggestion} Icon={InfoCircleOutlined} />
                                                            </Grid>
                                                        )
                                                        else if (suggestion.resolutionType === 'DATA_TYPE') return (
                                                            <Grid key={Math.random()} item xs={12} mx={1} my={0.5}>
                                                                <SuggestionBox color={theme.palette.info.main} suggestion={suggestion} Icon={FileSearchOutlined} />
                                                            </Grid>
                                                        )
                                                    })
                                                }
                                            </Stack>
                                        );
                                    }
                                    else return null;
                                })}
                            </AccordionDetails>
                        </Accordion>
                    )}
                    <Accordion square={false}>
                        <AccordionSummary aria-controls="required-suggestions" id="required-suggestions-header">
                            <Typography variant="h5">
                                Required field suggestions
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack direction="column">
                                <Box display="flex" alignItems="center" my={1} px={1.25}>
                                    <Typography variant="body2" fontWeight={500}>
                                        {`${formatNumber(getRequiredFields.requiredCount)}/${formatNumber(getRequiredFields.totalCount)}`} are marked as required
                                    </Typography>
                                    <Chip
                                        id="chip"
                                        onDelete={requiredFilter === "true" ? () => {
                                            setRequiredFilter('');
                                            generateInteractTelemetry({ edata: { id: interactIds.remove_mark_as_required_filter } });
                                        } : undefined}
                                        onClick={() => {
                                            setRequiredFilter("true");
                                            generateInteractTelemetry({ edata: { id: interactIds.add_mark_as_required_filter } });
                                        }}
                                        label={'Review all fields marked as required'}
                                        sx={{ mx: 2 }}
                                        variant="filled"
                                        color="success"
                                    />
                                </Box>
                                <Box display="flex" alignItems="center" my={1} px={1.25}>
                                    <Typography variant="body2" fontWeight={500}>
                                        {`${formatNumber(getRequiredFields.notRequiredCount)}/${formatNumber(getRequiredFields.totalCount)}`} are marked as optional
                                    </Typography>
                                    <Chip
                                        id="chip"
                                        onDelete={requiredFilter === "false" ? () => {
                                            setRequiredFilter('');
                                            generateInteractTelemetry({ edata: { id: interactIds.remove_mark_as_optional_filter } });
                                        } : undefined}
                                        onClick={() => {
                                            setRequiredFilter("false");
                                            generateInteractTelemetry({ edata: { id: interactIds.add_mark_as_optional_filter } });
                                        }}
                                        label={'Review all fields marked as optional'}
                                        sx={{ mx: 2 }}
                                        variant="filled"
                                        color="success"
                                    />
                                </Box>
                            </Stack>
                        </AccordionDetails>
                    </Accordion>
                </Paper>
            </Collapse>
        </Box>
    );
};

export default CollapsibleSuggestions;
