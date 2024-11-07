import {
    Stack,
    Box,
    Grid,
    Typography,
    Button,
    Popover,
    Chip,
    Select,
    MenuItem,
    TextField
} from '@mui/material';
import BasicReactTable from 'components/CustomeTable/CustomTable';
import React, { useEffect, useState } from 'react';
import config from 'data/initialConfig';
import * as _ from 'lodash';
import { useNavigate } from 'react-router';
import { DatasetStatus, DatasetType } from 'types/datasets';
import schema from './Schema';
import { ReactComponent as DeleteIcon } from 'assets/upload/Trash.svg';
import JSONataPlayground from 'components/JsonPlay/JSONataPlayground';
import { evaluateDataType } from 'pages/StepsPages/Processing/utils/dataTypeUtil';
import { theme } from 'theme';
import { FormControl } from '@mui/material';
import { InputLabel } from '@mui/material';

const { spacing } = config;

export const getMasterDatasets = (datasets: Array<any>) => {
    return _.filter(
        datasets,
        (dataset: Record<string, any>) =>
            _.get(dataset, 'type') === DatasetType.MasterDataset &&
            [DatasetStatus.Live].includes(_.get(dataset, 'status'))
    );
};

const DataDenorm = (props: any) => {
    const { data, transformationOptions, masterDatasets, handleAddOrEdit, handleDelete, jsonData } =
        props;

    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [transformErrors, setTransformErrors] = useState<boolean>(false);
    const [evaluationData, setEvaluationData] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false)
    const [formErrors, setFormErrors] = useState<any>("");

    const [formData, setFormData] = useState<{ [key: string]: unknown }>({});

    const navigate = useNavigate();
    const open = Boolean(anchorEl);

    const [inputs, setInputs] = useState<any>({});

    const handleOnChange = (event: any) => {
        const name = event.target.name;
        const value = event.target.value;
        setInputs((values: any) => ({ ...values, [name]: value }))
    }

    const handleClear = () => {
        setLoading(true)
        setInputs({})
        setTimeout(() => { setLoading(false) }, 200)
    }


    const masterDatasetNotFound = () => (
        <Grid item xs={12}>
            <Stack spacing={spacing} direction="column" justifyContent="center" alignItems="center">
                <Typography variant="body1" fontWeight={500}>
                    There are no master datasets configured in the system. Please create one to
                    setup data denormalization for the dataset.
                </Typography>
                <Box>
                    <Button
                        data-objectid="createMasterDataset"
                        data-objecttype="masterDataset"
                        onClick={(_) => openCreateMasterDataset()}
                        variant="contained"
                        size="large"
                        sx={{ width: 'auto' }}
                    >
                        Create Master Dataset
                    </Button>
                </Box>
            </Stack>
        </Grid>
    );

    const openCreateMasterDataset = () => {
        navigate(`/home/new-dataset`, {
            state: { replace: true, refreshMaster: true }
        });
    };

    const closeTransformations = () => {
        setAnchorEl(null);
    };

    const masterDatasetFound = () => {
        if (!_.isEmpty(transformationOptions)) {
            const filterData = _.difference(transformationOptions, _.map(data, 'denorm_key'));

            _.set(
                schema,
                ['schema', 'properties', 'section', 'properties', 'dataset', 'enum'],
                filterData
            );
        }
        const selectOptions = _.uniqWith(
            _.compact(
                _.map(masterDatasets, (dataset) => {
                    const name = _.get(dataset, 'name');
                    const value = _.get(dataset, ['dataset_config', 'redis_db']);

                    if (name && value) return { const: value, title: name };
                })
            ),
            _.isEqual
        );

        _.set(
            schema,
            ['schema', 'properties', 'section', 'properties', 'masterDataset', 'oneOf'],
            selectOptions
        );

        const onHandleDelete = async (data: any) => {
            const obj = {
                denorm_config: {
                    values: data,
                    denorm_fields: [
                        {
                            value: data,
                            action: 'remove'
                        }
                    ]
                }
            };

            handleDelete(obj);
        };

        const columns = [
            {
                header: 'Dataset Field',
                id: 'Dataset Field',
                accessor: 'denorm_key',
                Cell: ({ value }: any) => {
                    const showChip = value.startsWith('$');
                    return (
                        <Box>
                            {value}
                            {showChip && <Chip label="Transformation" sx={{ ml: 2 }} />}
                        </Box>
                    );
                }
            },
            {
                header: 'Master Dataset',
                id: 'Master Dataset',
                accessor: 'dataset_id'
                // Cell: ({ value, cell }: any) => {
                //     const dataset = _.find(masterDatasets, ['dataset_config.redis_db', value]);

                //     return (
                //         <Box>
                //             <Typography>{_.get(dataset, 'name')}</Typography>
                //         </Box>
                //     );
                // }
            },
            {
                header: 'Input Field (to store the data)',
                id: 'Input Field (to store the data)',
                accessor: 'denorm_out_field'
            },
            {
                header: 'Delete',
                id: 'Delete',
                Cell: ({ value, cell }: any) => (
                    <Button onClick={() => onHandleDelete(_.get(cell, 'row.original'))}>
                        <DeleteIcon />
                    </Button>
                )
            }
        ];

        const handleClose = () => {
            if (!transformErrors) {
                const newData = _.cloneDeep(formData);

                // const keyPath = ['section0', 'section', 'transformation'];
                const keyPath = ['transformation'];
                _.set(inputs, keyPath, evaluationData);

                setFormData(newData);
            }

            setAnchorEl(null);
        };

        const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
            setAnchorEl(event.currentTarget);
        };

        const onHandleClick = async () => {
            const transformationValue = _.get(inputs, 'transformation');
            const denorm_key = transformationValue
                ? `${transformationValue}`
                : _.get(inputs, 'denorm_key');

            const obj = {
                values: data,
                denorm_fields: [
                    {
                        value: {
                            denorm_key,
                            denorm_out_field: _.get(inputs, 'denorm_out_field'),
                            dataset_id: _.get(inputs, 'dataset_id')
                        },
                        action: 'upsert'
                    }
                ]
            };

            handleAddOrEdit(obj);
            handleClear()
        };
        const isValidFrom = inputs.denorm_key && inputs.dataset_id && inputs.denorm_out_field;
        return (
            <>
                {loading ? <></> : <>
                    <Grid container spacing={2}>
                        <Grid item lg={6}>
                            <FormControl fullWidth required>
                                <InputLabel
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        top: '0.125rem'
                                    }}
                                >
                                    Select Dataset Field
                                </InputLabel>
                                <Select
                                    label="Select Dataset Field"
                                    sx={{
                                        backgroundColor: theme.palette.common.white
                                    }}
                                    name='denorm_key'
                                    // value={filterByChip ? filterByChip.id : 'clear'}
                                    onChange={(event: any) => {
                                        handleOnChange(event)
                                    }}
                                >
                                    <MenuItem value="">none</MenuItem>
                                    {_.isEmpty(transformationOptions) ? <MenuItem disabled>
                                        No filters available
                                    </MenuItem> : transformationOptions?.map((menu: any) => {
                                        return <MenuItem key={menu.id} value={menu}>
                                            {menu}
                                        </MenuItem>
                                    })}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item lg={6}>
                            <FormControl fullWidth required>
                                <InputLabel
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        top: '0.125rem'
                                    }}
                                >
                                    Select Master Dataset
                                </InputLabel>
                                <Select
                                    label="Select Master Dataset"
                                    sx={{
                                        backgroundColor: theme.palette.common.white
                                    }}
                                    name='dataset_id'
                                    onChange={(event) => {
                                        handleOnChange(event)
                                    }}
                                >
                                    <MenuItem value="">none</MenuItem>
                                    {_.isEmpty(masterDatasets) ? <MenuItem disabled>
                                        No filters available
                                    </MenuItem> : masterDatasets?.map((menu: any) => {
                                        return <MenuItem key={menu?.dataset_id} value={menu?.dataset_id}>
                                            {menu?.dataset_id}
                                        </MenuItem>
                                    })}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                    <Grid container spacing={2} mt={1}>
                        <Grid item lg={6}>
                            <FormControl fullWidth>
                                <TextField
                                    name='denorm_out_field'
                                    required={true}
                                    label="Input Field (to store the data)"
                                    variant="outlined"
                                    onChange={(event) => { handleOnChange(event) }} />
                            </FormControl>
                        </Grid>
                    </Grid>
                    <Grid container mt={2} display={"flex"} justifyContent={"flex-end"}>
                        <Box mx={2}>
                            <Button onClick={handleClick} sx={{ width: 'auto' }}>
                                Try Out
                            </Button>
                        </Box>

                        <Button
                            variant="contained"
                            autoFocus
                            onClick={onHandleClick}
                            disabled={
                                _.isEmpty(inputs) ? true : !isValidFrom
                            }
                            size="large"
                            sx={{ width: 'auto' }}
                        >
                            Add
                        </Button>
                    </Grid>
                    <Popover
                        open={open}
                        anchorEl={anchorEl}
                        onClose={handleClose}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'left'
                        }}
                        PaperProps={{
                            sx: { height: '100%', width: '100%', overflow: 'hidden' }
                        }}
                    >
                        <JSONataPlayground
                            sample_data={jsonData}
                            handleClose={handleClose}
                            evaluationData={evaluationData}
                            setEvaluationData={setEvaluationData}
                            setTransformErrors={setTransformErrors}
                            transformErrors={transformErrors}
                            closeTransformations={closeTransformations}
                        />
                    </Popover>
                    {_.isEmpty(data) ? <></> : <Grid item xs={12}>
                        <BasicReactTable columns={columns} data={data} striped={true} />
                    </Grid>}
                </>}
            </>
        );
    };

    return (
        <Grid container rowSpacing={spacing}>
            {!_.isEmpty(masterDatasets) ? masterDatasetFound() : masterDatasetNotFound()}
        </Grid>
    );
};

export default DataDenorm;
