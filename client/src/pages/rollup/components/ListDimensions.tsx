import { useEffect, useMemo, useState } from 'react';
import { Grid, Box, useTheme, Typography, Alert } from '@mui/material';
import * as _ from 'lodash';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getNesting } from 'services/json-schema';
import { DefaultColumnFilter } from 'utils/react-table';
import { GenericCard } from 'components/styled/Cards';
import ExpandingTable from 'components/ExpandingTable';
import WizardNavigator from 'pages/dataset/wizard/components/WizardNavigator';
import { updateRollupDataType } from 'pages/rollup/utils/dataTypeUtil';
import {
    renderCategoryCell,
    renderColumnCell
} from 'pages/rollup/utils/renderCells';
import { error } from 'services/toaster';
import { useDispatch } from 'react-redux';
import Granularity from './Granularity';
import { useLocation, useNavigate } from 'react-router';
import en from 'utils/locales/en.json';
import { Stack } from '@mui/material';
import AnimateButton from 'components/@extended/AnimateButton';
import { StandardWidthButton } from 'components/styled/Buttons';
import FilteredRollUps from './FilteredRollUp';
import Ajv from "ajv";
import FilteredRollupSchema from "../schema/FilteredRollupSchema.json"

const validDatatypes = [
    {
        label: 'dimension',
        value: "dimension",
        typesAllowed: ["text", "boolean"]
    },
    {
        label: 'metric',
        value: "fact",
        typesAllowed: ["number"]
    },
    {
        label: 'ignore',
        value: "ignore",
        typesAllowed: ["text", "number", "object", "array", "boolean"]
    }];

const ListDimensions = (props: any) => {
    const {
        datasetState,
        index,
        edit,
        setActiveStep,
        setUpdatedRollupState,
        flattenedData,
        setFlattenedData,
        selectedGranularityOptions,
        setSelectedGranularityOptions,
        indexColumn,
        customGranularity,
        setCustomGranularity,
        setSelectedOptions,
        selectedOptions,
        isValidFilter,
        filteredRollup,
        skipFilters,
        setSkipFilters
    } = props;
    const theme = useTheme();
    const dispatch = useDispatch();
    const location = useLocation();
    const [proceedToListPage, setProceedToListPage] = useState();
    const isEditing = location.state?.edit;
    const navigate = useNavigate();
    const jsonSchema = datasetState?.pages?.jsonSchema?.schema;

    const gotoNextSection = () => {
        const hasDimensionValue = _.some(flattenedData, (item) => item.rollupType === 'dimension' && item.key);
        const ajv = new Ajv();
        if (!_.isEmpty(filteredRollup)) {
            const isRollupFilterValid = ajv.validate(FilteredRollupSchema, filteredRollup);
            if (!skipFilters && !isRollupFilterValid) {
                dispatch(error({ message: "The Provided filters are Invalid" }))
                return;
            }
        }
        if (hasDimensionValue) {
            if ((_.isEmpty(selectedGranularityOptions)) && location.state?.edit === false) {
                dispatch(error({ message: en.selectGranularityOption }));
            }
            else {
                setActiveStep(index + 1);
                setSkipFilters(false)
                return index + 1;
            }
        }
        else {
            dispatch(error({ message: en.mustContainDimensionValue }));
        }
    };

    const gotoPreviousSection = () => {
        setActiveStep(index - 1);
        return index - 1;
    };

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
                    return (
                        row.canExpand &&
                        row.depth === 0 && (
                            <Box sx={{ fontSize: '1rem' }} {...row.getToggleRowExpandedProps()}>
                                {collapseIcon}
                            </Box>
                        )
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
                        cell,
                        value,
                        setFlattenedData,
                        theme,
                        text,
                        setText,
                        edit,
                        setEdit
                    });
                }
            },
            {
                Header: 'Data type',
                tipText: 'Data type of the field',
                editable: false,
                Filter: DefaultColumnFilter,
                filter: 'includes',
                Cell: ({ value, cell, row }: any) => {
                    return <Box px={2}><Typography variant="h6">{row?.original?.data_type}</Typography></Box>;
                }
            },
            {
                Header: 'category',
                accessor: 'type',
                tipText: 'Category of the field',
                editable: true,
                Filter: DefaultColumnFilter,
                filter: 'includes',
                Cell: ({ cell, row }: any) => {
                    const [defaultValue, setDefault] = useState(row?.original?.rollupType || "")
                    return renderCategoryCell({
                        defaultValue,
                        setDefault,
                        cell,
                        updateRollupDataType,
                        setFlattenedData,
                        validDatatypes,
                        theme,
                        indexColumn
                    });
                }
            },
        ],
        []
    );

    useEffect(() => {
        setUpdatedRollupState(flattenedData);
    }, [flattenedData])

    return (
        <>
            {isEditing ? <></> : <Granularity
                proceedToListPage={proceedToListPage}
                setProceedToListPage={setProceedToListPage}
                selectedGranularityOptions={selectedGranularityOptions}
                setSelectedGranularityOptions={setSelectedGranularityOptions}
                customGranularity={customGranularity}
                setCustomGranularity={setCustomGranularity}
                setSelectedOptions={setSelectedOptions}
                selectedOptions={selectedOptions}
            />}
            <GenericCard elevation={1}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={12}>
                        {isEditing ? <Alert sx={{ display: "flex", alignItems: "center", mb: 2 }} severity="info">{en.newlyAddedFieldsAlertMessage}</Alert> : <></>}
                        <ExpandingTable
                            columns={columns}
                            data={getNesting(flattenedData, jsonSchema) as []}
                            limitHeight
                            tHeadHeight={52}
                            showSearchBar={false}
                            styles={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9' } }}
                        // context={{ disableRowColor: true }}
                        />
                    </Grid>
                </Grid>
            </GenericCard>
            <GenericCard elevation={1}>
                <FilteredRollUps {...props} />
            </GenericCard>
            <Stack direction="row" justifyContent="space-between">
                <AnimateButton>
                    <StandardWidthButton
                        variant="outlined"
                        type="button"
                        onClick={() => navigate(-1)}
                    >
                        <Typography variant="h5">Previous</Typography>
                    </StandardWidthButton>
                </AnimateButton>
                <AnimateButton>
                    <StandardWidthButton
                        variant="contained"
                        type="button"
                        onClick={() => gotoNextSection()}
                    >
                        <Typography variant="h5">proceed</Typography>
                    </StandardWidthButton>
                </AnimateButton>
            </Stack>
        </>
    );
};

export default (ListDimensions);
