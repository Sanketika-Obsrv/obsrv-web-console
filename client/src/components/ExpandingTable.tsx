import { Fragment } from 'react';
import * as _ from "lodash";
import { checkForMustFixConflict } from 'services/json-schema';
import { TableContainer, Table, TableBody, TableCell, TableHead, TableRow, Typography, Skeleton } from '@mui/material';
import { useTable, useFilters, Column, useExpanded } from 'react-table';
import MainCard from 'components/MainCard';
import ScrollX from 'components/ScrollX';
import HtmlTooltip from './HtmlTooltip';

interface Props {
    columns: Column[];
    data: [];
    updateMyData: (rowIndex: number, columnId: any, value: any) => void;
    skipPageReset: boolean;
    limitHeight: boolean;
    tHeadHeight?: number;
    renderRowSubComponent: any;
    showSearchBar: boolean,
    styles?: any;
    context?: Record<string, any>
}

function ReactTable({ columns, data, updateMyData, skipPageReset, limitHeight, tHeadHeight, renderRowSubComponent, showSearchBar, styles = {}, context = {} }: Props) {
    const tableSx = limitHeight ? { height: 'auto', overflowY: 'scroll' } : {};
    const { disableRowColor = false } = context;
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        prepareRow,
        rows,
        visibleColumns,
    } = useTable(
        {
            columns,
            data,
            // @ts-ignore
            autoResetPage: !skipPageReset,
            updateMyData,
            autoResetExpanded: false,
            getSubRows: (row: any) => row.subRows,
        },
        showSearchBar && useFilters,
        useExpanded
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
                                    <TableCell sx={{ p: 0.5, ...styles }} {...column.getHeaderProps()}>
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
                                <TableCell sx={{ ...styles }}{...column.getHeaderProps([{ className: column.className }])}>
                                    {column.canFilter ? column.render('Filter') : null}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                    {rows.map((row: any, i: number) => {
                        prepareRow(row);
                        const [hasSevereConflict, areAllConflictsResolved] = checkForMustFixConflict(_.get(row, 'original'));

                        const bgColor = () => {
                            if (hasSevereConflict && !areAllConflictsResolved) return { bgcolor: `#FFEEEE` };
                            else if (hasSevereConflict && areAllConflictsResolved) return { bgcolor: `#EAFBEE` };
                            else if (row?.original?.isNewlyAdded) return { bgcolor: `#EAFBEE` };
                            else return {};
                        }

                        return (
                            <Fragment key={i}>
                                <TableRow {...row.getRowProps()} sx={{ ...(!disableRowColor && bgColor()) }}>
                                    {
                                        row.cells.map((cell: any) => (
                                            <TableCell sx={cell.column.errorBg ? { p: 0.5, ...styles } : { p: 0.5, ...styles }} {...cell.getCellProps()}>
                                                {cell.render('Cell')}
                                            </TableCell>
                                        ))
                                    }
                                </TableRow>
                            </Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

const ExpandingTable = ({ columns, data, updateMyData, skipPageReset, limitHeight, tHeadHeight, showSearchBar = true, styles = {}, context = {} }: any) => {

    return (
        <MainCard content={false}>
            <ScrollX>
                <ReactTable
                    columns={columns}
                    data={data}
                    updateMyData={updateMyData}
                    renderRowSubComponent={null}
                    skipPageReset={skipPageReset}
                    limitHeight={limitHeight}
                    tHeadHeight={tHeadHeight}
                    showSearchBar={showSearchBar}
                    styles={styles}
                    context={context}
                />
            </ScrollX>
        </MainCard>
    );
};

export default ExpandingTable;
