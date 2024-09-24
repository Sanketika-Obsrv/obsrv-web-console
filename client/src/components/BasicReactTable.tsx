import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTable } from 'react-table';

function BasicReactTable({ columns, data, striped, header = true, styles = {} }: any) {
    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({
        columns,
        data
    });

    return (
        <Table {...getTableProps()}>
            {header &&
                (<TableHead>
                    {headerGroups.map((headerGroup) => (
                        <TableRow {...headerGroup.getHeaderGroupProps()}>
                            {headerGroup.headers.map((column: any) => (
                                <TableCell sx={{ ...styles, textTransform: 'unset' }} {...column.getHeaderProps([{ className: column.className }])}>
                                    <Typography variant="h5">{column.render('Header')}</Typography>
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableHead>)
            }
            <TableBody {...getTableBodyProps()} {...(striped && { className: 'striped' })}>
                {rows.map((row, i) => {
                    prepareRow(row);
                    return (
                        <TableRow {...row.getRowProps()}>
                            {row.cells.map((cell: any) => (
                                <TableCell sx={{ ...styles }} {...cell.getCellProps([{ className: cell.column.className }])}>{cell.render('Cell')}</TableCell>
                            ))}
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

export default BasicReactTable
