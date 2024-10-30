import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Grid, Box, Typography, Alert } from '@mui/material';
import * as _ from 'lodash';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DefaultColumnFilter } from 'utils/react-table';
import { GenericCard } from 'components/Styled/Cards';
import ExpandingTable from 'components/ExpandingTable/ExpandingTable';
import WizardNavigator from 'pages/Dataset/wizard/components/WizardNavigator';
import { updateDataType } from 'pages/Rollup/utils/dataTypeUtil';
import {
    renderAggregateCell,
    renderColumnCell
} from 'pages/Rollup/utils/renderCells';
import { getFilteredMetricData, getNestingV1 } from 'services/json-schema';
import en from 'utils/locales/en.json';
import { defaultMetric } from '../../../services/commonUtils';
import { useAlert } from "contexts/AlertContextProvider";

const ListMetrics = (props: any) => {
    const {
        index,
        edit,
        setActiveStep,
        datasetState,
        flattenedData,
        setFlattenedData,
    } = props;
    const [errorMessage, setErrorMessage] = useState<boolean>(false);
    const jsonSchema = datasetState?.data_schema;
    const { showAlert } = useAlert();

    const gotoNextSection = () => {
        if (errorMessage) {
            showAlert(en.selectAggregateFunction, "error")
        }
        else {
            setActiveStep(index + 1);
            return index + 1;
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
                tipText: '',
                editable: false,
                Filter: DefaultColumnFilter,
                filter: 'includes',
                Cell: ({ value, cell }: any) => {
                    return renderColumnCell({
                        cell,
                        value,
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
                Header: 'aggregates',
                accessor: 'type',
                tipText: 'Category of the field',
                editable: true,
                Filter: DefaultColumnFilter,
                filter: 'includes',
                Cell: ({ value, cell, row }: any) => {
                    const [aggregateFunctions, setAggregateFunctions] = useState(row?.original?.aggregateFunctions || []);
                    return renderAggregateCell({
                        setErrorMessage,
                        aggregateFunctions,
                        setAggregateFunctions,
                        cell, value,
                        updateDataType,
                        setFlattenedData,
                        disabled: row['canExpand'],
                    });
                }
            },
        ],
        []
    );

    const filteredData = (payload: Record<string, any>) => {
        const data = _.filter(payload, item => {
            if (!_.includes(["object"], _.get(item, "data_type"))) {
                if (item?.aggregateFunctions && !_.isEmpty(item?.aggregateFunctions)) {
                    return false;
                }
                return true;
            }
        })
        return data;
    }

    const isAggregatesPresent = filteredData(getFilteredMetricData(flattenedData))

    useEffect(() => {
        if (_.isEmpty(isAggregatesPresent)) {
            setErrorMessage(false)
        }
        else {
            setErrorMessage(true)
        }
    }, [isAggregatesPresent])

    const flattenedDataWithDefaultMetric = [...flattenedData, defaultMetric]
    return (
        <>
            <GenericCard elevation={1}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={12}>
                        <Alert sx={{ display: "flex", alignItems: "center", mb: 2 }} severity="info">{en.selectAggregateFunctionAlert}</Alert>
                        <ExpandingTable
                            type={"metrics"}
                            columns={columns}
                            data={getNestingV1(getFilteredMetricData(flattenedDataWithDefaultMetric), jsonSchema)}
                            limitHeight
                            tHeadHeight={52}
                            showSearchBar={false}
                            styles={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9' } }}
                            context={{ disableRowColor: true }}
                        />
                    </Grid>
                </Grid>
            </GenericCard>
            <WizardNavigator
                pageId={'list:columns'}
                showPrevious={true}
                gotoPreviousSection={gotoPreviousSection}
                gotoNextSection={gotoNextSection}
                nextDisabled={false}
                edit={edit}
            />
        </>
    );
};

export default ListMetrics;
