import { createSlice } from '@reduxjs/toolkit';
import { fetchDatasetsThunk } from '../middlewares';

const initialState: Record<string, any> = {
    data: null,
    error: null,
    status: 'idle'
};

const dataset = createSlice({
    name: 'dataset',
    initialState,
    reducers: {
        setDatasets(state, action) {
            const { payload } = action;
            state.data = payload;
            state.status = 'success';
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDatasetsThunk.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchDatasetsThunk.fulfilled, (state, action) => {
                state.status = 'success';
                state.data = action.payload;
            })
            .addCase(fetchDatasetsThunk.rejected, (state, action) => {
                state.status = 'error';
                state.error = action.error.message;
            });
    }
});

export default dataset.reducer;

export const { setDatasets } = dataset.actions;
