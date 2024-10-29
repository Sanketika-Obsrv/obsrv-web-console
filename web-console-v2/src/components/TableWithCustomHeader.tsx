import { useEffect, useMemo, useState } from 'react';
import { Stack, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useTable, useFilters, useGlobalFilter, useExpanded } from 'react-table';
import { DefaultColumnFilter, renderFilterTypes } from 'utils/react-table';
import * as _ from 'lodash';

function TableWithCustomHeader({ columns, data, renderHeader }: any) {
    const [tableData, setTableData] = useState<any>(data || []);
    const filterTypes = useMemo(() => renderFilterTypes, []);
    const defaultColumn = useMemo(() => ({ Filter: DefaultColumnFilter }), []);
    const initialState = useMemo(() => ({ filters: [], hiddenColumns: ['tags'] }), []);

    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow, state,
        // @ts-ignore
        preGlobalFilteredRows,
        // @ts-ignore
        setGlobalFilter,
        // @ts-ignore
        toggleRowExpanded
    } = useTable(
        {
            columns,
            data: tableData,
            // @ts-ignore
            defaultColumn,
            // @ts-ignore
            initialState,
            filterTypes,
            autoResetExpanded: false
        },
        useGlobalFilter,
        useFilters,
        useExpanded
    );

    useEffect(() => {
        setTableData(data);
    }, [data]);

    return (
        <Stack spacing={2}>
            {renderHeader ? renderHeader({ preGlobalFilteredRows, setGlobalFilter, toggleRowExpanded, state }) : null}
            <Table {...getTableProps()}>
                <TableHead sx={{ borderTopWidth: 2 }}>
                    {headerGroups.map((headerGroup) => (
                        <TableRow {...headerGroup.getHeaderGroupProps()}>
                            {headerGroup.headers.map((column: any) => {
                                const { style = {} } = column;
                                return <TableCell style={style} {...column.getHeaderProps([{ className: column.className }])}>
                                    {column.render('Header')}
                                </TableCell>
                            })}
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
                                    <TableCell {...cell.getCellProps([{ className: cell.column.className }])}>
                                        {cell.render('Cell')}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Stack>
    );
}

export default TableWithCustomHeader;
