/* eslint-disable */
import { useState } from 'react';
import { Grid, Stack } from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import * as _ from 'lodash';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import interactIds from 'data/telemetry/interact.json';
import Loader from './Loader';

const tabProps = (index: number) => ({ id: `tab-${index}`, 'aria-controls': `tabpanel-${index}` });

export function TabPanel(props: any) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box py={3}>
                    {children}
                </Box>
            )}
        </div>
    );
}
