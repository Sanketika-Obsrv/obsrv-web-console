import React from "react";
import {
    Box, Typography, Button, Dialog, DialogTitle, Select, DialogContent, TextareaAutosize, FormControl, MenuItem, Popover, FormControlLabel, Stack, IconButton, Tooltip
} from "@mui/material";
import RequiredSwitch from "components/RequiredSwitch";
import { CloseCircleOutlined, PlusOutlined, CheckOutlined, DeleteOutlined, InfoCircleOutlined, } from '@ant-design/icons';
import * as _ from "lodash";
import HtmlTooltip from "components/HtmlTooltip";
import { VerticalOverflowText } from "components/styled/Typography";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import interactIds from 'data/telemetry/interact.json';

const renderColumnCell = ({
    cell, setFlattenedData, persistState, value,
    theme, edit, setEdit, text, setText, disabled = false,
}: any) => {
    const row = cell?.row?.original || {};
    const mainRow = cell?.row || {};
    const collapseIcon = mainRow.isExpanded ? <ExpandMoreIcon sx={{ ml: -1 }} /> : <ChevronRightIcon sx={{ ml: -1 }} />;
    const editDescription = () => {
        updateState();
        setEdit((prevState: any) => !prevState);
    }

    const handleClose = () => {
        setEdit((prevState: any) => !prevState);
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
    }

    const updateState = () => {
        setFlattenedData((preState: Array<Record<string, any>>) => {
            const updatedValues = { ...row };
            const values = _.map(preState, state => {
                if (_.get(state, 'column') === _.get(updatedValues, 'originalColumn'))
                    return { ...state, ...updatedValues, isModified: true, description: text, column: _.get(updatedValues, 'originalColumn') };
                else return state;
            });
            persistState(values);
            return values;
        });
    }

    return (
        <Box alignItems="baseline" maxWidth={'30vw'} minWidth={'30vw'} paddingLeft={mainRow.depth > 0 ? mainRow.depth * 3 : 0}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
                <HtmlTooltip title={value}>
                    <Box display="flex" alignItems="center" minWidth="75%" maxWidth="80%">
                        {mainRow?.canExpand && mainRow?.depth > 0 && (
                            <Box sx={{ fontSize: '1rem', }} {...mainRow.getToggleRowExpandedProps()}>
                                {collapseIcon}
                            </Box>
                        )}
                        <Typography padding={0.2} variant="h6" my={1} maxWidth={'70%'} textOverflow='ellipsis' overflow='hidden' whiteSpace='nowrap'>
                            {value}
                        </Typography>
                    </Box>
                </HtmlTooltip>
                {!row.description && !disabled &&
                    <Button sx={{ fontWeight: 500 }} onClick={handleClose} startIcon={<PlusOutlined style={{ fontSize: '1.25rem', strokeWidth: 25, stroke: theme.palette.primary.main }} />}>
                        Description
                    </Button>
                }
            </Box>
            {row.description &&
                <HtmlTooltip title={row.description} placement="top-start" arrow>
                    <VerticalOverflowText
                        variant="body3"
                        color="secondary"
                        onClick={handleClose}
                    >
                        {row.description}
                    </VerticalOverflowText>
                </HtmlTooltip>
            }
            <Dialog open={edit} onClose={handleClose}>
                <DialogTitle
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <HtmlTooltip title={value}>
                        <Typography mx={2} maxWidth={'70%'} textOverflow='ellipsis' overflow='hidden' whiteSpace='nowrap'>
                            {value}
                        </Typography>
                    </HtmlTooltip>
                    <CloseCircleOutlined onClick={handleClose} />
                </DialogTitle>
                <DialogContent>
                    <Box m={2}>
                        <Tooltip title={"Add a description that must be under 300 characters"} placement="top">
                            <TextareaAutosize
                                minRows={3}
                                style={{ width: '31.25rem', height: '6.875rem' }}
                                autoFocus
                                maxLength={300}
                                defaultValue={row.description}
                                aria-label="description of field"
                                onChange={handleChange}
                                placeholder="Add description here..."
                            />
                        </Tooltip>
                    </Box>
                    <Box display='flex' justifyContent='flex-end'>
                        <Button sx={{ my: 1, mx: 2, width: 230 }} onClick={editDescription} variant="contained">
                            <Typography variant="body1" fontWeight={500}>
                                Save
                            </Typography>
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
}

const renderDataTypeCell = ({
    cell, value, pageData, anchorEl, setAnchorEl,
    updateDataType, persistState, setFlattenedData,
    resetSuggestionResolve, validDatatypes, disabled, dataMappings
}: any) => {
    const row = cell?.row?.original || {};
    const hasConflicts = _.get(row, 'suggestions.length');
    const isResolved = _.get(row, 'resolved') || false;
    const open = Boolean(anchorEl);
    const handleSuggestions = (e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
    }

    const handleClose = () => {
        setAnchorEl(null);
    }

    const renderSuggestions = () => {
        return row?.oneof?.map((suggestion: any) => {
            if (suggestion.type !== value) return (
                <Button
                    key={suggestion.type}
                    aria-label='fix-data-type'
                    variant="contained"
                    sx={{ my: 1 }}
                    onClick={() => updateDataType(
                        suggestion.type, row, pageData, persistState,
                        setFlattenedData, hasConflicts, setAnchorEl, dataMappings
                    )}
                >
                    <Typography variant="body1" fontWeight={500}>
                        {`Change Data Type to ${_.capitalize(suggestion.type)}`}
                    </Typography>
                </Button>
            );
            else return null;
        })
    }
    if ((disabled || row?.disableActions) && !row?.isModified) return (
        <Box px={2}><Typography variant="h6">{value}</Typography></Box>
    );

    if (row?.isModified && row?.isNewlyAdded && row?.arrival_format === "object") return (
        <Box px={2}><Typography variant="h6">{value}</Typography></Box>
    );

    return (
        <Box position="relative" maxWidth={180} display='block' alignItems="center" my={1}>
            {row?.oneof && !isResolved && !row?.arrivalOneOf &&
                <Button startIcon={<InfoCircleOutlined />} color="error" onClick={handleSuggestions} sx={{ mx: 1 }}>
                    <Typography variant="caption">Recommended Change</Typography>
                </Button>
            }
            {row?.oneof && isResolved && !row?.arrivalOneOf &&
                <Button startIcon={<CheckOutlined />} color="success" onClick={handleSuggestions} sx={{ mx: 1 }}>
                    <Typography variant="caption">Resolved</Typography>
                </Button>
            }
            < FormControl variant="standard" sx={{ mx: 1, minWidth: 100 }}>
                <Select
                    value={value}
                    variant="standard"
                >
                    {
                        validDatatypes.map((option: any) =>
                        (
                            <MenuItem
                                onClick={() => updateDataType(
                                    option, row, pageData, persistState,
                                    setFlattenedData, hasConflicts, setAnchorEl, dataMappings
                                )}
                                value={option}
                                key={option}>
                                {option}
                            </MenuItem>
                        ))
                    }
                </Select>
            </FormControl >
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <Box p={2} maxWidth={336}>
                    {isResolved && (
                        <>
                            <Typography variant="h6" fontWeight="bold">
                                Resolved
                                <Typography variant="body1" my={2}>
                                    Data type of field <strong>{row?.column}</strong> is resolved to "{value}"
                                </Typography>
                            </Typography>
                            <Box my={1}>
                                <Button
                                    key={`${value}-mark-resolved`}
                                    aria-label='resolve-data-type'
                                    variant="contained"
                                    onClick={() => resetSuggestionResolve(
                                        row, pageData, persistState, setFlattenedData,
                                        hasConflicts, setAnchorEl
                                    )}
                                >
                                    <Typography variant="body1" fontWeight={500}>
                                        Reopen Suggestion
                                    </Typography>
                                </Button>
                            </Box>
                        </>
                    )}
                    {!isResolved && (
                        <>
                            <Typography variant="h6" fontWeight="bold">
                                Must-Fix
                                <Typography variant="body1" my={2}>
                                    The field <strong>{row?.column}</strong> has multiple data type values available
                                </Typography>
                            </Typography>
                            {renderSuggestions()}
                            {row?.data_type &&
                                <Box my={1}>
                                    <Button
                                        key={`${value}-mark-resolved`}
                                        aria-label='resolve-data-type'
                                        onClick={() => updateDataType(
                                            value, row, pageData, persistState,
                                            setFlattenedData, hasConflicts, setAnchorEl, dataMappings
                                        )}
                                    >
                                        <Typography variant="body1" fontWeight={500}>
                                            Mark as resolved
                                        </Typography>
                                    </Button>
                                </Box>
                            }
                        </>
                    )}
                </Box>
            </Popover>
        </Box >
    );
}

const renderRequiredCell = ({
    cell, value, setFlattenedData, persistState, disabled
}: any) => {
    const row = cell?.row?.original || {};
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFlattenedData((preState: Array<Record<string, any>>) => {
            const updatedValues = { ...row };
            const values = _.map(preState, state => {
                if (_.get(state, 'column') === _.get(updatedValues, 'originalColumn'))
                    return { ...state, ...updatedValues, isModified: true, required: e.target.checked, column: _.get(updatedValues, 'originalColumn') };
                else return state
            });
            persistState(values);
            return values;
        });
    }
    switch (value) {
        default:
            if (row?.disableActions) return null;
            return <Box display="flex" alignItems="center">
                <FormControl fullWidth sx={{ alignItems: 'center' }}>
                    <FormControlLabel
                        sx={{ m: 'auto' }}
                        control={<RequiredSwitch size='small' checked={value} onChange={handleChange} />}
                        label={''}
                        disabled={disabled}
                    />
                </FormControl>
            </Box>;
    }
}

