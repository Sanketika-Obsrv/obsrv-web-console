import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {
    Box,
    Card,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    Select,
    Stack,
    SvgIcon,
    SvgIconProps,
    Typography,
    useTheme
} from '@mui/material';
import * as _ from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { default as schemaDetailsStyle} from '../SchemaDetails/SchemaDetails.module.css';

import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { Button, MenuItem } from '@mui/material';
import CollapsibleSuggestions from 'components/CollapsibleSuggestions/CollapsibleSuggestions';
import ExpandingTable from 'components/ExpandingTable/ExpandingTable';
import Loader from 'components/Loader';
import Retry from 'components/Retry/Retry';
import IconButtonWithTips from 'components/ToolTip/IconButtonWithTips';
import { useAlert } from 'contexts/AlertContextProvider';
import ReUploadFiles from 'pages/DatasetCreation/ReUploadFiles';
import { useNavigate, useParams } from 'react-router-dom';
import { useFetchDatasetsById, useUpdateDataset } from 'services/dataset';
import { dataMappings } from 'utils/dataMappings';
import Actions from '../../../../components/ActionButtons/Actions';
import AlertDialog from '../../../../components/AlertDialog/AlertDialog';
import {
    areConflictsResolved,
    downloadJSONSchema,
    getFilteredData,
    getNesting,
    prepareFieldsFromJson
} from '../../../../services/json-schema';
import {
    resetSuggestionResolve,
    updateDataType,
    updateFormatType
} from '../../../../utils/dataTypeUtil';
import { downloadJsonFile } from '../../../../utils/downloadUtils';
import {
    renderActionsCell,
    renderArrivalFormatCell,
    renderColumnCell,
    renderDataTypeCell,
    renderRequiredCell
} from '../../../../utils/renderCells';
import { EditLiveDataset } from './EditLiveDataset';
import { KeyboardArrowDownOutlined, KeyboardArrowRightOutlined } from '@mui/icons-material';

export const validFormatTypes = [
    'text',
    'number',
    'boolean',
    'object',
    'array'
];
const alertDialogContext = {
    title: 'Delete Column',
    content: 'Are you sure you want to delete this column ?'
};

interface columnFilter {
    label: string;
    id: string;
    lookup: string;
    color: 'default' | 'error' | 'warning' | 'success' | 'primary' | 'secondary' | 'info';
    edata: string;
}

const columnFilters: columnFilter[] = [
    {
        label: 'Must-Fix',
        id: 'MUST-FIX',
        lookup: 'severity',
        color: 'error',
        edata: 'schemaFilter:mustFix'
    },
    {
        label: 'Resolved',
        id: 'RESOLVED',
        lookup: 'resolved',
        color: 'success',
        edata: 'schemaFilter:resolved'
    }
];

function SuggestionsIcon(props: SvgIconProps) {
    return (
        <SvgIcon {...props}>
            <path
                d="M18 3.00001V3.00001C19.6569 3.00001 21 4.34315 21 6.00001L21 8.14286C21 8.47698 21 8.64405 20.9234 8.76602C20.8834 8.82962 20.8296 8.8834 20.766 8.92336C20.644 9 20.477 9 20.1429 9L15 9M18 3.00001V3.00001C16.3431 3.00001 15 4.34315 15 6.00001L15 9M18 3.00001L7 3.00001C5.11438 3.00001 4.17157 3.00001 3.58579 3.58579C3 4.17158 3 5.11439 3 7.00001L3 21L6 20L9 21L12 20L15 21L15 9"
                stroke="#056ECE"
                strokeWidth="2"
            />
            <path d="M7 7L11 7" stroke="#056ECE" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 11H7" stroke="#056ECE" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 15L10 15" stroke="#056ECE" strokeWidth="2" strokeLinecap="round" />
        </SvgIcon>
    );
}

const configDetailKey = 'configDetails';

