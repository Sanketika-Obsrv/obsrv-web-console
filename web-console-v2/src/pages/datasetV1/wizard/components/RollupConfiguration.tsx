import { DeleteOutlined } from "@ant-design/icons"
import { Box, Chip, FormControl, FormHelperText, Grid, MenuItem, Select, TextField, Typography } from "@mui/material"
import { Button, Stack, Dialog } from "@mui/material"
import BasicReactTable from "components/BasicReactTable"
import MainCard from "components/MainCard"
import ScrollX from "components/ScrollX"
import { useEffect, useState } from "react"
import config from 'data/initialConfig';
import IconButton from "components/@extended/IconButton";
import * as _ from 'lodash';
import initialConfig from 'data/initialConfig'
import AddRollup from "./transformationDialogs/AddRollup"
import { useDispatch, useSelector } from "react-redux"
import { addState, updateState } from "store/reducers/wizard"
import interactIds  from "data/telemetry/interact.json"

const { spacing } = config;

const RollupConfiguration = (props: any) => {
    const dispatch = useDispatch();
    const { description, id } = props;
    const existingState: any = useSelector((state: any) => _.get(state, ['wizard', 'pages', id, 'values']));
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [selection, setSelection] = useState<Array<any>>([]);
    const pushStateToStore = (values: Array<any>) => {
        dispatch(addState({ id, values }));
    }

    const deleteSelection = (metadata: Record<string, any>) => {
        setSelection((preState: Array<any>) => {
            const data = preState.filter(payload => _.get(payload, 'field') !== _.get(metadata, 'field'));
            pushStateToStore(data);
            return data;
        })
    }

    useEffect(() => {
        existingState && setSelection(existingState);
    }, [existingState]);

    const columns = [
        {
            Header: 'Field',
            accessor: 'field'
        },
        {
            Header: 'Aggregate Function',
            accessor: 'aggregateFunction'
        },
        {
            Header: 'Rollup Fields',
            accessor: 'rollupFields',
            Cell: ({ value, cell }: any) => {
                if (value) return (
                    <Box>
                        {value.map((item: any) => <Chip sx={{ m: 0.5 }} key={item.value} label={item.label} />)}
                    </Box>);
                else return null;
            }
        },
        {
            Header: 'Rollup Field Name',
            accessor: 'rollupFieldName'
        },
        {
            Header: 'Actions',
            Cell: ({ value, cell }: any) => {
                return <IconButton 
                        data-edataid={interactIds.delete_dataset_rollup}
                        data-objectid="deleteOutlined:rollup"
                        data-objecttype="dataset"
                        variant="contained" onClick={(e: any) => deleteSelection(_.get(cell, 'row.original'))}>
                    <DeleteOutlined />
                </IconButton>
            }
        }
    ];

    const renderRollupGranulatiry = () => {
        const rollupGranularities = initialConfig.rollupGranularityTypes;
        const rollupOptions = _.map(rollupGranularities, rollupGranularity => {
            return <MenuItem value={rollupGranularity}>{_.upperCase(rollupGranularity)} </MenuItem>;
        })

        return <>
            <Grid item xs={12}>
                <Stack direction="row" spacing={2}>
                    <FormControl>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <FormHelperText>Rollup Granularity</FormHelperText>
                            <Select value={'day'} sx={{ minWidth: '200px' }}>
                                {rollupOptions}
                            </Select>
                        </Stack>
                    </FormControl>
                    <FormControl>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <FormHelperText>Rollup Granularity</FormHelperText>
                            <TextField id="outlined-basic" disabled value={'datasetid_rollup_hourly'} />
                        </Stack>
                    </FormControl>
                </Stack>

            </Grid>
        </>
    }

    const renderSelectionTable = () => {
        return <>
            <MainCard content={false} headerSX={{}}>
                <ScrollX>
                    <BasicReactTable columns={columns} data={selection} striped={true} />
                </ScrollX>
            </MainCard >
        </>
    }

    const renderRollupConfigTable = () => {
        return <>
            <Grid item xs={12}> {_.get(selection, 'length') ? renderSelectionTable() : null}</Grid>
            <Grid item xs={12}>
                <Stack spacing={spacing} direction="row" justifyContent="flex-end">
                    <Button
                        data-edataid={interactIds.add_dataset_rollup}
                        data-objectid="addRollup"
                        data-objecttype="dataset"
                        onClick={_ => setDialogOpen(true)}
                    >
                        <Typography variant="body2" fontWeight="500">
                            Add New Rollup
                        </Typography>
                    </Button>
                </Stack>
            </Grid>
            <Grid item xs={12}>
                <Dialog open={dialogOpen} onClose={_ => setDialogOpen(false)}>
                    <AddRollup
                        setSelection={setSelection}
                        onClose={() => setDialogOpen(false)}
                        persistState={pushStateToStore}
                    />
                </Dialog>
            </Grid >
        </>
    }

    return <>
        <Grid container rowSpacing={2}>
            {renderRollupGranulatiry()}
            {renderRollupConfigTable()}
        </Grid>
    </>
}

export default RollupConfiguration
