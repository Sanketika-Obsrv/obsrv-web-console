import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTable } from 'react-table';

const CustomTable = ({ columns, data, striped, header = true, styles = {} }: any) => {
    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({
        columns,
        data
    });

    return (
        <Table
            {...getTableProps()}
            sx={{
                border: '1px solid #D6D6D6',
                tableLayout:"fixed"
            }}
        >
            {header && (
                <TableHead>
                    {headerGroups.map((headerGroup, index) => (
                        <TableRow {...headerGroup.getHeaderGroupProps()} key={index}>
                            {headerGroup.headers.map((column: any, i) => (
                                <TableCell
                                    sx={{
                                        border: '0.0625rem solid #D6D6D6',
                                        background: '#F9F9F9',
                                        ...styles,
                                        textTransform: 'unset'
                                    }}
                                    {...column.getHeaderProps([{ className: column.className }])}
                                    key={i}
                                >
                                    <Typography variant="h5">{column.render('Header')}</Typography>
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableHead>
            )}
            <TableBody {...getTableBodyProps()} {...(striped && { className: 'striped' })}>
                {rows.map((row, i) => {
                    prepareRow(row);
                    return (
                        <TableRow {...row.getRowProps()} key={i}>
                            {row.cells.map((cell: any, id) => (
                                <TableCell
                                    sx={{
                                        border: '0.0625rem solid #D6D6D6',
                                        padding: '0.9375rem',
                                        ...styles
                                    }}
                                    {...cell.getCellProps([{ className: cell.column.className }])}
                                    key={id}
                                >
                                    {cell.render('Cell')}
                                </TableCell>
                            ))}
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};

export default CustomTable;
