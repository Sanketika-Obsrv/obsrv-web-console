import { createSlice } from '@reduxjs/toolkit';
import _ from 'lodash';

const initialState: Record<string, any>[] = [];

const systemSettings = createSlice({
    name: 'systemSettings',
    initialState,
    reducers: {
        addSystemSettings(state, action) {
            const { payload } = action;
            return payload;
        },
        addSystemSetting(state, action) {
            const { payload } = action;
            return [...state, payload];
        },
        deleteSystemSetting(state, action) {
            const { payload } = action;
            const { key } = payload;
            if (!key) return state;
            return _.filter(state, payload => _.get(payload, 'key') !== key);
        }
    }
});

export default systemSettings.reducer;
export const { addSystemSetting, deleteSystemSetting, addSystemSettings } = systemSettings.actions;
