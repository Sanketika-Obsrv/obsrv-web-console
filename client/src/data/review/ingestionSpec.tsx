import ExpandingTable from 'components/ExpandingTable';
import { useEffect, useMemo, useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DefaultColumnFilter } from 'utils/react-table';
import _ from 'lodash';
import { renderColumnCell } from 'pages/dataset/wizard/utils/renderCells';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Grid, Typography, useTheme } from '@mui/material';
import { areConflictsResolved, flattenSchema, getNesting } from 'services/json-schema';
import { addState } from 'store/reducers/wizard';
import { getAllFields } from 'services/dataset';
import { renderSkeleton } from 'services/skeleton';

const IngestionSpec = (props: any) => {
    const { datasetState } = props;
    const dispatch = useDispatch();
    const [flattenedData, setFlattenedData] = useState<Array<Record<string, any>>>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const wizardState: any = useSelector((state: any) => state?.wizard);
    const dataset_state = !_.isEmpty(datasetState) ? datasetState : wizardState;
    const jsonSchema = _.get(dataset_state, 'pages.jsonSchema.schema');
    const dataMappings = _.get(dataset_state, 'pages.jsonSchema.dataMappings') || {};
    const theme = useTheme();

    const updateFields = async () => {
        setLoading(true)
        try {
            const status = _.get(dataset_state, "pages.status")
            const fields: any = await getAllFields(datasetState?.pages?.datasetConfiguration?.state?.config?.dataset_id, status)
            const result = fields?.data[0] || [];
            setFlattenedData(result);
        } catch (error: any) {
            console.log(error);
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        updateFields();
    }, []);


    const getArrivalFormat = (data_type: string | undefined) => {
        if (data_type) {
            let result = "";
            _.keys(dataMappings).map((key) => {
                _.includes(_.get(dataMappings[key], 'arrival_format'), data_type) && (result = key)
            });
            return result;
        }
        return null;
    }

    const persistState = (data?: any) =>
        dispatch(
            addState({
                id: 'ingestion.spec.id',
                state: { schema: data || flattenedData },
                error: !areConflictsResolved(data || flattenedData)
            })
        );

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
                isReadOnly: true,
                filter: 'includes',
                Cell: ({ value, cell }: any) => {
                    const [edit, setEdit] = useState(false);
                    const [text, setText] = useState('');
                    return renderColumnCell({
                        cell,
                        value,
                        persistState,
                        setFlattenedData,
                        theme,
                        text,
                        setText,
                        edit,
                        setEdit,
                        disabled: true
                    });
                }
            },
            {
                Header: 'Data type',
                accessor: 'data_type',
                tipText: 'Data type of the field',
                errorBg: true,
                editable: false,
                isReadOnly: true,
                Filter: DefaultColumnFilter,
                filter: 'includes',
                Cell: ({ value, cell, row }: any) => {
                    const dataType = _.get(row, 'original._transformedFieldDataType') || _.get(row, 'original.data_type');
                    return <Box px={2}><Typography variant="h6">{dataType}</Typography></Box>;
                }
            }
        ],
        []
    );

    return (
        <Grid item xs={12} sm={12}>
            {loading ? renderSkeleton({ config: { type: "table", width: "100%" } }) :
                <ExpandingTable
                    columns={columns}
                    data={getNesting(flattenedData, jsonSchema) as []}
                    updateMyData={() => { }}
                    skipPageReset={() => { }}
                    limitHeight
                    tHeadHeight={52}
                    showSearchBar={false}
                    styles={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9' } }}
                />
            }
        </Grid>
    );
};

export default IngestionSpec;
