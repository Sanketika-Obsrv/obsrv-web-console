import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import _ from 'lodash';
import React from 'react';

export interface SamplePreviewCardProps {
  rows: Record<string, unknown>[];
  /** How many rows the sample holds in total, not just the ones shown. */
  totalRows: number;
}

/** Renders a value without hiding that it is structured. */
const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (_.isPlainObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * The first rows of the sample, so the user can see what the schema was
 * inferred from. Columns are the union of the rows' keys, matching the way
 * the merge step treats fields that appear on only some records.
 */
const SamplePreviewCard: React.FC<SamplePreviewCardProps> = ({
  rows,
  totalRows,
}) => {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" component="span" color="text.secondary">
        {`${totalRows} rows in the sample · showing ${rows.length}`}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column}>{column}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              // Sample rows have no id of their own, and order is what matters.

              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column}>{asText(row[column])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default SamplePreviewCard;
