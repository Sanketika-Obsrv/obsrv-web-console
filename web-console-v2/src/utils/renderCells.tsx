import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    Select,
    DialogContent,
    TextareaAutosize,
    FormControl,
    MenuItem,
    Popover,
    FormControlLabel,
    Stack,
    IconButton,
    Switch,
    styled
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import * as _ from 'lodash';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Menu } from '@mui/material';

export const CustomSelectIcon = (props: React.ComponentProps<typeof IconButton>) => {
    return (
        <IconButton {...props}>
            <ExpandMoreIcon />
        </IconButton>
    );
};

const AntSwitch = styled(Switch)(({ theme }) => ({
    width: 42,
    height: 24,
    padding: 0,
    display: 'flex',
    '&:active': {
        '& .MuiSwitch-thumb': {
            width: 22
        },
        '& .MuiSwitch-switchBase.Mui-checked': {
            transform: 'translateX(20px)'
        }
    },
    '& .MuiSwitch-switchBase': {
        padding: 3,
        '&.Mui-checked': {
            transform: 'translateX(20px)',
            color: theme.palette.common.white,
            '& + .MuiSwitch-track': {
                opacity: 1
            }
        }
    },
    '& .MuiSwitch-thumb': {
        boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)',
        width: 18,
        height: 18,
        borderRadius: 9,
        transition: theme.transitions.create(['width'], {
            duration: 200
        })
    },
    '& .MuiSwitch-track': {
        borderRadius: 12,
        opacity: 1,
        backgroundColor:
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.25)',
        boxSizing: 'border-box'
    }
}));

