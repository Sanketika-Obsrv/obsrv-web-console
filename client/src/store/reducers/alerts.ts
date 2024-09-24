import { createSlice } from '@reduxjs/toolkit';
import { fetchAlertsThunk } from '../middlewares';

const initialState: Record<string, any> = {
    data: null,
    error: null,
    status: 'idle'
};

const alerts = createSlice({
    name: 'alerts',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAlertsThunk.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchAlertsThunk.fulfilled, (state, action) => {
                state.status = 'success';
                state.data = action.payload;
            })
            .addCase(fetchAlertsThunk.rejected, (state, action) => {
                state.status = 'error';
                state.error = action.error.message;
            });
    }
});

export default alerts.reducer;