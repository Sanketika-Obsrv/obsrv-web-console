import { ButtonGroup, Box, Button, Dialog, Grid, Typography, Chip, Tooltip } from '@mui/material';
import React, { useState } from 'react';
import _ from 'lodash';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { ReactComponent as DeleteIcon } from 'assets/upload/Trash.svg';
import { ReactComponent as EditIcon } from 'assets/upload/Edit.svg';
import CustomTable from 'components/CustomeTable/CustomTable';
import { minWidth, textAlign } from '@mui/system';

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
        addedSuggestions,
        setPiiSuggestions
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
            header: 'Field',
            accessor: 'column',
            minWidth: '2rem',
            Cell: ({ value, cell }: any) => (
                <Tooltip title={value}>
                    <Box>
                        <Typography variant="h4">{value}</Typography>
                    </Box>
                </Tooltip>
            )
        },
        {
            header: 'Data Type',
            accessor: 'transformationType',
            Cell: ({ value, cell }: any) => {
                const datatype = _.capitalize(_.get(cell, 'row.original.datatype'));

                return (
                    <Tooltip title={datatype || value}>
                        <Box>
                            <Typography variant="body2">{datatype || value}</Typography>
                        </Box>
                    </Tooltip>
                );
            }
        },
        {
            header: (id === 'pii') ? 'Action':'Transformation',
            id: 'transformation',
            minWidth: '0.5rem',
            className: 'cell-center',
            accessor: 'transformation',
            Cell: ({ value, cell }: any) => {
                const row = cell?.row?.original || {};
                const transformationType = row?.transformationType;

                if (id === 'transform' || id === 'derived')
                    return (
                        <Tooltip title={row?.transformation}>
                            <Typography
                                variant="body2"
                                onClick={() => handleEditValues(_.get(cell, 'row.original'))}
                            >
                                {renderExpression(row)}
                            </Typography>
                        </Tooltip>
                    );
                return (
                    
                    <Tooltip title={transformationType === 'custom' ? 'JSONata' : _.capitalize(transformationType)}>
                        <ButtonGroup
                            variant="outlined"
                            aria-label="outlined button group"
                            sx={{ minWidth: '20vw', maxWidth: '30vw' }}
                        >
                            <Box>
                                {transformationType === 'custom' ? 'JSONata' : _.capitalize(transformationType)}
                            </Box>
                        </ButtonGroup>
                    </Tooltip>
                );
            }
        },
        {
            header: 'Skip Record on Failure?',
            accessor: 'transformationMode',
            Cell: ({ value, cell }: any) => (
                <Tooltip title={value === 'Strict' ? 'Skip the event' : 'Process the event'}>
                    <Box >    
                        <Typography variant="body2">{value === 'Strict' ? 'Yes' : 'No'}</Typography>
                    </Box>
                </Tooltip>
            )
        },
        {
            header: 'Actions',
            id: 'actions',
            textAlign: 'center',
            Cell: ({ value, cell }: any) => (
                <Box sx={{textAlign: 'center'}}>
                    <Button onClick={() => handleEditValues(_.get(cell, 'row.original'))} sx={{minWidth: '40px'}}>
                        <Tooltip title="Edit">
                            <EditIcon/>
                        </Tooltip>
                    </Button>
                    <Button onClick={() => handleDelete(_.get(cell, 'row.original.column'))} sx={{minWidth: '40px'}}>
                        <Tooltip title="Delete">
                            <DeleteIcon />
                        </Tooltip>
                    </Button>
                </Box>
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

        const handleRemoveSuggestion = (suggestion: any) => {
            setPiiSuggestions((prevSuggestions:any) =>
              prevSuggestions.filter((item:any) => !_.isEqual(_.get(item, 'column'), _.get(suggestion, 'column')))
            );
          };

          if (!_.isEmpty(suggestedFields))
            return (
              <Grid>
                <Box sx={{ pt: 1, textAlign: 'start' }}>
                  <Typography variant="body2" fontWeight="500">
                    Add suggested fields:
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
                      onDelete={() => handleRemoveSuggestion(ele)}
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
