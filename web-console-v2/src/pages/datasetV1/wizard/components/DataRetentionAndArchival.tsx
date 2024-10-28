import {
    Radio, Stack, Checkbox, FormControl,
    FormControlLabel, Grid, RadioGroup,
    TextField, Tooltip, Typography
} from "@mui/material";
import config from 'data/initialConfig';
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateState } from "store/reducers/wizard";
import * as _ from "lodash";
const { spacing } = config;


const DataRetentionAndArchival = (props: any) => {
    const dispatch = useDispatch();
    const { description, id } = props;
    const existingState: any = useSelector((state: any) => _.get(state, ['wizard', 'pages', id]));
    const [initialValues, setInitialValues] = useState({
        configureRetention: false,
        retentionPeriod: 0,
        archivalPolicy: "coldStorage"
    });

    const formik = useFormik({
        initialValues: existingState && { ...existingState.values } || initialValues,
        onSubmit: values => pushStateToStore(values),
    });

    const pushStateToStore = (values: any) => {
        dispatch(updateState({ id, values }));
    }

    useEffect(() => {
        existingState && setInitialValues(existingState);
    }, [existingState]);

    const renderArchivalForm = () => {
        return <Stack spacing={1} my={2}>
            <Typography variant="h6" fontWeight="500" aria-label='form-label' gutterBottom>
                Archival Policy
            </Typography>
            <FormControl component="fieldset" sx={{ my: 1 }}>
                <RadioGroup aria-label="gender" value={formik.values.archivalPolicy} name="archivalPolicy" row onChange={handleChange}>
                    <FormControlLabel value="purge" control={<Radio />} label="Purge Data" />
                    <FormControlLabel value="coldStorage" control={<Radio />} label="Move to Cold Storage" />
                </RadioGroup>
            </FormControl>
        </Stack>
    }

    const handleChange = (e: any) => {
        formik.setFieldValue(e.target.name, e.target.value);
        const data = {
            ...formik.values,
            [e.target.name]: e.target.value,
        };
        pushStateToStore(data);
    }

    const renderRetentionForm = () => {
        const name = "configureRetention"
        return <Stack spacing={1} my={1}>
            <Typography variant="h6" fontWeight="500" aria-label='form-label' gutterBottom>
                Retention Policy
            </Typography>
            <Grid container rowSpacing={spacing} justifyContent="flex-start" alignItems="center">
                <Grid item xs={3}>
                    <FormControlLabel key={`${name}`} name={name} control={<Checkbox name={'configureRetention'} checked={formik.values['configureRetention']} className="size-medium" onChange={formik.handleChange} />} label={'Configure Retention Period'} />
                </Grid>
                <Grid item xs={3}>
                    <Tooltip title={'Configure Retention Period in Days'}>
                        <TextField
                            label="Duration in Days"
                            onChange={handleChange}
                            type="number"
                            name="retentionPeriod"
                            value={formik.values.retentionPeriod}
                            variant="outlined"
                            fullWidth
                            autoComplete="off" />
                    </Tooltip>
                </Grid>
            </Grid>
        </Stack>
    }

    return <>
        <Grid container rowSpacing={2}>
            <Grid item xs={12} >
                <form onSubmit={formik.handleSubmit}>
                    {renderRetentionForm()}
                    {renderArchivalForm()}
                </form>
            </Grid>
        </Grid>
    </>
}

export default DataRetentionAndArchival;
