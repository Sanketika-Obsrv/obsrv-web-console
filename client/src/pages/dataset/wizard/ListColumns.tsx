import React, { useEffect, useMemo, useState } from 'react';
import { Button, Grid, Box, Stack, Typography, Chip, useTheme, SvgIcon, SvgIconProps } from '@mui/material';
import * as _ from 'lodash';
import { CloseOutlined, UploadOutlined, } from '@ant-design/icons';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useDispatch, useSelector } from 'react-redux';
import { IWizard } from 'types/formWizard';
import { addState, overrideMetadata, overrideState } from 'store/reducers/wizard';
import AlertDialog from 'components/AlertDialog';
import { error } from 'services/toaster';
import { areConflictsResolved, downloadJSONSchema, fetchJsonSchema, flattenSchema, getFilteredData, getNesting, } from 'services/json-schema';
import { connect } from 'react-redux';
import IconButtonWithTips from 'components/IconButtonWithTips';
import { DefaultColumnFilter, SelectBooleanFilter, } from 'utils/react-table';
import CollapsibleSuggestions from './components/CollapsibleSuggestions';
import { downloadJsonFile } from 'utils/downloadUtils';
import { CardTitle, GenericCard } from 'components/styled/Cards';
import WizardNavigator from './components/WizardNavigator';
import { updateDataType, updateFormatType, resetSuggestionResolve } from './utils/dataTypeUtil';
import { renderActionsCell, renderArrivalFormatCell, renderColumnCell, renderDataTypeCell, renderRequiredCell } from './utils/renderCells';
import ExpandingTable from 'components/ExpandingTable';
import useImpression from 'hooks/useImpression';
import pageIds from 'data/telemetry/pageIds';
import interactIds from 'data/telemetry/interact.json';
import Loader from 'components/Loader';
import { renderSkeleton } from 'services/skeleton';
import BackdropLoader from 'components/BackdropLoader';
import ReUploadSampleFiles from './components/ReuploadSampleFiles';
import { EditLiveDataset } from './EditLiveDataset';
import AccordionSection from 'components/AccordionSection';
import { useParams } from 'react-router';

const validFormatTypes = ["text", 'number', 'boolean', 'object', 'array'];
const pageMeta = { pageId: 'columns', title: "Derive Schema" };
const alertDialogContext = { title: 'Delete Column', content: 'Are you sure you want to delete this column ?' };

interface columnFilter {
    label: string,
    id: string | boolean,
    lookup: string,
    color: "default" | "error" | "warning" | "success" | "primary" | "secondary" | "info",
    edata: string
}

const columnFilters: columnFilter[] = [
    {
        'label': 'Must-Fix',
        'id': 'MUST-FIX',
        'lookup': 'severity',
        'color': "error",
        'edata': "schemaFilter:mustFix"
    },
    {
        'label': 'Resolved',
        'id': true,
        'lookup': 'resolved',
        'color': "success",
        'edata': "schemaFilter:resolved"
    }
];

function SuggestionsIcon(props: SvgIconProps) {
    return (
        <SvgIcon {...props}>
            <path d="M18 3.00001V3.00001C19.6569 3.00001 21 4.34315 21 6.00001L21 8.14286C21 8.47698 21 8.64405 20.9234 8.76602C20.8834 8.82962 20.8296 8.8834 20.766 8.92336C20.644 9 20.477 9 20.1429 9L15 9M18 3.00001V3.00001C16.3431 3.00001 15 4.34315 15 6.00001L15 9M18 3.00001L7 3.00001C5.11438 3.00001 4.17157 3.00001 3.58579 3.58579C3 4.17158 3 5.11439 3 7.00001L3 21L6 20L9 21L12 20L15 21L15 9" stroke="#056ECE" stroke-width="2" />
            <path d="M7 7L11 7" stroke="#056ECE" stroke-width="2" stroke-linecap="round" />
            <path d="M8 11H7" stroke="#056ECE" stroke-width="2" stroke-linecap="round" />
            <path d="M7 15L10 15" stroke="#056ECE" stroke-width="2" stroke-linecap="round" />
        </SvgIcon>
    );
}