const SchemaDetails = (props: { showTableOnly?: boolean }) => {
    const { showTableOnly } = props;

    const theme = useTheme();
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const { datasetId }:any = useParams();
    const [selection, setSelection] = useState<Record<string, any>>({});
    const [flattenedData, setFlattenedData] = useState<Array<Record<string, any>>>([]);
    const [openAlertDialog, setOpenAlertDialog] = useState(false);
    const [filterByChip, setFilterByChip] = useState<columnFilter | null>(null);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [requiredFieldFilters, setRequiredFieldFilters] = useState<string>('');
    const [datasetName, setDatasetName] = useState<string>('');
    const [datasetType, setDatasetType] = useState<string>('');
    const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
    const [versionKey, setVersionKey] = useState<string>('');
    const [allConflictsResolved, setAllConflictsResolved] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [isErrorUpload, setIsErrorUpload] = useState(false);

    const [skipPageReset, setSkipPageReset] = useState(false);
    const [atleastOneFieldPresent, setAtleastOneFieldPresent] = useState(true);
    const [jsonSchema, setJsonSchema] = useState({});
    const updateDataset = useUpdateDataset();
    

    const fetchDatasetById = useFetchDatasetsById({
        datasetId,
        queryParams: 'status=Draft&mode=edit&fields=data_schema,version_key,name,type,dataset_config,connectors_config,dataset_id'
    });

    useEffect(() => {
        if (fetchDatasetById.data) {
            if (datasetId) {
                setDatasetName(_.get(fetchDatasetById, ['data', 'name']));
                setDatasetType(_.get(fetchDatasetById, ['data', 'type']));
                setVersionKey(_.get(fetchDatasetById, ['data', 'version_key']));
                setSelectedConnectorId(_.get(_.get(fetchDatasetById, ['data', 'connectors_config'])[0], 'connector_id'));
            }

            const { properties } = fetchDatasetById.data.data_schema || {};
            if (properties) {
                setJsonSchema(_.omit(properties, ['configurations', 'dataMappings']));
            }
        }
    }, [fetchDatasetById.data]);

    const [schemaState, setSchemaState] = useState({
        schema: flattenedData,
        error: !areConflictsResolved(flattenedData)
    });

    const persistState = (data?: any) => {
        const newState = {
            schema: data || flattenedData,
            error: !areConflictsResolved(data || flattenedData)
        };
        setSchemaState(newState);
    };
    const columns = useMemo(() => {
        const baseColumns = [
            {
                Header: () => (
                    <Typography variant="h2" component="span" > Fields </Typography>
                ),
                accessor: 'column',
                tipText: 'Name of the field.',
                editable: false,
                Cell: ({ row, value, cell }: any) => {
                    const collapseIcon = row.isExpanded ? (
                        <KeyboardArrowDownOutlined />
                    ) : (
                        
                        <KeyboardArrowRightOutlined />
                    );
                    const isSubRow = cell?.row?.depth > 0;
                    const isObjectType = row.original.arrival_format === 'object';

                    const depthIndentation = `${cell?.row?.depth * 4}rem`;
                    const paddingLeft = isSubRow && isObjectType ? depthIndentation : '0.5rem';

                    return (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                pl: paddingLeft
                            }}
                        >
                            {row.original.canExpand && (
                                <IconButton
                                    {...row.getToggleRowExpandedProps()}
                                    sx={{
                                        backgroundColor: '#ffffff',
                                        color: '#056ECE',
                                        borderRadius: '4px',
                                        height: 22,
                                        width: 22,
                                        mr: 1,
                                        '&:hover': {
                                            backgroundColor: '#056ECE',
                                            color: '#ffffff'
                                        }
                                    }}
                                >
                                    {collapseIcon}
                                </IconButton>
                            )}
                            
                            {renderColumnCell({
                                cell,
                                value,
                                persistState,
                                setFlattenedData
                            })}
                        </Box>
                    );
                }
            },
            {
                Header: () => (
                    <Typography variant="h2" component="span" > Arrival format </Typography>
                ),
                accessor: 'arrival_format',
                tipText: 'Arrival format of the field',
                editable: false,
                Cell: ({ value, cell, row }: any) => {
                    const [anchorEl, setAnchorEl] = useState<
                        HTMLButtonElement | HTMLElement | null
                    >(null);
                    const pageData = [jsonSchema] || {};

                    return renderArrivalFormatCell({
                        cell,
                        value,
                        pageData,
                        updateFormatType,
                        persistState,
                        anchorEl,
                        setAnchorEl,
                        resetSuggestionResolve,
                        setFlattenedData,
                        validFormatTypes,
                        dataMappings,
                        disabled: row['canExpand']
                    });
                }
            },
            {
                Header: () => (
                    <Typography variant="h2" component="span" > Data type </Typography>
                ),
                accessor: 'data_type',
                tipText: 'Data type of the field',
                errorBg: true,
                editable: false,
                Cell: ({ value, cell, row }: any) => {
                    const pageData = [jsonSchema] || {};
                    const arrival_format = _.get(row, ['original', 'arrival_format']);

                    const validDatatypes = _.keys(
                        _.get(dataMappings, [arrival_format, 'store_format'])
                    );
                    const [anchorEl, setAnchorEl] = React.useState<
                        HTMLButtonElement | HTMLElement | null
                    >(null);
                    return renderDataTypeCell({
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
                    });
                }
            }
        ];

        if (!showTableOnly) {
            baseColumns.push(
                {
                    Header: () => (
                        <Box display="flex" alignItems="center">
                            <Typography variant="h2" component="span" > Required</Typography>
                        </Box>
                    ),
                    accessor: 'isRequired',
                    tipText: 'Field is required',
                    editable: false,
                    Cell: ({ value, cell }: any) => {
                        return renderRequiredCell({
                            cell,
                            value,
                            setFlattenedData,
                            persistState
                        });
                    }
                },
                {
                    Header: () => <Typography />,
                    accessor: 'actions',
                    tipText: 'Perform actions on the field',
                    editable: false,
                    Cell: ({ value, cell, row }: any) => {
                        const [edit, setEdit] = useState(false);
                        const [text, setText] = useState('');
                        return renderActionsCell({
                            cell,
                            value,
                            setSelection,
                            setOpenAlertDialog,
                            theme,
                            text,
                            setText,
                            edit,
                            setEdit,
                            persistState,
                            setFlattenedData
                        });
                    }
                }
            );
        }

        return baseColumns;
    }, [showTableOnly, requiredFieldFilters, flattenedData]);

    useEffect(() => {
        if (jsonSchema) resetColumns(jsonSchema, false);
    }, [jsonSchema]);

    const resetColumns = (schema: any, overwrite = true) => {
        const flattenedSchema = prepareFieldsFromJson(schema);

        setFlattenedData(flattenedSchema);
        persistState(flattenedSchema);
        setSkipPageReset(false);
    };

    const handleNavigate = () => {
        navigate(`/dataset/edit/ingestion/meta/${datasetId}`, {
            state: {datasetName, datasetType, selectedConnectorId}
        })
    };

    const markRowAsDeleted = (cellValue: Record<string, any>) => {
        const column = cellValue?.originalColumn;

        setFlattenedData((prevState: Array<any>) => {
            const updateRows = (rows: Array<any>): Array<any> => {
                return rows.map((row) => {
                    let updatedRow = { ...row };
                    if (column && _.get(row, 'column') === column) {
                        updatedRow = {
                            ...row,
                            isModified: true,
                            isDeleted: true,
                            resolved: true
                        };
                    }

                    if (row.subRows && row.subRows.length > 0) {
                        const updatedSubRows = updateRows(row.subRows);

                        if (updatedSubRows.every((subRow) => subRow.isDeleted)) {
                            updatedRow = {
                                ...updatedRow,
                                isModified: true,
                                isDeleted: true,
                                resolved: true,
                                subRows: updatedSubRows
                            };
                        } else {
                            updatedRow = {
                                ...updatedRow,
                                subRows: updatedSubRows
                            };
                        }
                    }

                    return updatedRow;
                });
            };

            const updatedData = updateRows(prevState);

            persistState(updatedData);
            return updatedData;
        });
    };

    const fetchNonDeletedData = (flattenedData: Array<any>): Array<any> => {
        const filterDeleted = (rows: Array<any>): Array<any> => {
            return rows
                .filter((row) => !row.isDeleted)
                .map((row) => ({
                    ...row,
                    subRows: Array.isArray(row.subRows) ? filterDeleted(row.subRows) : []
                }));
        };

        return filterDeleted(flattenedData);
    };

    const sortBySuggestions = (payload: Array<any>) =>
        _.sortBy(payload, (value) => value?.suggestions);

    const updateMyData = (rowIndex: number, columnId: any, value: any) => {
        setSkipPageReset(true);
    };

    const handleAlertDialogClose = () => {
        setOpenAlertDialog(false);
    };

    const handleAlertDialogAction = () => {
        if (selection) {
            markRowAsDeleted(selection);
            setSelection({});
        }
    };
    const objectTransformation = (data: any[]): Record<string, any> => {
        const result: Record<string, any> = {};
        const keyCounter: Record<string, number> = {}; // Track occurrences of each key

        data.forEach(
            (
                item: {
                    subRows: any[];
                    oneof?: any[];
                    arrivalOneOf?: any[];
                    suggestions?: any[];
                    column?: string;
                    originalColumn?: string;
                    canExpand?: boolean;
                    isExpanded?: boolean;
                    description?: string;
                    isDeleted?: boolean;
                },
                index
            ) => {
                if (item?.isDeleted) return;
                const {
                    subRows,
                    oneof,
                    arrivalOneOf,
                    suggestions,
                    column,
                    originalColumn,
                    canExpand,
                    isExpanded,
                    description,
                    ...rest
                } = item;

                const filteredRest: Record<string, any> = {
                    ...rest,
                    ...(description && description !== '' ? { description } : {}),
                    ...(oneof && oneof.length > 0 ? { oneof } : {}),
                    ...(arrivalOneOf && arrivalOneOf.length > 0 ? { arrivalOneOf } : {}),
                    ...(suggestions && suggestions.length > 0 ? { suggestions } : {})
                };

                if (Array.isArray(subRows) && subRows.length > 0) {
                    filteredRest.properties = objectTransformation(subRows);
                }

                const key = item.column || `col${index}`;

                // Track how many times the key has been used and append a number for duplicates
                if (keyCounter[key] === undefined) {
                    keyCounter[key] = 1; // First occurrence of this key
                } else {
                    keyCounter[key] += 1; // Increment for duplicates
                }

                const uniqueKey = keyCounter[key] > 1 ? `${key}_${keyCounter[key]}` : key;

                result[uniqueKey] = filteredRest;
            }
        );

        return result;
    };

    const handleButtonClick = (id: string) => {
        const { properties, $schema, ...rest } = fetchDatasetById.data.data_schema;
        if (id === 'btn1') {
            if (jsonSchema && flattenedData) {
                const data = _.get(
                    downloadJSONSchema(
                        { schema: jsonSchema },
                        { schema: flattenedData },
                        { schema: $schema }
                    ),
                    'schema'
                );
                downloadJsonFile(data, 'json-schema');
            }
        } else {
            const propertiesObject = objectTransformation(flattenedData);

            const cleanedData = {
                data_schema: {
                    $schema,
                    type: 'object',
                    properties: propertiesObject,
                    additionalProperties: true
                },
                dataset_id: datasetId
            };

            updateDataset.mutate(
                {
                    data: cleanedData
                },
                {
                    onSuccess: () => {
                        showAlert('Schema updated successfully', 'success');
                        navigate(`/dataset/edit/processing/${datasetId}`);
                    }
                }
            );
        }
    };

    const handleFilterChange = (filter: columnFilter) => {
        setFilterByChip(filter);
    };

    const deleteFilter = () => {
        setFilterByChip(null);
    };

    const handleSuggestionsView = () => {
        setShowSuggestions((prevState) => !prevState);
    };
    const fetchFilterCount = (filter: columnFilter) => {
        const countSuggestions = (obj: any): { mustFixCount: number; resolvedCount: number } => {
            let mustFixCount = 0;
            let resolvedCount = 0;

            _.forOwn(obj, (value, key) => {
                if (key === 'suggestions' && Array.isArray(value)) {
                    value.forEach((suggestion: any) => {
                        if (suggestion.severity === 'MUST-FIX') {
                            if (obj.resolved === false) {
                                mustFixCount += 1;
                            }
                            if (obj.resolved === true) {
                                resolvedCount += 1;
                            }
                        }
                    });
                } else if (value && typeof value === 'object') {
                    const counts = countSuggestions(value);
                    mustFixCount += counts.mustFixCount;
                    resolvedCount += counts.resolvedCount;
                }
            });

            return { mustFixCount, resolvedCount };
        };
        const { mustFixCount, resolvedCount } = countSuggestions(flattenedData);

        if (filter.lookup === 'severity') {
            if (filter.id === 'MUST-FIX') {
                return mustFixCount;
            }
        } else if (filter.lookup === 'resolved') {
            if (filter.id === 'RESOLVED') {
                return resolvedCount;
            }
        } else {
            const notDeleted = _.filter(flattenedData, (payload) => !_.has(payload, 'isDeleted'));
            const filteredSize = _.size(_.filter(notDeleted, [filter.lookup, filter.id]));
            return filteredSize;
        }
        if (mustFixCount === 0) setAllConflictsResolved(true);
        return 0;
    };

    useEffect(() => {
        const mustFixFilter = columnFilters.find((filter) => filter.id === 'MUST-FIX');
        if (mustFixFilter) {
            const mustFixCount = fetchFilterCount(mustFixFilter);
            setAllConflictsResolved(mustFixCount === 0);
        }
        setAtleastOneFieldPresent(
            flattenedData ? !_.every(flattenedData, { isDeleted: true }) : true
        );
    }, [columnFilters, flattenedData]);

    const handleClearFilters = () => {
        deleteFilter();
    };

    const filterData = (data: Record<string, any>[]) => {
        if (!filterByChip) return data;

        return getFilteredData(data, filterByChip.lookup);
    };

    const tableData = sortBySuggestions(
        getNesting(fetchNonDeletedData(filterData(flattenedData)), jsonSchema)
    ) as [];

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Loader
                loading={fetchDatasetById.isPending || fetchDatasetById.isFetching || uploadLoading}
                descriptionText="Please wait while we process your request."
            />

            {!(
                fetchDatasetById.isPending ||
                fetchDatasetById.isFetching ||
                uploadLoading
            ) && (
                    (updateDataset.isError || isErrorUpload) ? (
                        <Retry
                            buttonLabel="Retry"
                            onButtonClick={() => navigate(0)}
                            description="Something went wrong."
                        />
                    ) : (
                        <Box
                            sx={{
                                flex: 1,
                                overflowY: 'auto',
                                paddingBottom: '80px',
                                mx: 4,
                            }}
                        >
                            {!showTableOnly && (
                                <>
                                    <Box>
                                        <Button
                                            variant="back"
                                            startIcon={
                                                <KeyboardBackspaceIcon
                                                    className={schemaDetailsStyle.iconStyle}
                                                />
                                            }
                                            onClick={handleNavigate}
                                        >
                                            Back
                                        </Button>
                                    </Box>

                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                    >
                                        
                                        <Box>
                                            <Typography variant='h1'>Schema Details</Typography>
                                        </Box>

                                        <Box display="flex" alignItems="center">
                                            <Stack direction="row" spacing={2}>
                                                <FormControl sx={{ minWidth: 150 }}>
                                                    <InputLabel>
                                                        Filter by
                                                    </InputLabel>
                                                    <Select
                                                        label="Filter by"
                                                        sx={{
                                                            height: '45px',
                                                            width: '150px',
                                                            backgroundColor: theme.palette.common.white
                                                        }}
                                                        value={filterByChip ? filterByChip.id : 'clear'}
                                                        onChange={(event) => {
                                                            const selectedFilterId = event.target.value as string;
                                                            if (selectedFilterId === 'clear') {
                                                                handleClearFilters();
                                                            } else {
                                                                const selectedFilter = columnFilters.find(
                                                                    (filter) => filter.id === selectedFilterId
                                                                );
                                                                if (selectedFilter) {
                                                                    handleFilterChange(selectedFilter);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <MenuItem value="clear">All</MenuItem>
                                                        {columnFilters?.length ? (
                                                            columnFilters.map((filter) => (
                                                                <MenuItem key={filter.id} value={filter.id}>
                                                                    {filter.label} ({fetchFilterCount(filter)})
                                                                </MenuItem>
                                                            ))
                                                        ) : (
                                                            <MenuItem disabled>
                                                                No filters available
                                                            </MenuItem>
                                                        )}
                                                    </Select>
                                                </FormControl>
                                                <ReUploadFiles
                                                    resetColumns={resetColumns}
                                                    setUploadLoading={setUploadLoading}
                                                    setIsErrorUpload={setIsErrorUpload}
                                                    datasetConfig={
                                                        fetchDatasetById && fetchDatasetById.data?.dataset_config
                                                    }
                                                />
                                                <IconButtonWithTips
                                                    icon={
                                                        <SuggestionsIcon
                                                            sx={{
                                                                color: 'transparent',
                                                                fontSize: '1.25rem'
                                                            }}
                                                        />
                                                    }
                                                    handleClick={handleSuggestionsView}
                                                    buttonProps={{
                                                        sx: {
                                                            fontSize: '1.25rem',
                                                            backgroundColor: theme.palette.common.white
                                                        }
                                                    }}
                                                />
                                            </Stack>
                                        </Box>
                                    </Stack>
                                    <CollapsibleSuggestions
                                        flattenedData={flattenedData}
                                        showSuggestions={showSuggestions}
                                        setRequiredFilter={setRequiredFieldFilters}
                                        requiredFilter={requiredFieldFilters}
                                    />
                                </>
                            )}
                            <Box overflow="auto" display="flex" flexDirection="column">
                                <Grid>
                                    <Grid item xs={12} sm={12}>
                                        <ExpandingTable
                                            columns={columns}
                                            data={tableData}
                                            updateMyData={updateMyData}
                                            skipPageReset={skipPageReset}
                                            tHeadHeight={52}
                                            showHeaders={showTableOnly}
                                        />
                                    </Grid>
                                    <AlertDialog
                                        open={openAlertDialog}
                                        action={handleAlertDialogAction}
                                        handleClose={handleAlertDialogClose}
                                        context={alertDialogContext}
                                    />
                                </Grid>
                                {!showTableOnly && (
                                    <Card className={schemaDetailsStyle.addNewFields} >
                                        <Box className={schemaDetailsStyle?.heading}>
                                            <Typography variant='h1'>Add New Field</Typography>
                                        </Box>
                                        <Box>
                                            <EditLiveDataset
                                                flattenedData={flattenedData}
                                                setFlattenedData={setFlattenedData}
                                                datamappings={dataMappings || validFormatTypes}
                                            />
                                        </Box>
                                    </Card>
                                )}
                            </Box>
                        </Box>
                    )
                )}

            {!showTableOnly && !isErrorUpload && (
                <Box
                    mt={8}
                    sx={{
                        position: 'fixed',
                        bottom: 0,
                        right: 0,
                        left: -50,
                        backgroundColor: theme.palette.background.paper,
                        zIndex: 100
                    }}
                >
                    <Actions
                        buttons={[
                            {
                                id: 'btn1',
                                label: 'Download JSON Schema',
                                variant: 'text',
                                color: 'primary',
                                icon: <FileDownloadOutlinedIcon />
                            },
                            {
                                id: 'btn2',
                                label: 'Proceed',
                                variant: 'contained',
                                color: 'primary',
                                disabled: !allConflictsResolved
                            }
                        ]}
                        onClick={handleButtonClick}
                    />
                </Box>
            )}
        </Box>
    );
};

export default SchemaDetails;