const renderColumnCell = ({ cell, value }: any) => {
    const row = cell?.row?.original || {};
    const isSubRow = cell?.row?.depth > 0;
    const isObjectType = row.arrival_format === 'object';

    const depthIndentation = `${cell?.row?.depth * 0.25}rem`;
    const subdepthIndentation = `${cell?.row?.depth * 3.5}rem`;
    const paddingLeft =
        isSubRow && isObjectType
            ? depthIndentation
            : isSubRow && !isObjectType
              ? subdepthIndentation
              : '3px';

    return (
        <Box maxWidth={'30vw'} minWidth={'20vw'} py={2} pl={paddingLeft}>
            <Stack direction="column">
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-start"
                    minWidth="75%"
                    maxWidth="80%"
                >
                    <Typography
                        variant="h2"
                        component="span"
                        textOverflow="ellipsis"
                        overflow="hidden"
                        whiteSpace="nowrap"
                    >
                        {value}
                    </Typography>
                </Box>
                {row.description && (
                    <Typography
                        variant="captionMedium"
                        component="span"
                        color="grey"
                        fontSize="0.875rem"
                    >
                        {row.description}
                    </Typography>
                )}
            </Stack>
        </Box>
    );
};
const renderDataTypeCell = ({
    cell,
    value,
    pageData,
    anchorEl,
    setAnchorEl,
    updateDataType,
    persistState,
    setFlattenedData,
    resetSuggestionResolve,
    validDatatypes,
    dataMappings
}: any) => {
    const row = cell?.row?.original || {};
    const hasConflicts = _.get(row, 'suggestions.length') > 0;
    const isResolved = _.get(row, 'resolved') || false;
    const open = Boolean(anchorEl);
    const validTypes = validDatatypes;
    const handleSuggestions = (
        e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLElement>
    ) => {
        setAnchorEl(e.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const renderSuggestions = () => {
        return row?.oneof?.map((suggestion: any) => {
            if (suggestion.type !== value)
                return (
                    <Button
                        key={suggestion.type}
                        variant="contained"
                        sx={{ my: 1 }}
                        onClick={() =>
                            updateDataType(
                                suggestion.type,
                                row,
                                pageData,
                                persistState,
                                setFlattenedData,
                                hasConflicts,
                                setAnchorEl,
                                dataMappings
                            )
                        }
                    >
                        <Typography variant="body1" fontWeight={500} color="white">
                            {`Change Data Type to ${_.capitalize(suggestion.type)}`}
                        </Typography>
                    </Button>
                );
            return null;
        });
    };

    const renderHighSeveritySuggestions = () => {
        return row?.suggestions?.map((suggestion: any) => {
            if (
                row?.oneof?.length > 0 &&
                suggestion.message &&
                suggestion.severity !== 'LOW' &&
                suggestion.severity !== 'MEDIUM'
            ) {
                return (
                    <Typography
                        variant="body1"
                        fontWeight={500}
                        key={suggestion.message}
                        maxWidth="400px"
                    >
                        {suggestion.message}
                    </Typography>
                );
            } else {
                return null;
            }
        });
    };

    const hasHighSeveritySuggestions = row?.suggestions?.some(
        (suggestion: any) => suggestion.severity !== 'LOW' && suggestion.severity !== 'MEDIUM'
    );
    if (row?.isModified && row?.isNewlyAdded && row?.arrival_format === 'object')
        return (
            <Box px={2}>
                <Typography variant="h2" component="span">
                    {value}
                </Typography>
            </Box>
        );
    return (
        <Box
            position="relative"
            maxWidth={250}
            display="flex"
            flexDirection="column"
            alignItems={'flex-start'}
            ml={3}
        >
            <Box>
                {row?.oneof?.length > 0 &&
                    row?.suggestions?.length > 0 &&
                    hasHighSeveritySuggestions &&
                    !isResolved && (
                        <Button
                            startIcon={
                                <Box sx={{ mr: 1 }}>
                                    <ErrorOutlineIcon sx={{ fontSize: 'medium' }} />
                                </Box>
                            }
                            color="error"
                            onClick={handleSuggestions}
                            sx={{
                                minWidth: 'max-content',
                                p: 0,
                                '& .MuiButton-startIcon': { marginRight: '0.25px' },
                                mt: -3,
                                mb: 2,
                                '&:hover': {
                                    backgroundColor: 'transparent'
                                }
                            }}
                        >
                            <Typography
                                variant="caption"
                                component="span"
                                color="grey"
                                fontWeight={400}
                            >
                                Recommended Change
                            </Typography>
                        </Button>
                    )}
                {row?.oneof?.length > 0 &&
                    row?.suggestions?.length > 0 &&
                    hasHighSeveritySuggestions &&
                    isResolved && (
                        <Button
                            startIcon={
                                <Box sx={{ mr: 1 }}>
                                    <CheckCircleOutlineIcon sx={{ fontSize: 'medium' }} />
                                </Box>
                            }
                            color="success"
                            onClick={handleSuggestions}
                            sx={{
                                minWidth: 'max-content',
                                p: 0,
                                '& .MuiButton-startIcon': { marginRight: '0.25px' },
                                mt: -3,
                                mb: 2,
                                '&:hover': {
                                    backgroundColor: 'transparent'
                                }
                            }}
                        >
                            <Typography
                                variant="caption"
                                component="span"
                                color="grey"
                                fontWeight={400}
                            >
                                Resolved
                            </Typography>
                        </Button>
                    )}
            </Box>
            <Box
                sx={{
                    display: 'flex',

                    mt: hasHighSeveritySuggestions && row?.oneof?.length > 0 ? -3 : 0
                }}
            >
                <FormControl variant="standard" sx={{ minWidth: 150, flex: 1, m: 0, p: 0 }}>
                    <Select
                        value={value}
                        variant="standard"
                        disableUnderline
                        IconComponent={CustomSelectIcon}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    '& .MuiMenuItem-root': {
                                        my: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }
                                }
                            }
                        }}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            '& .MuiSelect-icon': {
                                right: 'calc(50% - 45px)',
                                top: 'calc(50% - 20px)'
                            },
                            '& .MuiSelect-select': {
                                display: 'flex',
                                alignItems: 'center',
                                ml: 0
                            }
                        }}
                    >
                        {validTypes.map((option: any) => (
                            <MenuItem
                                onClick={() =>
                                    updateDataType(
                                        option,
                                        row,
                                        pageData,
                                        persistState,
                                        setFlattenedData,
                                        hasConflicts,
                                        setAnchorEl,
                                        dataMappings
                                    )
                                }
                                value={option}
                                key={option}
                            >
                                <Typography variant="h2" component="span">
                                    {option}{' '}
                                </Typography>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center'
                }}
            >
                <Box p={2} maxWidth={336}>
                    {isResolved && (
                        <>
                            <Typography variant="h6" component="span" fontWeight="bold">
                                Resolved
                                <Typography variant="body1" my={2}>
                                    Data type of field <strong>{row?.column}</strong> is resolved to{' '}
                                    {`${value}`}
                                </Typography>
                            </Typography>
                            <Box my={1}>
                                <Button
                                    key={`${value}-mark-resolved`}
                                    aria-label="resolve-data-type"
                                    variant="contained"
                                    onClick={() =>
                                        resetSuggestionResolve(
                                            row,
                                            pageData,
                                            persistState,
                                            setFlattenedData,
                                            hasConflicts,
                                            setAnchorEl
                                        )
                                    }
                                >
                                    <Typography variant="body1" fontWeight={500} color="white">
                                        Reopen Suggestion
                                    </Typography>
                                </Button>
                            </Box>
                        </>
                    )}
                    {!isResolved && hasHighSeveritySuggestions && row?.suggestions?.length > 0 && (
                        <>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: '#D96262'
                                }}
                            >
                                <ErrorOutlineIcon sx={{ fontSize: 'large', marginRight: '4px' }} />{' '}
                                <Typography variant="h6" component="span" fontSize="1rem">
                                    Must-Fix
                                </Typography>
                            </Box>
                            <Typography variant="body1" my={2}>
                                {row?.suggestions?.message}
                            </Typography>
                            {renderHighSeveritySuggestions()}
                            {renderSuggestions()}
                            {hasHighSeveritySuggestions && row?.suggestions?.length > 0 && (
                                <Box my={1}>
                                    <Button
                                        key={`${value}-mark-resolved`}
                                        aria-label="resolve-data-type"
                                        onClick={() =>
                                            updateDataType(
                                                value,
                                                row,
                                                pageData,
                                                persistState,
                                                setFlattenedData,
                                                hasConflicts,
                                                setAnchorEl,
                                                dataMappings
                                            )
                                        }
                                    >
                                        <Typography variant="body1" fontWeight={500} color="blue">
                                            Mark as resolved
                                        </Typography>
                                    </Button>
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </Popover>
        </Box>
    );
};

const renderRequiredCell = ({ cell, value, setFlattenedData, persistState }: any) => {
    const row = cell?.row?.original || {};
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFlattenedData((prevState: Array<Record<string, any>>) => {
            const updatedValues = { ...row, isRequired: e.target.checked };

            const updateRows = (rows: Array<Record<string, any>>): Array<Record<string, any>> => {
                return rows.map((state) => {
                    if (_.get(state, 'column') === _.get(updatedValues, 'column')) {
                        return {
                            ...state,
                            ...updatedValues,
                            isModified: true
                        };
                    }

                    if (state.subRows) {
                        return {
                            ...state,
                            subRows: updateRows(state.subRows)
                        };
                    }

                    return state;
                });
            };

            const updatedData = updateRows(prevState);
            persistState(updatedData);
            return updatedData;
        });
    };

    const isDisabled = row?.disableToggle || row?.parentRow?.disableToggle;

    return (
        <Box display="flex" ml={5}>
            <FormControl>
                <FormControlLabel
                    control={<AntSwitch checked={value} onChange={handleChange} />}
                    label={''}
                    disabled={isDisabled}
                />
            </FormControl>
        </Box>
    );
};