const ListColumns = (props: any) => {
    const { handleNext, setErrorIndex, handleBack, index, wizardStoreState, edit, master = false, generateInteractTelemetry } = props;
    const [selection, setSelection] = useState<Record<string, any>>({});
    const dispatch = useDispatch();
    const wizardState: IWizard = useSelector((state: any) => state?.wizard);
    const pageData = _.get(wizardState, ['pages', pageMeta.pageId]);
    const [flattenedData, setFlattenedData] = useState<Array<Record<string, any>>>([]);
    const [openAlertDialog, setOpenAlertDialog] = useState(false);
    const [filterByChip, setFilterByChip] = useState<columnFilter | null>(null);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [requiredFieldFilters, setRequiredFieldFilters] = useState<string>('');
    const jsonSchema = _.get(wizardState, 'pages.jsonSchema.schema');
    const [uploadLoading, setUploadLoading] = useState(false);
    const theme = useTheme();
    const pageIdPrefix = _.get(pageIds, [master ? 'masterdataset' : 'dataset', edit ? 'edit' : 'create']);
    const pageIdSuffix = _.get(pageIds, [master ? 'masterdataset' : 'dataset', 'pages', 'schema']);
    useImpression({ type: "view", pageid: `${pageIdPrefix}:${pageIdSuffix}` });

    const markRowAsDeleted = (cellValue: Record<string, any>) => {
        const column = cellValue?.originalColumn;
        if (column) {
            setFlattenedData((preState: Array<Record<string, any>>) => {
                const data = _.map(preState, payload => {
                    return {
                        ...payload,
                        ...(_.get(payload, 'column') === column && {
                            isModified: true,
                            isDeleted: true,
                            resolved: true,
                        })
                    };
                });
                persistState(data);
                return data;
            });
        }
    }

    useEffect(() => {
        setAtleastOneFieldPresent(
            flattenedData ? !_.every(flattenedData, { isDeleted: true }) : true
        );
    }, [flattenedData])

    const persistState = (data?: any) => dispatch(addState({ id: pageMeta.pageId, index, state: { schema: data || flattenedData }, error: !areConflictsResolved(data || flattenedData) }));

    const gotoNextSection = () => {
        generateInteractTelemetry({ edata: { id: interactIds.proceed } })
        if (areConflictsResolved(flattenedData)) {
            persistState();
            handleNext();
        } else {
            dispatch(error({ message: 'Please resolve conflicts to proceed further' }));
            setErrorIndex(index)
        }
    }

    const gotoPreviousSection = () => {
        generateInteractTelemetry({ edata: { id: interactIds.previous } })
        persistState();
        handleBack();
    }

    const columns = useMemo(
        () => [
            {
                Header: () => null,
                id: 'expander',
                className: 'cell-center',
                tipText: '',
                editable: false,
                Cell: ({ row }: any) => {
                    const collapseIcon = row.isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />;
                    return row.canExpand && row.depth === 0 && (
                        <Box sx={{ fontSize: '1rem' }} {...row.getToggleRowExpandedProps()}>
                            {collapseIcon}
                        </Box>
                    );
                },
                SubCell: () => null
            },
            {
                Header: 'Field',
                accessor: 'column',
                tipText: 'Name of the field.',
                editable: false,
                Filter: DefaultColumnFilter,
                filter: 'includes',
                Cell: ({ value, cell }: any) => {
                    const [edit, setEdit] = useState(false);
                    const [text, setText] = useState('');
                    return renderColumnCell({
                        cell, value, persistState, setFlattenedData,
                        theme, text, setText, edit, setEdit
                    });
                }
            },
            {
                Header: 'Arrival format ',
                accessor: 'arrival_format',
                tipText: 'Arrival format  of the field',
                editable: false,
                Filter: DefaultColumnFilter,
                filter: 'includes',
                Cell: ({ value, cell, row }: any) => {
                    const pageData = useSelector((state: any) => {
                        return _.get(state, ['wizard', 'pages', pageMeta.pageId, 'state', 'schema']) || {}
                    });
                    const dataMappings = _.get(wizardState, 'pages.jsonSchema.dataMappings');
                    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | HTMLElement | null>(null);
                    return renderArrivalFormatCell({
                        cell, value, pageData,
                        updateFormatType, persistState, anchorEl, setAnchorEl, resetSuggestionResolve,
                        setFlattenedData, validFormatTypes, dataMappings, disabled: row['canExpand']
                    });
                }
            },
            {
                Header: 'Data type',
                accessor: 'data_type',
                tipText: 'Data type of the field',
                errorBg: true,
                editable: false,
                Filter: DefaultColumnFilter,
                filter: 'includes',
                Cell: ({ value, cell, row }: any) => {
                    const pageData = useSelector((state: any) => {
                        return _.get(state, ['wizard', 'pages', pageMeta.pageId, 'state', 'schema']) || {}
                    });

                    const dataMappings = _.get(wizardState, 'pages.jsonSchema.dataMappings');
                    const arrival_format = _.get(row, ['original', 'arrival_format'])
                    const validDatatypes = _.keys(_.get(dataMappings, [arrival_format, 'store_format']))
                    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | HTMLElement | null>(null);
                    return renderDataTypeCell({
                        cell, value, pageData, anchorEl, setAnchorEl,
                        updateDataType, persistState, setFlattenedData,
                        resetSuggestionResolve, validDatatypes, disabled: row['canExpand'], dataMappings,
                    });
                }
            },
            {
                Header: 'Required',
                accessor: 'required',
                tipText: 'Field is required',
                editable: false,
                Filter: SelectBooleanFilter,
                filter: 'equals',
                customValue: requiredFieldFilters,
                Cell: ({ value, cell, updateMyData, row }: any) => {
                    if (row.canExpand) return null;
                    return renderRequiredCell({
                        cell, value, setFlattenedData, persistState,
                    })
                }
            },
            {
                Header: 'Actions',
                tipText: 'Perform actions on the field',
                editable: false,
                disableFilters: true,
                Cell: ({ value, cell, row, ...rest }: any) => {
                    if (row.canExpand) return null;
                    return renderActionsCell({
                        cell, value, setSelection, setOpenAlertDialog, theme, generateInteractTelemetry
                    })
                }
            },
        ],
        [requiredFieldFilters, flattenedData]
    );

    const handleDownloadButton = () => {
        generateInteractTelemetry({ edata: { id: interactIds.download_JSON } });
        if (jsonSchema && flattenedData) {
            const data = _.get(downloadJSONSchema({ schema: jsonSchema }, { schema: flattenedData }), 'schema');
            downloadJsonFile(data, 'json-schema');
        }
    }

    const [skipPageReset, setSkipPageReset] = useState(false);
    const [atleastOneFieldPresent, setAtleastOneFieldPresent] = useState(true)

    const fetchNonDeletedData = (flattenedData: Array<any>) => _.filter(flattenedData, payload => !_.has(payload, 'isDeleted'));
    const sortBySuggestions = (payload: Array<any>) => _.sortBy(payload, value => value?.suggestions);

    const updateMyData = (rowIndex: number, columnId: any, value: any) => {
        setSkipPageReset(true);
    };

    const handleAlertDialogClose = () => {
        setOpenAlertDialog(false);
    }

    const handleAlertDialogAction = () => {
        if (selection) {
            markRowAsDeleted(selection);
            setSelection({});
        }
    }

    const handleFilterChange = (filter: columnFilter) => {
        generateInteractTelemetry({ edata: { id: filter.edata } });
        setFilterByChip(filter);
    }

    const deleteFilter = () => {
        setFilterByChip(null);
    }

    const handleSuggestionsView = () => {
        generateInteractTelemetry({ edata: { id: interactIds.view_suggestions } });
        setShowSuggestions((prevState) => !prevState);
    }

    useEffect(() => {
        dispatch(overrideMetadata({ id: 'activePage', value: 0 }));
        if (jsonSchema) resetColumns(jsonSchema, false);
    }, [jsonSchema]);

    const resetColumns = (schema: any, overwrite = false) => {
        const flattenedSchema = flattenSchema(schema) as any;
        const existingState = _.get(pageData, ['state', 'schema']) || [];
        let data: any;
        if (overwrite) data = flattenedSchema;
        else data = existingState && existingState.length > 0 ? existingState : flattenedSchema;
        setFlattenedData(data);
        persistState(data);
        setSkipPageReset(false);
    };

    const fetchFilterCount = (filter: columnFilter) => {
        const data = _.get(wizardStoreState, ['pages', pageMeta.pageId, 'state', 'schema']) || [];
        const notDeleted = _.filter(data, payload => !_.has(payload, 'isDeleted'));
        if (filter.lookup === 'severity') {
            let counter = 0;
            _.forEach(data, function (item) {
                if (item?.oneof && !item?.resolved) {
                    counter += 1;
                }
            });
            return counter;
        }
        else return _.size(_.filter(notDeleted, [filter.lookup, filter.id]));
    }

    const handleClearFilters = () => {
        generateInteractTelemetry({ edata: { id: interactIds.clear_filters } })
        deleteFilter();
    }

    const filterData = (data: Record<string, any>[]) => {
        if (!filterByChip) return data;
        return getFilteredData(data, filterByChip.lookup);
    }

    const tableData = sortBySuggestions(getNesting(fetchNonDeletedData(filterData(flattenedData)), jsonSchema)) as [];

    const sections = [
        {
            id: 'addNewField',
            title: 'Add new field',
            component: <EditLiveDataset
                flattenedData={flattenedData}
                setFlattenedData={setFlattenedData} />,
            noGrid: true,
        },
    ];

    return (
        <>
            {uploadLoading && <Loader />}
            <BackdropLoader open={uploadLoading} />
            <GenericCard elevation={1}>
                <CardTitle fontWeight={400}>1- Schema Details</CardTitle>
                <Stack direction="row" spacing={1} marginBottom={1} alignItems="center" justifyContent="space-between">
                    <Box display="flex" justifyContent="space-evenly" alignItems="center">
                        <Typography variant="body2" color="secondary" mr={1}>
                            Filter Suggestion by:
                        </Typography>
                        {columnFilters.map((filter) =>
                            <Chip
                                key={filter.label}
                                aria-label='filter-button'
                                clickable
                                label={`${filter.label} (${fetchFilterCount(filter)})`}
                                sx={{ mx: 0.5 }}
                                color={filter.color}
                                size="medium"
                                variant={filterByChip && filterByChip.label === filter.label ? "filled" : "outlined"}
                                onClick={() => handleFilterChange(filter)}
                            />
                        )}
                        {filterByChip &&
                            <Button size="medium" onClick={handleClearFilters} startIcon={<CloseOutlined />} sx={{ fontWeight: 500 }}>
                                Clear filters
                            </Button>
                        }
                    </Box>
                    <Box display="flex" justifyContent="space-evenly" alignItems="center">
                        <ReUploadSampleFiles resetColumns={resetColumns} setUploadLoading={setUploadLoading} />
                        <IconButtonWithTips
                            tooltipText="View all suggestions"
                            icon={<SuggestionsIcon sx={{ color: 'transparent', fontSize: '1.25rem' }} />}
                            handleClick={handleSuggestionsView}
                            buttonProps={{ size: "large", sx: { fontSize: '1.25rem', } }}
                            tooltipProps={{ arrow: true }}
                        />
                    </Box>
                </Stack>
                <CollapsibleSuggestions
                    flattenedData={flattenedData}
                    showSuggestions={showSuggestions}
                    setRequiredFilter={setRequiredFieldFilters}
                    requiredFilter={requiredFieldFilters}
                    generateInteractTelemetry={generateInteractTelemetry}
                />
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={12}>
                        <ExpandingTable
                            columns={columns}
                            data={tableData}
                            updateMyData={updateMyData}
                            skipPageReset={skipPageReset}
                            limitHeight
                            tHeadHeight={52}
                            showSearchBar={true}
                            styles={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9', } }}
                        />
                    </Grid>
                    <AlertDialog open={openAlertDialog} action={handleAlertDialogAction} handleClose={handleAlertDialogClose} context={alertDialogContext} />
                </Grid>
            </GenericCard>
            <Box mt={2}>
                <AccordionSection sections={sections} />
            </Box>
            <WizardNavigator
                pageId={'list:columns'}
                master={master}
                showPrevious={false}
                gotoPreviousSection={gotoPreviousSection}
                gotoNextSection={gotoNextSection}
                enableDownload
                handleDownload={handleDownloadButton}
                nextDisabled={!areConflictsResolved(flattenedData) || !atleastOneFieldPresent}
                edit={edit}
            />
        </>
    );
};

const mapStateToProps = (state: any) => {
    return {
        wizardStoreState: state?.wizard
    }
}

export default connect(mapStateToProps, {})(ListColumns);
