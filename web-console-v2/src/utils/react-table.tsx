import React from 'react';
import { TextField } from '@mui/material';

export function DefaultColumnFilter({ column: { filterValue, Header, setFilter } }: any) {
    return (
        <TextField
            fullWidth
            value={filterValue || ''}
            onChange={(e) => {
                setFilter(e.target.value || undefined);
            }}
            placeholder={`Search by ${Header}`}
            size="small"
            sx={{ height: 40 }}
            InputProps={{ sx: { height: '100%' } }}
        />
    );
}