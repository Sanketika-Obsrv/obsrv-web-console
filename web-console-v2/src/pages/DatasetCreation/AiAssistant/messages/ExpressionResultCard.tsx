import {
  Alert,
  Chip,
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

export interface ExpressionResultCardProps {
  expression: string;
  /** Datatype inferred by evaluating against the sample. */
  dataType?: string;
  results?: { input: unknown; output: unknown }[];
  /** Set when the expression could not be evaluated at all. */
  error?: string;
}

/** How much of a row to show before it stops being readable. */
const MAX_CELL = 60;

/**
 * Renders a value without flattening structure into "[object Object]".
 *
 * The input side is a whole sample row, so it is stringified and truncated;
 * seeing which row produced which result is the point, not reading it all.
 */
const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  const text =
    _.isPlainObject(value) || Array.isArray(value)
      ? JSON.stringify(value)
      : String(value);

  return text.length > MAX_CELL ? `${text.slice(0, MAX_CELL)}…` : text;
};

/**
 * What a JSONata expression actually produces, evaluated locally against the
 * sample before anything is sent. An expression that will not evaluate is
 * shown as an error here rather than being rejected by the API later.
 */
const ExpressionResultCard: React.FC<ExpressionResultCardProps> = ({
  expression,
  dataType,
  results,
  error,
}) => (
  <Paper variant="outlined" sx={{ p: 1.5 }}>
    <Stack spacing={1}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Typography variant="body2" component="code">
          {expression}
        </Typography>
        {dataType && <Chip size="small" label={dataType} />}
      </Stack>

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        results &&
        results.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Input</TableCell>
                  <TableCell>Result</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result, index) => (
                  // Results are positional; the sample rows carry no id.

                  <TableRow key={index}>
                    <TableCell>{asText(result.input)}</TableCell>
                    <TableCell>{asText(result.output)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}
    </Stack>
  </Paper>
);

export default ExpressionResultCard;