const renderActionsCell = ({
    cell,
    setSelection,
    setOpenAlertDialog,
    edit,
    setEdit,
    text,
    setText,
    setFlattenedData,
    persistState
}: any) => {
    const row = cell?.row?.original || {};

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleDeleteColumn = () => {
        setSelection(row);
        setOpenAlertDialog(true);
        handleCloseMenu();
    };

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleEditDescription = () => {
        setText(row.description || '');
        setEdit(true);
        handleCloseMenu();
    };

    const handleSaveDescription = () => {
        updateState();
        setEdit(false);
    };

    const handleClose = () => {
        setEdit(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
    };

    const updateState = () => {
        setFlattenedData((prevState: any) => {
            const updatedValues = { ...row };

            const updateRows = (rows: any[]) => {
                return rows.map((state: { column: any; subRows: any }) => {
                    const updatedState = {
                        ...state,
                        ...(state.column === updatedValues.originalColumn
                            ? {
                                  ...updatedValues,
                                  isModified: true,
                                  description: text,
                                  column: updatedValues.originalColumn
                              }
                            : {})
                    };

                    if (Array.isArray(state.subRows)) {
                        updatedState.subRows = updateRows(state.subRows);
                    }

                    return updatedState;
                });
            };

            const updatedData = updateRows(prevState);
            persistState(updatedData);
            return updatedData;
        });
    };

    return (
        <>
            <Stack direction="row" alignItems="center" justifyContent="center" mt={-1}>
                <>
                    <IconButton
                        size="large"
                        sx={{
                            color: 'black'
                        }}
                        onClick={handleClick}
                    >
                        <MoreVertIcon />
                    </IconButton>
                </>
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleCloseMenu}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right'
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right'
                    }}
                >
                    <MenuItem onClick={handleEditDescription}>
                        <IconButton size="small">
                            {row.description ? (
                                <EditOutlinedIcon style={{ color: 'blue' }} />
                            ) : (
                                <AddOutlinedIcon style={{ color: 'blue' }} />
                            )}
                        </IconButton>
                        <Typography variant="body1" color="black">
                            {row.description ? 'Edit Description' : 'Add Description'}
                        </Typography>
                    </MenuItem>
                    <MenuItem onClick={handleDeleteColumn}>
                        <IconButton size="small">
                            <DeleteOutlinedIcon style={{ color: 'blue' }} />
                        </IconButton>
                        <Typography variant="body1" color="black">
                            Delete
                        </Typography>
                    </MenuItem>
                </Menu>
            </Stack>
            <Dialog open={edit} onClose={handleClose}>
                <DialogTitle display="flex" justifyContent="space-between" alignItems="center">
                    <Typography
                        variant="h2"
                        component="span"
                        maxWidth={'70%'}
                        textOverflow="ellipsis"
                        overflow="hidden"
                        whiteSpace="nowrap"
                    >
                        {!edit || row.description ? 'Edit Description' : 'Add Description'}
                    </Typography>
                    <CloseOutlinedIcon onClick={handleClose} />
                </DialogTitle>
                <DialogContent>
                    <Box m={2}>
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
                    </Box>
                    <Box display="flex" justifyContent="flex-end">
                        <Button
                            sx={{ my: 1, mx: 2, width: 'auto' }}
                            onClick={handleSaveDescription}
                            variant="contained"
                        >
                            <Typography variant="body1" color="white" fontWeight={500}>
                                Save
                            </Typography>
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
};