const renderActionsCell = ({ cell, setSelection, setOpenAlertDialog, theme, generateInteractTelemetry }: any) => {
    const row = cell?.row?.original || {};

    const handleDeleteColumn = () => {
        generateInteractTelemetry({ edata: { id: interactIds.delete_schema } })
        setSelection(row);
        setOpenAlertDialog(true);
    }

    if (row?.disableActions) return null;
    return (
        <Stack direction="row">
            <IconButton color="primary" size="large" sx={{ m: 'auto' }} onClick={handleDeleteColumn}>
                <DeleteOutlined style={{ color: theme.palette.primary.main }} />
            </IconButton>
        </Stack>
    );
}


const renderArrivalFormatCell = ({
    cell, value, pageData, anchorEl, setAnchorEl,
    updateFormatType, persistState, setFlattenedData, validFormatTypes, dataMappings, disabled, resetSuggestionResolve
}: any) => {
    const row = cell?.row?.original || {};
    const hasConflicts = _.get(row, 'suggestions.length');
    const isResolved = _.get(row, 'resolved') || false;
    const open = Boolean(anchorEl);

    const handleSuggestions = (e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
    }

    const handleClose = () => {
        setAnchorEl(null);
    }

    const renderSuggestions = () => {
        return row?.arrivalOneOf?.map((suggestion: any) => {
            if (suggestion.type !== value) return (
                <Button
                    key={suggestion.type}
                    aria-label='fix-data-type'
                    variant="contained"
                    sx={{ my: 1 }}
                    onClick={() => updateFormatType(
                        suggestion.type, row, pageData, persistState,
                        setFlattenedData, dataMappings, hasConflicts, setAnchorEl
                    )}
                >
                    <Typography variant="body1" fontWeight={500}>
                        {`Change Data Type to ${_.capitalize(suggestion.type)}`}
                    </Typography>
                </Button>
            );
            else return null;
        })
    }

    if ((disabled || row?.disableActions) && !row?.isModified) return (
        <Box px={2}><Typography variant="h6">{value}</Typography></Box>
    );

    if (row?.isModified && row?.isNewlyAdded && row?.arrival_format === "object") return (
        <Box px={2}><Typography variant="h6">{value}</Typography></Box>
    );

    return (
        <Box position="relative" maxWidth={180} display='block' alignItems="center" my={1}>
            {row?.arrivalOneOf && !isResolved &&
                <Button startIcon={<InfoCircleOutlined />} color="error" onClick={handleSuggestions} sx={{ mx: 1 }}>
                    <Typography variant="caption">Recommended Change</Typography>
                </Button>
            }
            {row?.arrivalOneOf && isResolved &&
                <Button startIcon={<CheckOutlined />} color="success" onClick={handleSuggestions} sx={{ mx: 1 }}>
                    <Typography variant="caption">Resolved</Typography>
                </Button>
            }
            < FormControl variant="standard" sx={{ mx: 1, minWidth: 120 }}>
                <Select
                    value={value}
                    variant="standard"
                >
                    {
                        validFormatTypes && validFormatTypes.map((option: any) =>
                        (
                            <MenuItem
                                onClick={() => updateFormatType(
                                    option, row, pageData, persistState,
                                    setFlattenedData, dataMappings, hasConflicts, setAnchorEl
                                )}
                                value={option}
                                key={option}>
                                {option}
                            </MenuItem>
                        ))
                    }
                </Select>
            </FormControl >
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <Box p={2} maxWidth={336}>
                    {isResolved && (
                        <>
                            <Typography variant="h6" fontWeight="bold">
                                Resolved
                                <Typography variant="body1" my={2}>
                                    Arrival Format of field <strong>{row?.column}</strong> is resolved to "{value}"
                                </Typography>
                            </Typography>
                            <Box my={1}>
                                <Button
                                    key={`${value}-mark-resolved`}
                                    aria-label='resolve-data-type'
                                    variant="contained"
                                    onClick={() => resetSuggestionResolve(
                                        row, pageData, persistState, setFlattenedData,
                                        hasConflicts, setAnchorEl
                                    )}
                                >
                                    <Typography variant="body1" fontWeight={500}>
                                        Reopen Suggestion
                                    </Typography>
                                </Button>
                            </Box>
                        </>
                    )}
                    {!isResolved && (
                        <>
                            <Typography variant="h6" fontWeight="bold">
                                Must-Fix
                                <Typography variant="body1" my={2}>
                                    The field <strong>{row?.column}</strong> has multiple arrival format values available
                                </Typography>
                            </Typography>
                            {renderSuggestions()}
                            {row?.arrival_format &&
                                <Box my={1}>
                                    <Button
                                        key={`${value}-mark-resolved`}
                                        aria-label='resolve-data-type'
                                        onClick={() => updateFormatType(
                                            value, row, pageData, persistState,
                                            setFlattenedData, hasConflicts, dataMappings, setAnchorEl
                                        )}
                                    >
                                        <Typography variant="body1" fontWeight={500}>
                                            Mark as resolved
                                        </Typography>
                                    </Button>
                                </Box>
                            }
                        </>
                    )}
                </Box>
            </Popover>
        </Box >
    );
}

export { renderColumnCell, renderDataTypeCell, renderRequiredCell, renderActionsCell, renderArrivalFormatCell };
