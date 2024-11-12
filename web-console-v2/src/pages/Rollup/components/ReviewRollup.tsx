import React from 'react';
import { useMemo, useState } from 'react'
import { Grid, Typography, Stack, Button } from '@mui/material';
import AnimateButton from 'components/@extended/AnimateButton';
import { StandardWidthButton } from 'components/Styled/Buttons';
import { useLocation, useNavigate, useParams } from 'react-router';
import { generateRollupIngestionSpec, saveRollupDatasource } from 'services/rollups';
import * as _ from 'lodash';
import { useAlert } from "contexts/AlertContextProvider";
import ExpandingTable from 'components/ExpandingTable/ExpandingTable'
import { getNestingV1 } from 'services/json-schema';
import { Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { renderColumnCell, renderReviewAggregationCell, renderReviewCategoryCell } from '../utils/renderCells';
import { GenericCard } from 'components/Styled/Cards';
import GranuralityInfo from './GranuralityInfo';
import AccordionSection from 'components/Accordian/AccordionSection';
import Loader from 'components/Loader';
import en from 'utils/locales/en.json';
import { DatasetStatus } from 'types/datasets';
import TransformSpecEditor from './TransformSpecEditor';
import { defaultMetric } from '../../../services/commonUtils';

const ReviewRollup = (props: any) => {
    const {
        index,
        setActiveStep,
        datasetState,
        selectedGranularityOptions,
        flattenedData,
        datasetName,
        rollupMetadata,
        filteredRollup,
        isValidFilter,
        skipFilters
    } = props;
    const navigate = useNavigate();
    const { datasetId } = useParams();
    const location = useLocation();
    const dataset_id = datasetId;
    const [loading, setLoading] = useState(false);
    const jsonSchema = datasetState?.data_schema;
    const { showAlert } = useAlert();

    const gotoNextSection = () => {
        generateIngestionSpecAndSaveDataSource()
    };

    const gotoPreviousSection = () => {
        setActiveStep(index - 1);
        return index - 1;
    };

    const handleFinish = () => {
        navigate(`/home/datasets/management/${datasetId}?status=${DatasetStatus.Draft}`, { state: { jsonSchema: datasetState } });
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
                filter: 'includes',
                Cell: ({ row }: any) => {
                    return <Box px={2}><Typography variant="h6">{row?.original?.data_type}</Typography></Box>;
                }
            },
            {
                Header: 'category',
                accessor: 'type',
                tipText: 'Category of the field',
                editable: true,
                filter: 'includes',
                Cell: ({ cell, row }: any) => {
                    const [defaultValue, setDefault] = useState(row?.original?.rollupType)
                    return renderReviewCategoryCell({
                        defaultValue,
                        cell
                    });
                }
            },
            {
                Header: 'selected aggregates',
                tipText: 'selected aggregate functions',
                editable: false,
                filter: 'includes',
                Cell: ({ cell, row }: any) => {
                    const [aggregateFunctions, setAggregateFunctions] = useState(row?.original?.aggregateFunctions);
                    return renderReviewAggregationCell({
                        aggregateFunctions,
                        cell,
                        disabled: row['canExpand'],
                    });
                }
            },
        ],
        []
    );

    const generateIngestionSpecAndSaveDataSource = async () => {
        try {
            setLoading(true);
            const rollupMeta = rollupMetadata;
            const granularityOptions = _.get(location, 'state.edit', false) === true ? _.get(location, 'state.rollupGranularityOption') : selectedGranularityOptions;
            const aggregationLevelForEdit = _.toLower(_.get(location, 'state.aggregationLevel', ''));
            let metaName = _.get(rollupMeta, 'name');
            let metaValue = _.get(rollupMeta, 'value');
            if (!metaName || !metaValue) {
                metaValue = [];
                metaName = "";
            }
            for (const granularity of granularityOptions) {
                if (granularity !== undefined) {
                    const granularityType = _.toLower(granularity);
                    const maskedDataSourceName: any = metaName || `${datasetId}_rollup_${granularityType}`;
                    if (aggregationLevelForEdit === granularity && maskedDataSourceName === metaName) {
                        // If the key exists, update
                        metaValue = flattenedData
                        const response = await generateRollupIngestionSpec(flattenedData, datasetState, dataset_id, maskedDataSourceName, granularity, {}, isValidFilter && !skipFilters ? filteredRollup : {});
                        const ingestionSpec = _.get(response, "data.result");
                        const saveDataSourceresponse = await saveRollupDatasource({
                            headers: {
                                override: true
                            }
                        }, maskedDataSourceName, ingestionSpec, datasetState, granularity, metaValue);
                    } else if (maskedDataSourceName !== _.get(rollupMeta, 'name') && _.isEmpty(metaValue)) {
                        // If the key doesn't exist, create 
                        metaValue = flattenedData;
                        const response = await generateRollupIngestionSpec(flattenedData, datasetState, dataset_id, maskedDataSourceName, granularity, {}, isValidFilter && !skipFilters ? filteredRollup : {});
                        const ingestionSpec = _.get(response, "data.result");
                        const saveDataSourceresponse = await saveRollupDatasource({}, maskedDataSourceName, ingestionSpec, datasetState, granularity, metaValue);
                        metaValue = []
                    }
                }
            }
            showAlert(en.datasourceSaved, "success")
            handleFinish();
            setLoading(false)
        }
        catch (err) {
            setLoading(false)
            showAlert(en.datasourceSaveFaild, "error")
        }
    }

    const sections = [
        {
            id: 'Review',
            title: 'Review',
            component: (<GranuralityInfo
                datasetName={datasetName}
                selectedGranularityOptions={selectedGranularityOptions}
            />),
            componentType: 'box',
        },
    ];

    const filterRollupScreen = () => (
        <Grid item xs={12}>
            <TransformSpecEditor initialData={filteredRollup} mode={"preview"} />
        </Grid>
    )

    const filterRollupSection = [
        {
            id: 'filters',
            title: 'Filters',
            component: <>{filterRollupScreen()}</>,
            componentType: 'box'
        }
    ]

    const flattenedDataWithDefaultMetric = [...flattenedData, defaultMetric]

    return (
        <Box sx={{py:2}}>
            {loading
                ?
                <Loader loading={loading} />
                :
                <Grid item xs={12}>
                    <Box sx={{mx:6}}><AccordionSection sections={sections} /></Box>
                    <GenericCard elevation={1} sx={{mx:6, border: '1px solid #d6d6d6'}}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={12}>
                                <ExpandingTable
                                    type={"metrics"}
                                    columns={columns}
                                    data={getNestingV1(flattenedDataWithDefaultMetric, jsonSchema) as []}
                                    limitHeight
                                    tHeadHeight={52}
                                    showSearchBar={false}
                                    context={{ disableRowColor: true }}
                                />
                            </Grid>
                        </Grid>
                    </GenericCard>
                    {!_.isEmpty(filteredRollup) &&
                        <AccordionSection sections={filterRollupSection} />
                    }
                    <Stack direction="row" justifyContent="space-between" sx={{mx: 6}}>
                        <Button
                            variant="outlined"
                            type="button"
                            onClick={gotoPreviousSection}
                        >
                            <Typography variant="buttonSecondaryCTA">Previous</Typography>
                        </Button>
                        <Button
                            variant="contained"
                            type="button"
                            onClick={gotoNextSection}
                        >
                            <Typography variant="button">Save rollup</Typography>
                        </Button>
                    </Stack>
                </Grid>
            }
        </Box>
    )
}

export default ReviewRollup