const renderArrivalFormatCell = ({
    cell,
    value,
    pageData,
    anchorEl,
    setAnchorEl,
    updateFormatType,
    persistState,
    setFlattenedData,
    validFormatTypes,
    dataMappings,
    resetSuggestionResolve
}: any) => {
    const row = cell?.row?.original || {};
    const hasConflicts = _.get(row, 'suggestions.length') > 0;
    const isResolved = _.get(row, 'resolved') || false;
    const open = Boolean(anchorEl);
    const handleSuggestions = (
        e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLElement>
    ) => {
        setAnchorEl(e.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const renderSuggestions = () => {
        return row?.arrivalOneOf?.map((suggestion: any) => {
            if (suggestion.type !== value)
                return (
                    <Button
                        key={suggestion.type}
                        variant="contained"
                        sx={{ my: 1 }}
                        onClick={() =>
                            updateFormatType(
                                suggestion.type,
                                row,
                                pageData,
                                persistState,
                                setFlattenedData,
                                dataMappings,
                                hasConflicts,
                                setAnchorEl
                            )
                        }
                    >
                        <Typography variant="body1" fontWeight={500} color="white">
                            {`Change Data Type to ${_.capitalize(suggestion.type)}`}
                        </Typography>
                    </Button>
                );
            return null;
        });
    };

    const renderHighSeveritySuggestions = () => {
        return row?.suggestions?.map((suggestion: any) => {
            if (
                row?.arrivalOneOf?.length > 0 &&
                suggestion.message &&
                suggestion.severity !== 'LOW' &&
                suggestion.severity !== 'MEDIUM'
            ) {
                return (
                    <Typography
                        variant="body1"
                        fontWeight={500}
                        key={suggestion.message}
                        maxWidth="400px"
                    >
                        {suggestion.message}
                    </Typography>
                );
            } else {
                return null;
            }
        });
    };

    const hasHighSeveritySuggestions =
        row?.arrivalOneOf?.length > 0 &&
        row?.suggestions?.some(
            (suggestion: any) => suggestion.severity !== 'LOW' && suggestion.severity !== 'MEDIUM'
        );
    if (row?.isModified && row?.isNewlyAdded && row?.arrival_format === 'object')
        return (
            <Box px={2}>
                <Typography variant="h2" component="span">
                    {value}
                </Typography>
            </Box>
        );
    return (
        <Box
            position="relative"
            maxWidth={250}
            display="flex"
            flexDirection="column"
            alignItems={'flex-start'}
            ml={1.5}
        >
            <Box>
                {row?.arrivalOneOf?.length > 0 &&
                    row?.suggestions?.length > 0 &&
                    hasHighSeveritySuggestions &&
                    !isResolved && (
                        <Button
                            startIcon={
                                <Box sx={{ mr: 1 }}>
                                    <ErrorOutlineIcon sx={{ fontSize: 'medium' }} />
                                </Box>
                            }
                            color="error"
                            onClick={handleSuggestions}
                            sx={{
                                minWidth: 'max-content',
                                p: 0,
                                '& .MuiButton-startIcon': { marginRight: '0.25px' },
                                mt: -3,
                                mb: 2,
                                '&:hover': {
                                    backgroundColor: 'transparent'
                                }
                            }}
                        >
                            <Typography
                                variant="caption"
                                component="span"
                                color="grey"
                                fontWeight={400}
                            >
                                Recommended Change
                            </Typography>
                        </Button>
                    )}
                {row?.arrivalOneOf?.length > 0 &&
                    row?.suggestions?.length > 0 &&
                    hasHighSeveritySuggestions &&
                    isResolved && (
                        <Button
                            startIcon={
                                <Box sx={{ mr: 1 }}>
                                    <CheckCircleOutlineIcon sx={{ fontSize: 'medium' }} />
                                </Box>
                            }
                            color="success"
                            onClick={handleSuggestions}
                            sx={{
                                minWidth: 'max-content',
                                p: 0,
                                '& .MuiButton-startIcon': { marginRight: '0.25px' },
                                mt: -3,
                                mb: 2,
                                '&:hover': {
                                    backgroundColor: 'transparent'
                                }
                            }}
                        >
                            <Typography
                                variant="caption"
                                component="span"
                                color="grey"
                                fontWeight={400}
                            >
                                Resolved
                            </Typography>
                        </Button>
                    )}
            </Box>
            <Box
                sx={{
                    display: 'flex',

                    mt: hasHighSeveritySuggestions ? -3 : 0
                }}
            >
                <FormControl variant="standard" sx={{ minWidth: 150, flex: 1, m: 0, p: 0 }}>
                    <Select
                        value={value || 'text'}
                        variant="standard"
                        disableUnderline
                        IconComponent={CustomSelectIcon}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    '& .MuiMenuItem-root': {
                                        my: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }
                                }
                            }
                        }}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            '& .MuiSelect-icon': {
                                right: 'calc(50% - 52px)',
                                top: 'calc(50% - 20px)'
                            },
                            '& .MuiSelect-select': {
                                display: 'flex',
                                alignItems: 'center',
                                ml: 0
                            }
                        }}
                    >
                        {validFormatTypes &&
                            validFormatTypes.map((option: any) => (
                                <MenuItem
                                    onClick={() =>
                                        updateFormatType(
                                            option,
                                            row,
                                            pageData,
                                            persistState,
                                            setFlattenedData,
                                            dataMappings,
                                            hasConflicts,
                                            setAnchorEl
                                        )
                                    }
                                    value={option}
                                    key={option}
                                >
                                    <Typography variant="h2" component="span">
                                        {option}
                                    </Typography>
                                </MenuItem>
                            ))}
                    </Select>
                </FormControl>
            </Box>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center'
                }}
            >
                <Box p={2} maxWidth={336}>
                    {isResolved && (
                        <>
                            <Typography variant="h6" component="span" fontWeight="bold">
                                Resolved
                                <Typography variant="body1" my={2}>
                                    Arrival Format of field <strong>{row?.column}</strong> is
                                    resolved to {value}
                                </Typography>
                            </Typography>
                            <Box my={1}>
                                <Button
                                    key={`${value}-mark-resolved`}
                                    aria-label="resolve-data-type"
                                    variant="contained"
                                    onClick={() =>
                                        resetSuggestionResolve(
                                            row,
                                            pageData,
                                            persistState,
                                            setFlattenedData,
                                            hasConflicts,
                                            setAnchorEl
                                        )
                                    }
                                >
                                    <Typography variant="body1" fontWeight={500} color="white">
                                        Reopen Suggestion
                                    </Typography>
                                </Button>
                            </Box>
                        </>
                    )}
                    {!isResolved &&
                        hasHighSeveritySuggestions &&
                        row?.suggestions?.length > 0 &&
                        row?.arrivalOneOf?.length > 0 && (
                            <>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: '#D96262'
                                    }}
                                >
                                    <ErrorOutlineIcon
                                        sx={{ fontSize: 'large', marginRight: '4px' }}
                                    />{' '}
                                    <Typography variant="h6" component="span" fontSize="1rem">
                                        Must-Fix
                                    </Typography>
                                </Box>
                                <Typography variant="body1" my={2}>
                                    The field <strong>{row?.column}</strong> has multiple arrival
                                    format values available
                                </Typography>
                                {renderHighSeveritySuggestions()}
                                {renderSuggestions()}
                                {row?.arrival_format &&
                                    hasHighSeveritySuggestions &&
                                    row?.suggestions?.length > 0 &&
                                    row?.arrivalOneOf?.length > 0 && (
                                        <Box my={1}>
                                            <Button
                                                key={`${value}-mark-resolved`}
                                                aria-label="resolve-data-type"
                                                onClick={() =>
                                                    updateFormatType(
                                                        value,
                                                        row,
                                                        pageData,
                                                        persistState,
                                                        setFlattenedData,
                                                        hasConflicts,
                                                        dataMappings,
                                                        setAnchorEl
                                                    )
                                                }
                                            >
                                                <Typography
                                                    variant="body1"
                                                    fontWeight={500}
                                                    color="blue"
                                                >
                                                    Mark as resolved
                                                </Typography>
                                            </Button>
                                        </Box>
                                    )}
                            </>
                        )}
                </Box>
            </Popover>
        </Box>
    );
};

export {
    renderColumnCell,
    renderDataTypeCell,
    renderRequiredCell,
    renderActionsCell,
    renderArrivalFormatCell
};
