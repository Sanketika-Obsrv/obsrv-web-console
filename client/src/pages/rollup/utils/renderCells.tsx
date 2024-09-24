import {
    Box, Typography, Select, FormControl, MenuItem, Checkbox, ListItemText, useTheme
} from "@mui/material";
import * as _ from "lodash";
import HtmlTooltip from "components/HtmlTooltip";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import Chip from '@mui/material/Chip';
import InputLabel from '@mui/material/InputLabel';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import { aggregationFunctions } from "./commonUtils"

const renderAggregateCell = ({
    setErrorMessage, aggregateFunctions, setAggregateFunctions, cell, value,
    updateDataType, setFlattenedData, disabled
}: any) => {
    const allowedAggregations = {
        integers: aggregationFunctions,
    }

    const row = cell?.row?.original || {};
    const isDefaultMetricPresent = row?.column === "total_count"

    const handleValueChange = (event: any) => {
        setAggregateFunctions(event.target.value);
    };

    if (disabled || row?.disableActions) return (
        <Box px={2}><Typography variant="h6">{row?.rollupType === "object" ? "" : row?.rollupType}</Typography></Box>
    );

    return (
        <Box position="relative" minWidth={"40vw"} display='flex' alignItems="center" my={1} flexWrap={"wrap"}>
            {row?.type === 'string' ? <></> : isDefaultMetricPresent ? <Typography variant="h6">Count</Typography> : <>
                < FormControl sx={{ width: "32%" }}>
                    <InputLabel id="demo-simple-select-label">Select aggregation</InputLabel>
                    <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={aggregateFunctions}
                        variant="outlined"
                        onChange={handleValueChange}
                        multiple
                        renderValue={(selected) => !_.isEmpty(selected) ? `${selected.length} selected` : ""}
                    >
                        {
                            row?.originalType === "string" ?
                                <></>
                                : allowedAggregations?.integers.map((option: any) =>
                                (
                                    <MenuItem
                                        key={option}
                                        value={option}
                                        onClick={() => updateDataType(option, row, setFlattenedData)}
                                    >
                                        <Checkbox checked={aggregateFunctions.indexOf(option) > -1} />
                                        <ListItemText primary={_.capitalize(option)} />
                                    </MenuItem>
                                ))
                        }
                    </Select>
                </FormControl >
                <Box>{aggregateFunctions.map((value: any) =>
                (<Chip sx={{ ml: 1 }} key={value} label={_.capitalize(value)}
                    onDelete={() => {
                        setAggregateFunctions((prevFunctions: any) => prevFunctions.filter((func: any) => func !== value));
                        updateDataType(value, row, setFlattenedData)
                    }}
                    deleteIcon={<Box>
                        <CancelRoundedIcon color="primary" />
                    </Box>}
                />))}
                </Box>
            </>}
        </Box >
    );
}

const renderCategoryCell = ({
    defaultValue, setDefault, cell,
    updateRollupDataType, setFlattenedData,
    validDatatypes, theme, indexColumn
}: any) => {
    const row = cell?.row?.original || {};
    const hasConflicts = _.get(row, 'suggestions.length');

    const handleChange = (event: any) => {
        setDefault(event.target.value);
    };

    return (
        <Box position="relative" minWidth={"35vw"} display='block' alignItems="center" my={1}>
            {< FormControl variant="standard" sx={{ mx: 1, minWidth: 120 }}>
                {(row?.properties === undefined && row?.rollupType === 'object' && row?.data_type === 'object' || row?.parent === true) || (row?.column === indexColumn) || row?.arrival_format === "object" ? null :
                    <ToggleButtonGroup
                        color="primary"
                        value={defaultValue}
                        exclusive
                        onChange={handleChange}
                        style={{ height: "2rem" }}
                        sx={{ border: "1px solid gray", padding: 0 }}
                    >
                        {
                            validDatatypes.map((option: any) =>
                            (
                                <ToggleButton
                                    onClick={() => updateRollupDataType(
                                        option?.value, row,
                                        setFlattenedData, hasConflicts,
                                    )}
                                    value={option?.value}
                                    key={option?.value}
                                    sx={{
                                        "&.Mui-selected, &.Mui-selected:hover": {
                                            color: "white",
                                            backgroundColor: theme.palette.primary.main
                                        },
                                        color: theme.palette.primary.main
                                    }}
                                    disabled={!_.includes(option?.typesAllowed, row?.arrival_format) || _.includes(["date-time", "date", "epoch"], row?.data_type)}
                                >
                                    {option.label}
                                </ToggleButton>
                            ))
                        }
                    </ToggleButtonGroup>
                }
            </FormControl >}
        </Box >
    );
}

const renderColumnCell = ({
    cell, value
}: any) => {
    const mainRow = cell?.row || {};
    const collapseIcon = mainRow.isExpanded ? <ExpandMoreIcon sx={{ ml: -1 }} /> : <ChevronRightIcon sx={{ ml: -1 }} />;

    return (
        <Box alignItems="baseline" maxWidth={'0vw'} minWidth={'15vw'} paddingLeft={mainRow.depth > 0 ? mainRow.depth * 3 : 0}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
                <HtmlTooltip title={value}>
                    <Box display="flex" alignItems="center" minWidth="75%" maxWidth="80%">
                        {mainRow?.canExpand && mainRow?.depth > 0 && (
                            <Box sx={{ fontSize: '1rem', }} {...mainRow.getToggleRowExpandedProps()}>
                                {collapseIcon}
                            </Box>
                        )}
                        <Typography variant="h6" py={0.8} my={1} maxWidth={'70%'} textOverflow='ellipsis' overflow='hidden' whiteSpace='nowrap'>
                            {value}
                        </Typography>
                    </Box>
                </HtmlTooltip>
            </Box>
        </Box>
    );
}

const renderReviewAggregationCell = ({
    aggregateFunctions
}: any) => {
    return (
        <Box position="relative" minWidth={"10vw"} display='flex' alignItems="center" my={1} flexWrap={"wrap"}>
            {aggregateFunctions &&
                <Box>{aggregateFunctions.map((value: any) =>
                (<Chip sx={{ ml: 1 }} color="primary" label={_.capitalize(value)}
                />))}
                </Box>
            }
        </Box >
    );
}

const renderReviewCategoryCell = ({
    defaultValue, cell
}: any) => {
    return (
        <Box position="relative" minWidth={"10vw"} display='block' alignItems="center" my={1}>
            {defaultValue !== 'object' && <Box>
                <Chip sx={{ ml: 1 }} color="primary" label={_.capitalize(defaultValue)} />
            </Box>}
        </Box >
    );
}

export { renderColumnCell, renderCategoryCell, renderAggregateCell, renderReviewAggregationCell, renderReviewCategoryCell };
