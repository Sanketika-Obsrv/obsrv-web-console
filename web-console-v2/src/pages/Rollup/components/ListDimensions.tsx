import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Grid, Box, useTheme, Typography, Alert, Button } from '@mui/material';
import * as _ from 'lodash';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {  getNestingV1 } from 'services/json-schema';
import { DefaultColumnFilter } from 'utils/react-table';
import { GenericCard } from 'components/Styled/Cards';
import ExpandingTable from 'components/ExpandingTable/ExpandingTable';
import { updateRollupDataType } from 'pages/Rollup/utils/dataTypeUtil';
import {
    renderCategoryCell,
    renderColumnCell
} from 'pages/Rollup/utils/renderCells';
import Granularity from './Granularity';
import { useLocation, useNavigate } from 'react-router';
import en from 'utils/locales/en.json';
import { Stack } from '@mui/material';
import AnimateButton from 'components/@extended/AnimateButton';
import { StandardWidthButton } from 'components/Styled/Buttons';
import FilteredRollUps from './FilteredRollUp';
import Ajv from "ajv";
import FilteredRollupSchema from "../schema/FilteredRollupSchema.json"
import { useAlert } from "contexts/AlertContextProvider";

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
    const location = useLocation();
    const [proceedToListPage, setProceedToListPage] = useState();
    const isEditing = location.state?.edit;
    const navigate = useNavigate();
    const jsonSchema = datasetState?.data_schema;
    const { showAlert } = useAlert();

    const gotoNextSection = () => {
        const hasDimensionValue = _.some(flattenedData, (item) => item.rollupType === 'dimension' && item.key);
        const ajv = new Ajv();
        if (!_.isEmpty(filteredRollup)) {
            const isRollupFilterValid = ajv.validate(FilteredRollupSchema, filteredRollup);
            if (!skipFilters && !isRollupFilterValid) {
                showAlert("The Provided filters are Invalid", "error")
                return;
            }
        }
        if (hasDimensionValue) {
            if ((_.isEmpty(selectedGranularityOptions)) && location.state?.edit === false) {
                showAlert(en.selectGranularityOption, "error")
            }
            else {
                setActiveStep(index + 1);
                setSkipFilters(false)
                return index + 1;
            }
        }
        else {
            showAlert(en.mustContainDimensionValue, "error")
        }
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
            <GenericCard elevation={1} sx={{mx: 6, border: '1px solid #d6d6d6'}}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={12}>
                        {isEditing ? <Alert sx={{ display: "flex", alignItems: "center", mb: 2 }} severity="info">{en.newlyAddedFieldsAlertMessage}</Alert> : <></>}
                        <ExpandingTable
                            columns={columns}
                            data={getNestingV1(flattenedData, jsonSchema) as []}
                            limitHeight
                            tHeadHeight={52}
                            showSearchBar={false}
                            styles={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9' } }}
                        // context={{ disableRowColor: true }}
                        />
                    </Grid>
                </Grid>
            </GenericCard>
            <GenericCard elevation={1} sx={{mx:6, border: '1px solid #d6d6d6'}}>
                <FilteredRollUps {...props} />
            </GenericCard>  
            <Stack direction="row" justifyContent="space-between" sx={{mx:6, mb:4}}>
                <Button
                    variant="outlined"
                    type="button"
                    onClick={() => navigate(-1)}
                >
                    <Typography variant="buttonSecondaryCTA">Previous</Typography>
                </Button>
                <Button
                    variant="contained"
                    type="button"
                    onClick={() => gotoNextSection()}
                >
                    <Typography variant="button">Proceed</Typography>
                </Button>
            </Stack>
        </>
    );
};

export default (ListDimensions);
