import React, { useMemo } from 'react';
import {
    Grid,
    Box,
    Stack,
    Typography,
    Accordion,
    useTheme,
    AccordionDetails,
    Paper,
    Collapse,
    AccordionSummary,
    Chip
} from '@mui/material';
import FindInPageOutlinedIcon from '@mui/icons-material/FindInPageOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import * as _ from 'lodash';
import SuggestionBox from './SuggestionBox';
import { getNonDeletedRows } from 'services/json-schema';

interface Props {
    flattenedData: Array<Record<string, any>>;
    showSuggestions: boolean;
    setRequiredFilter: React.Dispatch<React.SetStateAction<string>>;
    requiredFilter: string;
    generateInteractTelemetry?: any;
}

const collectSuggestions = (item: any): any[] => {
    let suggestions: any[] = [];

    if (item.suggestions) {
        suggestions = suggestions.concat(
            item.suggestions.map((suggestion: any) => ({
                ...suggestion,
                resolved: item.resolved
            }))
        );
    }

    if (item.subRows && item.subRows.length > 0) {
        item.subRows.map((subRow: any) => {
            suggestions = suggestions.concat(collectSuggestions(subRow));
        });
    }

    return suggestions;
};

const CollapsibleSuggestions = ({
    showSuggestions = false,
    flattenedData,
    setRequiredFilter,
    requiredFilter
}: Props) => {
    const theme = useTheme();

    const getRequiredFields = useMemo(() => {
        let requiredCount = 0;
        let notRequiredCount = 0;
        let totalCount = 0;

        _.map(getNonDeletedRows(flattenedData), (item) => {
            if (_.has(item, 'isRequired') && item.isRequired) requiredCount += 1;
            else notRequiredCount += 1;
            totalCount += 1;
        });

        return { requiredCount, totalCount, notRequiredCount };
    }, [flattenedData]);

    const formatNumber = (val: number) => {
        return val.toString().padStart(2, '0');
    };

    const filterDataTypeSuggestions = (payload: any) => {
        const allSuggestions = collectSuggestions(payload);
        return _.filter(allSuggestions, (suggestion: any) => {
            return suggestion.resolutionType === 'DATA_TYPE' || suggestion.severity === 'MUST-FIX';
        });
    };
    const countDataTypeSuggestions = useMemo(() => {
        const hasDataTypeSuggestions = _.some(flattenedData, (payload) => {
            return _.size(filterDataTypeSuggestions(payload)) > 0;
        });
        return hasDataTypeSuggestions;
    }, [flattenedData]);

    return (
        <Box>
            <Collapse orientation="vertical" in={showSuggestions}>
                <Paper
                    sx={{
                        my: 2,
                        pt: 3,
                        '& .MuiPaper-root': {
                            boxShadow: 'none'
                        }
                    }}
                >
                    <Typography variant="h1" ml={2} pb={2}>
                        Suggestions
                    </Typography>
                    {countDataTypeSuggestions && (
                        <Accordion
                            square
                            defaultExpanded={true}
                            sx={{
                                border: `1px solid ${theme.palette.divider}`,
                                borderRight: 'none',
                                borderLeft: 'none'
                            }}
                        >
                            <AccordionSummary
                                aria-controls="data-type-suggestions"
                                id="data-type-suggestions-header"
                            >
                                <Typography variant="h5">Data type suggestions</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 1, maxHeight: 270, overflow: 'auto' }}>
                                {_.map(flattenedData, (payload, index) => {
                                    const dataTypeSuggestions = filterDataTypeSuggestions(payload);
                                    if (_.size(dataTypeSuggestions) > 0) {
                                        return (
                                            <Stack key={index} direction="column" mb={0.5}>
                                                {_.map(dataTypeSuggestions, (suggestion) => {
                                                    const suggestionResolved = suggestion.resolved;

                                                    return (
                                                        <Grid
                                                            key={suggestion.path}
                                                            item
                                                            xs={12}
                                                            mx={1}
                                                            my={0.5}
                                                        >
                                                            <SuggestionBox
                                                                color={
                                                                    suggestion.severity ===
                                                                    'MUST-FIX'
                                                                        ? suggestionResolved
                                                                            ? theme.palette.success
                                                                                  .main
                                                                            : theme.palette.error
                                                                                  .main
                                                                        : theme.palette.info.main
                                                                }
                                                                suggestion={suggestion}
                                                                Icon={
                                                                    suggestion.severity ===
                                                                    'MUST-FIX'
                                                                        ? suggestionResolved
                                                                            ? CheckOutlinedIcon
                                                                            : InfoOutlinedIcon
                                                                        : FindInPageOutlinedIcon
                                                                }
                                                            />
                                                        </Grid>
                                                    );
                                                })}
                                            </Stack>
                                        );
                                    }
                                    return null;
                                })}
                            </AccordionDetails>
                        </Accordion>
                    )}
                    <Accordion
                        square={false}
                        sx={{
                            '&::before': {
                                display: 'none'
                            },
                            mt: -1
                        }}
                    >
                        <AccordionSummary
                            aria-controls="required-suggestions"
                            id="required-suggestions-header"
                        >
                            <Typography variant="h5">Required field suggestions</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack direction="column">
                                <Box display="flex" alignItems="center" my={1} px={1.25}>
                                    <Typography variant="body2" fontWeight={500}>
                                        {`${formatNumber(getRequiredFields.requiredCount)}/${formatNumber(getRequiredFields.totalCount)}`}{' '}
                                        are marked as required
                                    </Typography>
                                    <Chip
                                        id="chip"
                                        onDelete={
                                            requiredFilter === 'true'
                                                ? () => {
                                                      setRequiredFilter('');
                                                  }
                                                : undefined
                                        }
                                        onClick={() => {
                                            setRequiredFilter('true');
                                        }}
                                        label="Review all fields marked as required"
                                        sx={{ mx: 2 }}
                                        variant="filled"
                                        color="success"
                                    />
                                </Box>
                                <Box display="flex" alignItems="center" my={1} px={1.25}>
                                    <Typography variant="body2" fontWeight={500}>
                                        {`${formatNumber(getRequiredFields.notRequiredCount)}/${formatNumber(getRequiredFields.totalCount)}`}{' '}
                                        are marked as optional
                                    </Typography>
                                    <Chip
                                        id="chip"
                                        onDelete={
                                            requiredFilter === 'false'
                                                ? () => {
                                                      setRequiredFilter('');
                                                  }
                                                : undefined
                                        }
                                        onClick={() => {
                                            setRequiredFilter('false');
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
