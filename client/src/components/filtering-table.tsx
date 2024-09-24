import { useEffect, useMemo, useState } from 'react';
import {
    Box, Grid, Stack, Switch, Table, TableBody,
    TableCell, TableHead, TableRow, FormControlLabel,
    Button, Typography,
} from '@mui/material';
import { useTable, useFilters, useGlobalFilter, useExpanded, } from 'react-table';
import {
    GlobalFilter,
    DefaultColumnFilter,
    renderFilterTypes,
} from 'utils/react-table';
import { useNavigate } from 'react-router';
import interactIds from 'data/telemetry/interact.json';
import * as _ from "lodash";
import HtmlTooltip from './HtmlTooltip';
import { InfoCircleOutlined } from '@ant-design/icons';

function FilteringTable({ columns, data, title = '', toggleRefresh = '' }: any) {
    const [tableData, setTableData] = useState<any>(data || []);
    const filterTypes = useMemo(() => renderFilterTypes, []);
    const defaultColumn = useMemo(() => ({ Filter: DefaultColumnFilter }), []);
    const initialState = useMemo(() => ({ filters: [], hiddenColumns: ['tags'], }), []);
    const [toggleGroup, setToggleGroup] = useState(false);
    const navigate = useNavigate();

    const createTagObject = (id: any, count: any, subRows: any) => {
        return {
            id,
            color: null,
            published_date: null,
            tags: [],
            onlyTag: true,
            name: id,
            count,
            subRows
        };
    };

    const reduceTags = useMemo(
        () =>
            _.reduce(
                data,
                (result: any, curr) => {
                    const tags = _.get(curr, 'tags') || [];
                    const noTag = 'No Tags';

                    if (tags.length === 0) {
                        if (!result[noTag]) {
                            result[noTag] = createTagObject(noTag, 1, [curr]);
                        } else {
                            result[noTag].count += 1;
                            result[noTag].subRows.push(curr);
                        }
                    }
                    tags.map((tag: string) => {
                        if (!result[tag]) {
                            result[tag] = createTagObject(tag, 1, [curr]);
                        } else {
                            result[tag].count += 1;
                            result[tag].subRows.push(curr);
                        }
                    });
                    if (result[noTag]) {
                        const noTagsCategory = result[noTag];
                        delete result[noTag];
                        result[noTag] = noTagsCategory;
                      }
                
                      return result;
                },
                {}
            ),
        [data]
    );
    
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
        state,
        // @ts-ignore
        preGlobalFilteredRows,
        // @ts-ignore
        setGlobalFilter,
        // @ts-ignore
        toggleRowExpanded,
    } = useTable(
        {
            columns,
            data: tableData,
            // @ts-ignore
            defaultColumn,
            // @ts-ignore
            initialState,
            filterTypes,
            autoResetExpanded: false,
        },
        useGlobalFilter,
        useFilters,
        useExpanded,
    );

    useEffect(() => {
        if (toggleGroup) {
            const reducedData = _.values(reduceTags);
            setTableData(reducedData);
            if (_.size(reducedData) > 0)
                toggleRowExpanded(0, false);
        } else if (!toggleGroup) { setTableData(data); }
    }, [toggleGroup, toggleRefresh,]);

    const handleGroup = (e: any,) => {
        setToggleGroup(e.target.checked);
    }

    return (
        <Stack spacing={2}>
            <Box sx={{ p: 2, pb: 0 }} textAlign='end'>
                <Grid
                    container
                    spacing={2}
                    direction="row"
                    justifyContent={"space-between"}
                    alignItems="center"
                    sx={{ flexWrap: 'nowrap' }}
                >
                    <Grid item display="flex" alignItems="center">
                        <Typography variant="h5" mr={0.5}>{title}</Typography>
                    </Grid>
                    <Grid item alignItems="center" display="flex">
                        <GlobalFilter
                            preGlobalFilteredRows={preGlobalFilteredRows}
                            // @ts-ignore
                            globalFilter={state.globalFilter}
                            setGlobalFilter={setGlobalFilter}
                        />
                        <Box mx={2} display="flex" alignItems="center">
                            <FormControlLabel control={
                                <Switch inputProps={{ 'aria-label': 'toggle-group' }} onChange={handleGroup} checked={toggleGroup} />
                            }
                                label="Group by Tags"
                                sx={{ mr: 0, ml: 0 }}
                            />
                        </Box>
                    </Grid>
                </Grid>
            </Box>

            <Table {...getTableProps()}>
                <TableHead sx={{ borderTopWidth: 2 }}>
                    {headerGroups.map((headerGroup) => (
                        <TableRow {...headerGroup.getHeaderGroupProps()}>
                            {headerGroup.headers.map((column: any) => (
                                <TableCell {...column.getHeaderProps([{ className: column.className }])}>{column.render('Header')}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableHead>
                <TableBody {...getTableBodyProps()}>
                    {headerGroups.map((group: any) => (
                        <TableRow {...group.getHeaderGroupProps()}>
                            {group.headers.map((column: any) => (
                                <TableCell {...column.getHeaderProps([{ className: column.className }])}>
                                    {column.canFilter ? column.render('Filter') : null}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                    {rows.map((row: any) => {
                        prepareRow(row);
                        return (
                            <TableRow {...row.getRowProps()}>
                                {row.cells.map((cell: any) => (
                                    <TableCell {...cell.getCellProps([{ className: cell.column.className }])}>{cell.render('Cell')}</TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Stack >
    );
}

export default FilteringTable;
