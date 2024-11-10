import React from 'react';
import * as _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { checkForMustFixConflict } from '../../services/json-schema';
import {
    Box,
    TableContainer,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography
} from '@mui/material';

import { useTable, useFilters, Column, useExpanded, TableOptions } from 'react-table';
import { theme } from 'theme';

interface Props {
    columns: Column[];
    data: [];
    updateMyData: (rowIndex: number, columnId: any, value: any) => void;
    skipPageReset: boolean;
    limitHeight: boolean;
    tHeadHeight?: number;
    showHeaders?: boolean;
    renderRowSubComponent: any;
    styles?: any;
    context?: Record<string, any>;
}

const ReactTable = ({
    columns,
    data,
    updateMyData,
    skipPageReset,
    limitHeight,
    tHeadHeight,
    showHeaders,
    styles = {},
    context = {}
}: Props) => {
    const tableSx = limitHeight ? { height: 'auto', width: '100%', pt: 1 } : { width: '100%', pt: 1 };
    const { disableRowColor = false } = context;
    const { getTableProps, getTableBodyProps, headerGroups, prepareRow, rows } = useTable(
        {
            columns,
            data,
            updateMyData,
            autoResetPage: !skipPageReset,
            autoResetExpanded: false,
            initialState: { expanded: {} },
            getSubRows: (row: any) => {
                return Array.isArray(row.subRows) ? row.subRows : [];
            }
        } as TableOptions<any>,
        useFilters,
        useExpanded
    );

    const renderRows = (rows: any, depth = 0) => {
        if (rows.length === 0) {
            return (
                <>
                    <TableRow
                        sx={{
                            border: '1px solid #d3d3d3',
                            backgroundColor: theme.palette.common.white
                        }}
                    >
                        <TableCell colSpan={columns.length} sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="h6" color="textSecondary">
                                No records found
                            </Typography>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={columns.length} sx={{ padding: 0 }}>
                            <Box
                                sx={{
                                    height: '1.25rem',
                                    width: '100%',
                                    backgroundColor: showHeaders
                                        ? theme.palette.common.white
                                        : 'none'
                                }}
                            />
                        </TableCell>
                    </TableRow>
                </>
            );
        }
        return rows.map((row: any, index: number) => {
            prepareRow(row);
            const [hasSevereConflict, areAllConflictsResolved] = checkForMustFixConflict(
                _.get(row, 'original')
            );

            const bgColor = () => {
                if (hasSevereConflict && !areAllConflictsResolved) return { bgcolor: `#FFEEEE` };
                else if (hasSevereConflict && areAllConflictsResolved)
                    return { bgcolor: `#EAFBEE` };
                else return {};
            };

            const isSubRow = row.depth > 0;
            const isLastRow = index === row.length - 1;
            const isLastSubRow = isSubRow && isLastRow;
            const isExpandedWithSubRows = row.isExpanded && row.subRows && row.subRows.length > 0;
            const borderStyles = (row.subRows.length == 0 && !isSubRow) ? {
                borderRadius: '2px'
            } : {
                borderTopLeftRadius: !isSubRow ? '2px' : '0px',
                borderBottomLeftRadius: isLastSubRow ? '4px': '0px',
                borderTopRightRadius: !isSubRow ? '2px' : '0px',
                borderBottomRightRadius: isLastSubRow ? '4px' : '0px'
            }
            return (
                <React.Fragment key={uuidv4()}>
                    {!isSubRow &&
                        <TableRow>
                            <TableCell colSpan={columns.length} sx={{ padding: 0, borderBottom: "none" }}>
                                
                                    <Box
                                        sx={{
                                            height: '.75rem',
                                            width: '100%',
                                            backgroundColor: showHeaders ? 'white' : 'none',

                                        }}
                                    />
                            </TableCell>
                        </TableRow>
                    }
                    <TableRow
                        {...row.getRowProps()}
                        sx={{
                            outline: '1px solid #d6d6d6',
                            ...borderStyles,
                            backgroundColor: theme.palette.common.white,
                            ...(!disableRowColor && bgColor()),
                            marginLeft: isSubRow ? `${depth * 20}px` : '0'
                        }}
                    >
                        {row.cells.map((cell: any, index: any) => (
                            <TableCell
                                {...cell.getCellProps()}
                                key={uuidv4()}
                                sx={{
                                    py: 0, px: 0, 
                                    borderBottom: "none", ...styles
                                }}
                            >
                                <Typography variant="h6">{cell.render('Cell')}</Typography>
                            </TableCell>
                        ))}
                    </TableRow> 
 
                </React.Fragment>
            );
        });
    };

    return (
        <TableContainer sx={tableSx}>
            <Table sx={{ marginTop: showHeaders ? 0 : '1rem', width: '99.8%', marginRight: '0.063rem', marginLeft: '0.063rem', marginBottom: '0.063rem' }} {...getTableProps()}>
                {!showHeaders && (
                    <TableHead sx={tHeadHeight ? { height: tHeadHeight } : {}}>
                        {headerGroups.map((headerGroup) => (
                            <TableRow {...headerGroup.getHeaderGroupProps()} key={uuidv4()}>
                                {headerGroup.headers.map((column: any) => (
                                    <TableCell
                                        key={uuidv4()}
                                        {...column.getHeaderProps()}
                                        sx={{ ...styles, border: 'none' }}
                                    >
                                        <Typography
                                            variant="h5"
                                            fontSize="1.125rem"
                                            textTransform="capitalize"
                                        >
                                            {column.render('Header')}
                                        </Typography>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>
                )}
                <TableBody sx={{ border: 'none' }} {...getTableBodyProps()}>
                    {renderRows(rows)}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

const ExpandingTable = ({
    columns,
    data,
    updateMyData,
    skipPageReset,
    limitHeight,
    tHeadHeight,
    showHeaders,
    styles = {},
    context = {}
}: any) => {
    return (
        <ReactTable
            columns={columns}
            data={data}
            updateMyData={updateMyData}
            renderRowSubComponent={null}
            skipPageReset={skipPageReset}
            limitHeight={limitHeight}
            tHeadHeight={tHeadHeight}
            showHeaders={showHeaders}
            styles={styles}
            context={context}
        />
    );
};

export default ExpandingTable;
