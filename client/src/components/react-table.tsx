import { TableContainer, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTable, useFilters, Column } from 'react-table';
import * as _ from 'lodash';
import HtmlTooltip from './HtmlTooltip';
import { checkForCriticalSuggestion } from 'services/json-schema';

interface Props {
    columns: Column[];
    data: [];
    updateMyData: (rowIndex: number, columnId: any, value: any) => void;
    skipPageReset: boolean;
    limitHeight: boolean;
    tHeadHeight?: number;
}

function ReactTable({ columns, data, updateMyData, skipPageReset, limitHeight, tHeadHeight }: Props) {
    const tableSx = limitHeight ? { height: '35.563rem', overflowY: 'scroll' } : {};

    const { getTableProps, getTableBodyProps, headerGroups, prepareRow, rows } = useTable(
        {
            columns,
            data,
            // @ts-ignore
            autoResetPage: !skipPageReset,
            updateMyData,
        },
        useFilters
    );

    return (
        <TableContainer sx={tableSx}>
            <Table stickyHeader sx={{ borderCollapse: 'collapse' }} size="small" {...getTableProps()}>
                <TableHead sx={tHeadHeight ? { height: tHeadHeight } : {}}>
                    {headerGroups.map((headerGroup) => (
                        <TableRow {...headerGroup.getHeaderGroupProps()}>
                            {headerGroup.headers.map((column: any) => (
                                <HtmlTooltip
                                    disableFocusListener
                                    disableTouchListener
                                    title={
                                        <>
                                            <Typography color="inherit">{column.render('tipText')}</Typography>
                                            <em>{"Editable - "}</em> <b>{`${column.render('editable')}`}</b>
                                        </>
                                    }
                                    placement="top-start"
                                    arrow
                                >
                                    <TableCell sx={{ p: 0.5 }} {...column.getHeaderProps()}>
                                        <Typography variant="h5" textTransform='capitalize'>{column.render('Header')}</Typography>
                                    </TableCell>
                                </HtmlTooltip>
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
                    {rows.map((row: any, i: number) => {
                        prepareRow(row);
                        const suggestions = _.get(row, 'original.suggestions');
                        const isResolved = _.get(row, 'original.resolved') || false;
                        const isCritical = checkForCriticalSuggestion(suggestions);
                        const bgColor = () => {
                            if (isCritical && !isResolved) return { bgcolor: `#FFEEEE` };
                            else if (isResolved) return { bgcolor: `#EAFBEE` };
                            else return {};
                        }
                        return (
                            <TableRow {...row.getRowProps()}>
                                {
                                    row.cells.map((cell: any) => (
                                        <TableCell
                                            sx={cell.column.errorBg ? { ...bgColor(), p: 0.5 } : { p: 0.5 }}
                                            {...cell.getCellProps()}
                                        >
                                            {cell.render('Cell')}
                                        </TableCell>
                                    )
                                    )
                                }
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export default ReactTable
