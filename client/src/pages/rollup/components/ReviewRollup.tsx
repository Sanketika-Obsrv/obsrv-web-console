import React, { useMemo, useState, useEffect } from 'react'
import { Grid, Typography } from '@mui/material';
import { Stack } from '@mui/system';
import AnimateButton from 'components/@extended/AnimateButton';
import { StandardWidthButton } from 'components/styled/Buttons';
import { useLocation, useNavigate, useParams } from 'react-router';
import { datasetRead, generateRollupIngestionSpec } from 'services/dataset';
import { saveRollupDatasource } from 'services/datasource';
import * as _ from 'lodash';
import { error, success } from 'services/toaster';
import { useDispatch } from 'react-redux';
import ExpandingTable from 'components/ExpandingTable';
import { getNesting } from 'services/json-schema';
import { Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { renderColumnCell, renderReviewAggregationCell, renderReviewCategoryCell } from '../utils/renderCells';
import { GenericCard } from 'components/styled/Cards';
import GranuralityInfo from './GranuralityInfo';
import AccordionSection from 'components/AccordionSection';
import Loader from 'components/Loader';
import BackdropLoader from 'components/BackdropLoader';
import en from 'utils/locales/en.json';
import { DatasetStatus } from 'types/datasets';
import TransformSpecEditor from './TransformSpecEditor';
import { defaultMetric } from '../utils/commonUtils';

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
    const dataset_id = _.get(datasetState, 'pages.datasetConfiguration.state.config.dataset_id');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const jsonSchema = datasetState?.pages?.jsonSchema?.schema;

    const gotoNextSection = () => {
        generateIngestionSpecAndSaveDataSource()
    };

    const gotoPreviousSection = () => {
        setActiveStep(index - 1);
        return index - 1;
    };

    const handleFinish = () => {
        navigate(`/datasets/management/${datasetId}?status=${DatasetStatus.Draft}`, { state: { jsonSchema: datasetState } });
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
            for (let granularity of granularityOptions) {
                if (granularity !== undefined) {
                    const granularityType = _.toLower(granularity);
                    let maskedDataSourceName: any = metaName || `${datasetId}_rollup_${granularityType}`;
                    if (aggregationLevelForEdit === granularity && maskedDataSourceName === metaName) {
                        // If the key exists, update
                        metaValue = flattenedData
                        const response = await generateRollupIngestionSpec(flattenedData, datasetState?.pages, dataset_id, maskedDataSourceName, granularity, {}, isValidFilter && !skipFilters ? filteredRollup : {});
                        const ingestionSpec = _.get(response, "data.result");
                        const saveDataSourceresponse = await saveRollupDatasource({
                            headers: {
                                override: true
                            }
                        }, maskedDataSourceName, ingestionSpec, datasetState?.pages, granularity, metaValue);
                    } else if (maskedDataSourceName !== _.get(rollupMeta, 'name') && _.isEmpty(metaValue)) {
                        // If the key doesn't exist, create 
                        metaValue = flattenedData;
                        const response = await generateRollupIngestionSpec(flattenedData, datasetState?.pages, dataset_id, maskedDataSourceName, granularity, {}, isValidFilter && !skipFilters ? filteredRollup : {});
                        const ingestionSpec = _.get(response, "data.result");
                        const saveDataSourceresponse = await saveRollupDatasource({}, maskedDataSourceName, ingestionSpec, datasetState?.pages, granularity, metaValue);
                        metaValue = []
                    }
                }
            }
            dispatch(success({ message: en.datasourceSaved }));
            handleFinish();
            setLoading(false)
        }
        catch (err) {
            setLoading(false)
            dispatch(error({ message: en.datasourceSaveFaild }));
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
        <div>
            {loading && <Loader />}
            <BackdropLoader open={loading} />
            <Grid item xs={12}>
                <AccordionSection sections={sections} />
                <GenericCard elevation={1}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={12}>
                            <ExpandingTable
                                type={"metrics"}
                                columns={columns}
                                data={getNesting(flattenedDataWithDefaultMetric, jsonSchema) as []}
                                limitHeight
                                tHeadHeight={52}
                                showSearchBar={false}
                                styles={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9' } }}
                                context={{ disableRowColor: true }}
                            />
                        </Grid>
                    </Grid>
                </GenericCard>
                {!_.isEmpty(filteredRollup) &&
                    <AccordionSection sections={filterRollupSection} />
                }
                <Stack direction="row" justifyContent="space-between">
                    <AnimateButton>
                        <StandardWidthButton
                            variant="outlined"
                            type="button"
                            onClick={gotoPreviousSection}
                        >
                            <Typography variant="h5">Previous</Typography>
                        </StandardWidthButton>
                    </AnimateButton>
                    <AnimateButton>
                        <StandardWidthButton
                            variant="contained"
                            type="button"
                            onClick={gotoNextSection}
                        >
                            <Typography variant="h5">Save rollup</Typography>
                        </StandardWidthButton>
                    </AnimateButton>
                </Stack>
            </Grid>
        </div>
    )
}

export default ReviewRollup
