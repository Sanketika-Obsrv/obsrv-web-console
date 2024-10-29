import React from "react";
import ExpandingTable from 'components/ExpandingTable/ExpandingTable';
import { useEffect, useMemo, useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DefaultColumnFilter } from 'utils/react-table';
import _ from 'lodash';
import { renderColumnCell } from 'pages/datasetV1/utils/renderCells';
import { Box, Grid, Typography, useTheme } from '@mui/material';
import { getNestingV1 } from 'services/json-schema';
import { getAllFields } from 'services/datasetV1';
import { renderSkeleton } from 'services/skeleton';

const IngestionSpec = (props: any) => {
    const { datasetState } = props;
    const [flattenedData, setFlattenedData] = useState<Array<Record<string, any>>>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const dataset_state = !_.isEmpty(datasetState) ? datasetState : "";
    const jsonSchema = _.get(dataset_state, 'pages.jsonSchema.schema');
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

    const persistState = (data?: any) => {
        return;
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
                    data={getNestingV1(flattenedData, jsonSchema) as []}
                    // eslint-disable-next-line
                    updateMyData={()=>{}}
                    // eslint-disable-next-line
                    skipPageReset={()=>{}}
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
