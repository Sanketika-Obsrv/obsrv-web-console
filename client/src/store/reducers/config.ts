import { createSlice } from '@reduxjs/toolkit';
import initialconfig from 'data/initialConfig';
import _ from 'lodash';

const initialState: Record<string, any> = initialconfig;

const menu = createSlice({
    name: 'config',
    initialState,
    reducers: {
        setConfig(state, action) {
            const { payload } = action;
            const { key, value } = payload;
            state[key] = value;
        },
        deleteConfig(state, action) {
            const { payload } = action;
            const { key } = payload;
            delete state[key]
        },
        setConfigs(state, action) {
            const { payload = {} } = action;
            _.forEach(payload, (value, key) => {
                state[key] = value;
            })
        }
    }
});

export default menu.reducer;
export const { setConfig, setConfigs } = menu.actions;