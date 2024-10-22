import { ButtonGroup, Box, Button, Dialog, Grid, Typography, Chip } from '@mui/material';
import React, { useState } from 'react';
import _ from 'lodash';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { ReactComponent as DeleteIcon } from 'assets/upload/Trash.svg';
import { ReactComponent as EditIcon } from 'assets/upload/Edit.svg';
import CustomTable from 'components/CustomeTable/CustomTable';

const ProcessingSection = (props: any) => {
    const {
        id,
        title,
        actions,
        data,
        handleAddOrEdit,
        handleDelete,
        label,
        dialog,
        transformationOptions,
        jsonData,
        addedSuggestions
    } = props;

    const [dialogOpen, setDialogOpen] = useState(false);

    const [selectedRow, setSelectedRow] = useState<any>(null);

    const [edit, setEdit] = useState<boolean>(false);

    const handleEditValues = (editData: any) => {
        setSelectedRow(editData);

        if (_.get(editData, ['isSuggestedField'])) setEdit(false);
        else setEdit(true);

        setDialogOpen(true);
    };

    const renderExpression = (row: Record<string, any>) => {
        const transformation = row?.transformation;

        if (!transformation) return null;

        return (
            <Typography variant="body1" gutterBottom>
                {transformation}
            </Typography>
        );
    };

    const columns = [
        {
            Header: 'Field',
            accessor: 'column',
            Cell: ({ value, cell }: any) => (
                <Box minWidth="20vw" maxWidth="35vw">
                    <Typography variant="h5">{value}</Typography>
                </Box>
            )
        },
        {
            Header: 'Data type',
            accessor: 'transformationType',
            Cell: ({ value, cell }: any) => {
                const datatype = _.get(cell, 'row.original.datatype');

                return (
                    <Box minWidth="10vw" maxWidth="35vw">
                        <Typography variant="body2">{datatype || value}</Typography>
                    </Box>
                );
            }
        },
        {
            Header: 'Mode',
            accessor: 'transformationMode',
            Cell: ({ value, cell }: any) => (
                <Box minWidth="10vw" maxWidth="35vw">
                    <Typography variant="body2">{value}</Typography>
                </Box>
            )
        },
        {
            Header: 'Transformation',
            id: 'transformation',
            className: 'cell-center',
            accessor: 'transformation',
            Cell: ({ value, cell }: any) => {
                const row = cell?.row?.original || {};

                const transformationType = row?.transformationType;

                if (_.size(actions) < 2 && _.isEqual(transformationType, 'custom'))
                    return (
                        <Typography
                            variant="body2"
                            onClick={() => handleEditValues(_.get(cell, 'row.original'))}
                        >
                            {renderExpression(row)}
                        </Typography>
                    );
                return (
                    <ButtonGroup
                        variant="outlined"
                        aria-label="outlined button group"
                        sx={{ minWidth: '20vw', maxWidth: '30vw' }}
                    >
                        {_.map(actions, (action: any) => (
                            <Button
                                size="large"
                                key="one"
                                sx={{ py: 1, px: 2 }}
                                variant={
                                    _.isEqual(transformationType, _.get(action, 'value', ''))
                                        ? 'contained'
                                        : 'outlined'
                                }
                                onClick={() => handleEditValues(_.get(cell, 'row.original'))}
                            >
                                {_.get(action, 'label', '')}
                            </Button>
                        ))}
                    </ButtonGroup>
                );
            }
        },
        {
            Header: 'Edit',
            id: 'actions',
            Cell: ({ value, cell }: any) => (
                <Button onClick={() => handleEditValues(_.get(cell, 'row.original'))}>
                    <EditIcon />
                </Button>
            )
        },
        {
            Header: 'Delete',
            id: 'actions1',
            Cell: ({ value, cell }: any) => (
                <Button onClick={() => handleDelete(_.get(cell, 'row.original.column'))}>
                    <DeleteIcon />
                </Button>
            )
        }
    ];

    const onDialogClose = () => {
        setDialogOpen(false);

        setSelectedRow(null);

        setEdit(false);
    };

    const updateDialogProps = () =>
        React.cloneElement(dialog, {
            data: selectedRow,
            handleAddOrEdit,
            onClose: onDialogClose,
            edit,
            transformationOptions: !_.isEmpty(selectedRow)
                ? transformationOptions
                : _.difference(transformationOptions, _.map(data, 'column')),
            jsonData,
            addedSuggestions
        });

    const renderTable = () => {
        if (_.isEmpty(data)) return null;

        return (
            <Grid item xs={12}>
                <CustomTable header={true} columns={columns} data={data} striped={true} />
            </Grid>
        );
    };

    const renderSuggestedFields = () => {
        const suggestedFields = _.differenceBy(addedSuggestions, data, 'column');

        if (!_.isEmpty(suggestedFields))
            return (
                <Grid>
                    <Box sx={{ pt: 1, textAlign: 'start' }}>
                        <Typography variant="body2" fontWeight="500">
                            Add suggested fields :
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            textAlign: 'start',
                            overflowY: 'scroll',
                            scrollbarWidth: 'none',
                            height: '5rem',
                            mt: 2
                        }}
                    >
                        {_.map(suggestedFields, (ele: any) => (
                            <Chip
                                onDelete={() => {
                                    addedSuggestions.filter(
                                        (item: any) =>
                                            !_.isEqual(
                                                _.get(item, ['column']),
                                                _.get(ele, ['column'])
                                            )
                                    );
                                }}
                                key={_.get(ele, ['column'])}
                                label={_.get(ele, ['column'])}
                                onClick={() => handleEditValues(ele)}
                                sx={{ ml: 1, mb: 1 }}
                                variant="outlined"
                            />
                        ))}
                    </Box>
                </Grid>
            );
    };

    return (
        <>
            <Grid container>
                <Grid item xs={12} textAlign="end">
                    {_.isEqual(id, 'pii') && renderSuggestedFields()}

                    {renderTable()}

                    <Button
                        onClick={(_) => setDialogOpen(true)}
                        variant="text"
                        startIcon={<AddOutlinedIcon fontSize="large" />}
                        sx={{ mt: 2 }}
                    >
                        <Typography variant="body2" fontWeight="500">
                            {label}
                        </Typography>
                    </Button>
                </Grid>

                <Grid item xs={12}>
                    <Dialog
                        open={dialogOpen}
                        onClose={onDialogClose}
                        aria-labelledby={title}
                        aria-describedby={title}
                    >
                        {updateDialogProps()}
                    </Dialog>
                </Grid>
            </Grid>
        </>
    );
};

export default ProcessingSection;
