import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import React from 'react';
import { FieldRow } from './types';

export interface FieldTableCardProps {
  caption?: string;
  fields: FieldRow[];
}

/** The schema, or a slice of it, inside the conversation. */
const FieldTableCard: React.FC<FieldTableCardProps> = ({ caption, fields }) => {
  if (fields.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          No fields to show yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{caption ?? 'Field'}</TableCell>
            <TableCell>Arrival format</TableCell>
            <TableCell>Data type</TableCell>
            <TableCell>Required</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((field) => (
            <TableRow key={field.path}>
              <TableCell>{field.path}</TableCell>
              <TableCell>{field.arrivalFormat}</TableCell>
              <TableCell>{field.dataType}</TableCell>
              <TableCell>{field.required ? 'Required' : ''}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FieldTableCard;
