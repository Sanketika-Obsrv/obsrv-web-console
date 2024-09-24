import { DeleteOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { ButtonGroup, Box, Button, Dialog, Grid, Typography, Tooltip, Chip } from "@mui/material";
import MainCard from "components/MainCard"
import BasicReactTable from "components/BasicReactTable";
import ScrollX from "components/ScrollX";
import React, { useEffect, useState } from "react";
import _, { isEmpty, uniqBy } from "lodash";
import IconButton from "components/@extended/IconButton";
import config from 'data/initialConfig';
import { useDispatch, useSelector } from "react-redux";
import { deleteTransformations, getNonDeletedRows } from "services/dataset";
import { error } from "services/toaster";
import { addState, updateState } from "store/reducers/wizard";
import interactIds from "data/telemetry/interact.json";
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import Loader from "components/Loader";
import { detectPiiFields } from "services/system";
import { v4 } from "uuid";
import { flattenObject } from "services/json-schema";

const { spacing } = config;

const valueMapping: any = {
    "pii": {
        column: 'column',
        transformation: '_transformationType',
        transformation_mode: "transformation_mode",
        id: 'id',
    },
    "transform": {
        column: 'column',
        transformation: '_transformationType',
        expression: 'transformation',
        transformation_mode: "transformation_mode",
        id: 'id',
    },
    "derived": {
        column: 'column',
        transformation: 'transformation',
        transformation_mode: "transformation_mode",
        id: 'id',
    },
}

export const pageMeta = { pageId: 'datasetConfiguration' };

const InputAccordion = (props: any) => {
    const dispatch = useDispatch();
    const { id, title, description, actions, transformation_mode, data, label, dialog, generateInteractTelemetry } = props;
    console.log(props)
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selection, setSelection] = useState<Array<any>>([]);
    const wizardState = useSelector((state: any) => _.get(state, 'wizard.pages'));
    const existingState = _.get(wizardState, [id, 'selection']);
    const mainDatasetId = _.get(wizardState, ['datasetConfiguration', 'state', 'masterId']);
    const pushStateToStore: any = (values: Record<string, any>) => dispatch(addState({ id, ...values }));
    const [selectedValues, setSelectedValues] = useState<any>(null);
    const [edit, setEdit] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const indexColumn = _.get(wizardState, 'timestamp.indexCol');
    const existingTransformationSelections = _.flatten([_.get(wizardState, 'pii.selection') || [], _.get(wizardState, 'transform.selection') || [], _.get(wizardState, 'derived.selection') || [], indexColumn ? [{ column: indexColumn }] : []])
    const filterAddedSuggestions = useSelector((state: any) => state?.wizard?.metadata?.event?.suggestedPii?.suggestedData || state?.wizard?.pages?.datasetConfiguration?.suggestedPii || []);
    const mergedEvent: any = useSelector((state: any) => state?.wizard?.metadata?.event?.mergedEvent || _.get(state,"wizard.pages.sample_data") || {});
    const flattenedEvent = _.has(mergedEvent, "$schema") ? [] : flattenObject(mergedEvent);

    const deleteSelection = async (record: Record<string, any>) => {
        generateInteractTelemetry({ edata: { id: interactIds.delete_dataset_transformation } })
        const dispatchError = () => dispatch(error({ message: "Unable to delete the config item" }))
        setLoading(true)
        try {
            const transformations = await deleteTransformations({ dataset_id: mainDatasetId, field_key: _.get(record, "column") });
            if (_.get(transformations, "data")) {
                const suggestedData = filterAddedSuggestions.filter((item: any) => {
                    return item.column !== record.column
                })
                dispatch(updateState({ id: pageMeta.pageId, suggestedPii: suggestedData }));
                setSelection((preState: Array<any>) => {
                    const data = preState.filter(payload => _.get(payload, 'column') !== _.get(record, 'column'));
                    pushStateToStore({ selection: data });
                    return data;
                })
            }
            else dispatchError();
        } catch (err) {
            dispatchError();
        } finally {
            setLoading(false)
        }
    }

    const handleEditValues = (data: any) => {
        setSelectedValues((prevState: any) => {
            const map = valueMapping[id];
            let mapping: any = {};
            Object.entries(map).map(([key, value]: any) => {
                mapping[key] = _.get(data, [value]);
            });
            return mapping;
        });
        setDialogOpen(true);
        if (data?.isSuggestedField) {
            setEdit(false);
        }
        else {
            setEdit(true);
        }
    }

    const handleAddSuggestedValues = (data: any) => {
        setSelectedValues((prevState: any) => {
            const map = valueMapping[id];
            let mapping: any = {};
            Object.entries(map).map(([key, value]: any) => {
                mapping[key] = _.get(data, [value]);
            });
            return mapping;
        });
        setDialogOpen(true);
        setEdit(false);
    }

    const getSuggestedPiiFields = async () => {
        if (id === "pii") {
            try {
                let response = await detectPiiFields(flattenedEvent, mainDatasetId);
                const uuid = v4();
                const suggestedData = response?.data?.result.map((ele: any) => ({
                    _transformationType: "mask",
                    _transformedFieldDataType: "string",
                    _transformedFieldSchemaType: "string",
                    id: uuid,
                    isModified: true,
                    column: ele?.field,
                    transformation_mode: "Strict",
                    isSuggestedField: true
                }))
                dispatch(updateState({ id: pageMeta.pageId, suggestedPii: suggestedData }));
            } catch (err) {
                console.error("Error fetching suggested fields:", err);
            }
        }
    };

    const filterOutAddedSuggestions = () => {
        const filteredSuggestion = _.uniqBy(filterAddedSuggestions, "column");
        if (!existingState) {
            return filteredSuggestion;
        }
        else {
            return filteredSuggestion.filter((item: any) =>{
                return !existingState.some((key: any) => key.column === item.column)
            }
            );
        }
    };

    useEffect(() => {
        existingState && setSelection(existingState);
        if (isEmpty(filterAddedSuggestions)) {
            getSuggestedPiiFields()
        }
    }, [existingState])

    const renderExpression = (row: Record<string, any>) => {
        const transformation = row?.transformation;
        if (!transformation) return null;
        return <Typography variant="body1" gutterBottom>
            {transformation}
        </Typography>
    }

    const columns = [
        {
            Header: 'Field',
            accessor: 'column',
            Cell: ({ value, cell }: any) => {
                return (
                    <Box minWidth="20vw" maxWidth="35vw">
                        <Typography variant="h5">
                            {value}
                        </Typography>
                    </Box>
                );
            }
        },
        {
            Header: 'Data type',
            accessor: '_transformedFieldDataType',
            Cell: ({ value, cell }: any) => {
                const datatype = _.get(cell,"row.original.datatype")
                return (
                    <Box minWidth="10vw" maxWidth="35vw">
                        <Typography variant="body2">
                            {datatype || value}
                        </Typography>
                    </Box>
                );
            }
        },
        {
            Header: 'Mode',
            accessor: 'transformation_mode',
            Cell: ({ value, cell }: any) => {
                return (
                    <Box minWidth="10vw" maxWidth="35vw">
                        <Typography variant="body2">
                            {value}
                        </Typography>
                    </Box>
                );
            }
        },
        {
            Header: 'Transformation',
            id: 'transformation',
            className: 'cell-center',
            accessor: 'transformation',
            Cell: ({ value, cell }: any) => {
                const row = cell?.row?.original || {};
                const _transformationType = row?._transformationType;
                if (_.get(actions, 'length') < 2 && _transformationType === 'custom')
                    return <Typography variant="body2" onClick={() => handleEditValues(_.get(cell, 'row.original'))}>{renderExpression(row)}</Typography>;
                return <ButtonGroup variant="outlined" aria-label="outlined button group" sx={{ minWidth: "20vw", maxWidth: "30vw", justifyContent: 'center' }}>
                    {
                        actions.map((action: any) => {
                            return (
                                <Button
                                    size="large"
                                    key="one"
                                    sx={{ py: 1, px: 2 }}
                                    variant={_transformationType === action?.value ? 'contained' : 'outlined'}
                                    onClick={() => handleEditValues(_.get(cell, 'row.original'))}
                                >
                                    {action?.label}
                                </Button>
                            );
                        })
                    }
                </ButtonGroup>
            }
        },
        {
            Header: () => null,
            id: 'actions',
            Cell: ({ value, cell }: any) => {
                return <IconButton
                    onClick={(e: any) => deleteSelection(_.get(cell, 'row.original'))}
                >
                    <DeleteOutlined style={{ fontSize: '1.25rem' }} />
                </IconButton>
            }
        }
    ]

    const onDialogClose = () => {
        generateInteractTelemetry({ edata: { id: interactIds.dialog_close } });
        setSelectedValues(null);
        setDialogOpen(false);
        setEdit(false);
    }

    const updateDialogProps = () => {
        const nonDeletedRows = getNonDeletedRows(data)
        return React.cloneElement(dialog, { id, actions, transformation_mode, selection, setSelection, data: nonDeletedRows, onClose: onDialogClose, mainDatasetId, generateInteractTelemetry, selectedValues, edit, existingTransformationSelections, filterAddedSuggestions });
    }

    const renderTable = () => {
        if (!_.get(selection, 'length')) return null;
        return <Grid item xs={12}>
            <MainCard content={false} headerSX={{}}>
                <ScrollX>
                    <BasicReactTable header={true} columns={columns} data={selection} striped={true} />
                </ScrollX>
            </MainCard >
        </Grid>
    }

    const renderSuggestedFields = () => {
        const suggestedFields = filterOutAddedSuggestions();
        if (_.isEmpty(suggestedFields)) return <Button
            onClick={_ => {
                setDialogOpen(true);
                generateInteractTelemetry({ edata: { id: `${interactIds.add_dataset_transformation}:${id}:dialog:open` } })
            }}
            startIcon={<AddOutlinedIcon fontSize="large" />}
        >
            <Typography variant="body2" fontWeight="500">
                {label}
            </Typography>
        </Button>
        else {
            return <Grid sx={{ paddingInline: 1 }}>
                <Grid width="100%">
                    <MainCard content={false}>
                        <Box sx={{ p: 1, textAlign: "start" }}>
                            <Typography variant="body2" fontWeight="500">
                                Add suggested fields :
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: "start", overflowY: "scroll", height: "80px" }}>
                            {suggestedFields.map((ele: any) => (
                                <Chip onDelete={() => {
                                    const suggestedData = filterAddedSuggestions.filter((item: any) => {
                                        return item.column !== ele.column
                                    })
                                    dispatch(updateState({ id: pageMeta.pageId, suggestedPii: suggestedData }));
                                }} key={ele.column} label={ele.column} onClick={() => handleAddSuggestedValues(ele)} sx={{ ml: 1, mb: 1 }} variant="outlined" />
                            ))}
                        </Box>
                    </MainCard>
                </Grid>
                <Grid pt={1}>
                    <Button
                        onClick={_ => {
                            setDialogOpen(true);
                            generateInteractTelemetry({ edata: { id: `${interactIds.add_dataset_transformation}:${id}:dialog:open` } })
                        }}
                        startIcon={<AddOutlinedIcon fontSize="large" />}
                    >
                        <Typography variant="body2" fontWeight="500">
                            {label}
                        </Typography>
                    </Button>
                </Grid>
            </Grid>
        }
    };

    return <>
        {loading && <Loader />}
        {renderTable()}
        <Grid container rowSpacing={spacing} columnSpacing={spacing}>
            <Grid item xs={12} textAlign="end" my={2}>
                {id === "pii" ? renderSuggestedFields() : <Button
                    onClick={_ => {
                        setDialogOpen(true);
                        generateInteractTelemetry({ edata: { id: `${interactIds.add_dataset_transformation}:${id}:dialog:open` } })
                    }}
                    startIcon={<AddOutlinedIcon fontSize="large" />}
                >
                    <Typography variant="body2" fontWeight="500">
                        {label}
                    </Typography>
                </Button>}
            </Grid>
            <Grid item xs={12}>
                <Dialog open={dialogOpen} onClose={_ => setDialogOpen(false)} aria-labelledby={title} aria-describedby={title}>
                    {updateDialogProps()}
                </Dialog>
            </Grid>
        </Grid>
    </>
}

export default InputAccordion;
