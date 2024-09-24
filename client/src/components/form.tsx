import { makeStyles } from '@mui/styles';
import * as _ from 'lodash';
import { Autocomplete, Checkbox, FormControl, FormControlLabel, FormGroup, FormHelperText, FormLabel, Grid, IconButton, InputAdornment, InputLabel, MenuItem, Radio, Select, Slider, Stack, TextField, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { useFormik } from 'formik';
import { ToggleButton } from '@mui/material';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { Chip } from '@mui/material';
import MainCard from './MainCard';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const useStyles = makeStyles((theme: any) => ({
    formControl: { margin: theme.spacing(1), minWidth: 120 },
    selectEmpty: { marginTop: theme.spacing(2) },
}));

const defaultFunc = (value: any) => { }

const MUIForm = forwardRef((props: any, ref: any) => {
    const { initialValues, validationSchema = null, onSubmit, fields, children, subscribe = null, subscribeErrors = null, size = {}, enableReinitialize = false, formComponent = null, customUpdate = null, customError = null, debounce } = props
    const classes: any = useStyles;
    let { xs = 12, sm = 12, lg = 12 } = size;

    const debouncedSubscribeValue = useCallback(_.debounce(subscribe || (() => { }), 1000), []);
    const form = useFormik({ initialValues, validationSchema, onSubmit, enableReinitialize });
    const formRef = useRef(form);
    const [showPassword, setShowPassword] = useState<any>({});

    if (ref) { ref.current = formRef.current; }

    const handleAutoComplete = (setFieldValue: any, value: any, multiple: boolean, name: string) => {
        if (multiple) {
            setFieldValue(name, value);
        } else setFieldValue(name, value.value);
    }

    useEffect(() => {
        if (!subscribe) return;
        if (debounce) debouncedSubscribeValue(form.values)
        else subscribe(form.values);
    }, [form.values]);

    useEffect(() => {
        subscribeErrors && subscribeErrors(form.errors)
    }, [form.errors]);

    const customUpdateValue = useCallback(() => (key: any, value: any) => form.setFieldValue(key, value), []);
    const customUpdateErrors = useCallback(() => (key: any, value: any) => form.setErrors({[key]: value}), []);

    useEffect(() => {
        customUpdate && customUpdate(customUpdateValue);
        customError && customError(customUpdateErrors);
    }, []);

    return (
        <form onSubmit={form.handleSubmit}>
            <Grid container spacing={3}>
                {fields.map((field: any) => {
                    const {
                        name, tooltip = '', label, type, dependsOn = null,
                        selectOptions, required = false, helperText = '',
                        disabled = false, multiple = false, filterInclude = false,
                        config = {}
                    } = field;
                    const helpText = helperText && helperText || field.helperText;

                    const handleClickShowPassword = () => {
                        setShowPassword((prevState: any) => ({
                            ...prevState,
                            [name]: !prevState[name]
                        }));
                    };
                    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
                        event.preventDefault();
                    };

                    if (dependsOn) {
                        const { key, value } = dependsOn;
                        if (filterInclude) {
                            if (!_.includes(_.get(form.values, key), value) && !(_.get(form.values, [key]) === value))
                                return null;
                        } else {
                            if (!(_.get(form.values, [key]) === value))
                                return null;
                        }
                    }

                    switch (type) {
                        case 'text':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <TextField
                                            value={_.get(form.values, [name]) || ''}
                                            onChange={form.handleChange}
                                            variant="outlined"
                                            fullWidth
                                            autoComplete="off"
                                            onBlur={form.handleBlur}
                                            error={Boolean(form.errors[name]) && form.touched[name]}
                                            {...field}
                                            helperText={form.touched[name] && form.errors[name] && String(form.errors[name]) || helpText}
                                        />
                                    </Tooltip>
                                </Grid>
                            );
                        case 'number':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <TextField
                                            value={_.get(form.values, [name])}
                                            onChange={form.handleChange}
                                            variant="outlined"
                                            fullWidth
                                            autoComplete="off"
                                            InputProps={{
                                                inputProps: { min: 0 }
                                            }}
                                            type='number'
                                            onBlur={form.handleBlur}
                                            error={Boolean(form.errors[name]) && form.touched[name]}
                                            helperText={form.touched[name] && form.errors[name] && String(form.errors[name]) || helpText}
                                            {...field}
                                        />
                                    </Tooltip>
                                </Grid>
                            );
                        case 'password':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <TextField
                                            value={_.get(form.values, [name])}
                                            onChange={form.handleChange}
                                            variant="outlined"
                                            fullWidth
                                            autoComplete="off"
                                            {...field}
                                            InputProps={{
                                                endAdornment:
                                                    <InputAdornment position="end" >
                                                        <IconButton
                                                            onClick={handleClickShowPassword}
                                                            onMouseDown={handleMouseDownPassword}
                                                            edge="end"
                                                        >
                                                            {showPassword[name] ? <VisibilityOff fontSize='small'/> : <Visibility fontSize='small'/>}
                                                        </IconButton>
                                                    </InputAdornment>
                                            }}
                                            type={showPassword[name] ? 'text' : 'password'}
                                            onBlur={form.handleBlur}
                                            error={Boolean(form.errors[name]) && form.touched[name]}
                                            helperText={form.touched[name] && form.errors[name] && String(form.errors[name]) || helpText}
                                        />
                                    </Tooltip>
                                </Grid>
                            );
                        case 'checkbox':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name} alignSelf="flex-start">
                                    <Tooltip title={tooltip}>
                                        <FormGroup>
                                            <Stack direction="row" spacing={1}>
                                                {selectOptions.map((option: any) => {
                                                    const { value, label } = option;
                                                    return <FormControlLabel key={`${name}-${value}`} name={name} disabled={disabled} control={<Checkbox onBlur={form.handleBlur} name={name} className="size-medium" checked={_.includes(_.get(form.values, name), value)} value={value} onChange={form.handleChange} disabled={disabled} />} label={label} />
                                                })}
                                            </Stack>
                                        </FormGroup>
                                    </Tooltip>
                                    <FormHelperText error={Boolean(form.errors[name])}>{form.touched[name] && form.errors[name] && String(form.errors[name]) || helpText}</FormHelperText>
                                </Grid>
                            );
                        case 'radio':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <FormGroup>
                                            <Typography variant="h6" fontWeight="500" aria-label='form-label' gutterBottom>
                                                {label}
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                                {selectOptions.map((option: any) => {
                                                    const { value, label } = option;
                                                    return <FormControlLabel key={`${name}-${value}`} name={name} disabled={disabled} control={<Radio onBlur={form.handleBlur} name={name} className="size-medium" checked={value === _.get(form.values, name)} value={value} onChange={form.handleChange} required={required} disabled={disabled} />} label={label} />
                                                })}
                                            </Stack>
                                        </FormGroup>
                                    </Tooltip>
                                    <FormHelperText error={Boolean(form.errors[name])}>{form.touched[name] && form.errors[name] && String(form.errors[name]) || helpText}</FormHelperText>
                                </Grid>
                            );
                        case 'select':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <FormControl error={Boolean(form.errors[name]) && Boolean(form.touched[name])} fullWidth key={name} className={classes.formControl} required={required} disabled={disabled}>
                                            <InputLabel >{label}</InputLabel>
                                            <Select
                                                defaultValue={_.get(form.values, name) || ''}
                                                name={name} id={name} label={label} value={_.get(form.values, name)} onChange={form.handleChange} onBlur={form.handleBlur}>
                                                {selectOptions.map((option: any) => (<MenuItem value={option.value}>{option.label}</MenuItem>))}
                                            </Select>
                                        </FormControl>
                                    </Tooltip>
                                    <FormHelperText error={Boolean(form.errors[name])}>{form.touched[name] && form.errors[name] && String(form.errors[name]) || helpText}</FormHelperText>
                                </Grid>
                            );
                        case 'autocomplete':
                            const val = _.find(selectOptions, (item) => item.value === _.get(form.values, name)) || null
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={val?.label || tooltip}>
                                        <FormControl fullWidth key={name} className={classes.formControl} required={required} disabled={disabled}>
                                            <Autocomplete
                                                id={name}
                                                componentsProps={{ popper: { style: { width: 'fit-content' } } }}
                                                value={val || null}
                                                disableClearable
                                                options={selectOptions}
                                                getOptionLabel={(option: any) => option.label}
                                                multiple={multiple}
                                                isOptionEqualToValue={(option: any) => option.value === _.get(form.values, name)}
                                                onChange={(e, value) => handleAutoComplete(form.setFieldValue, value, multiple, name)}
                                                renderInput={(params) => <TextField required={required} {...params} name={name} label={label} onBlur={form.handleBlur} error={Boolean(form.errors[name]) && Boolean(form.touched[name])} helperText={form.touched[name] && form.errors[name] && String(form.errors[name]) || helpText} />}
                                                {...field}
                                            />
                                        </FormControl>
                                    </Tooltip>
                                </Grid>
                            );
                        case 'buttonGroup':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <FormControl fullWidth component="fieldset" required={required} disabled={disabled}>
                                            <FormLabel component="legend">{label}</FormLabel>
                                            <ToggleButtonGroup exclusive color="info" aria-label="text alignment" onChange={form.handleChange} onBlur={form.handleBlur}>
                                                {
                                                    selectOptions.map((option: any, index: number) => {
                                                        return <ToggleButton key={index} id={name} value={option.value} aria-label="first">
                                                            {option?.label}
                                                        </ToggleButton>
                                                    })
                                                }
                                            </ToggleButtonGroup>
                                        </FormControl>
                                    </Tooltip>
                                    <FormHelperText error={Boolean(form.errors[name])}>{form.touched[name] && form.errors[name] && String(form.errors[name]) || helpText}</FormHelperText>
                                </Grid>
                            );
                        case 'multi-select':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <FormControl fullWidth key={name} className={classes.formControl} required={required} disabled={disabled}>
                                            <InputLabel >{label}</InputLabel>
                                            <Select
                                                multiple
                                                name={name}
                                                id={name}
                                                label={label}
                                                value={_.get(form.values, name) || []}
                                                onChange={form.handleChange}
                                                onBlur={form.handleBlur}
                                                renderValue={(selected) => (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        {selected.map((value: string) => (
                                                            <Chip key={value} label={value} />
                                                        ))}
                                                    </Box>
                                                )}
                                            >
                                                {selectOptions.map((option: any) => (<MenuItem value={option.value}>{option.label}</MenuItem>))}
                                            </Select>
                                        </FormControl>
                                    </Tooltip>
                                    <FormHelperText error={Boolean(form.errors[name])}>{form.touched[name] && form.errors[name] && String(form.errors[name]) || helpText}</FormHelperText>
                                </Grid>
                            );
                        case 'slider':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <MainCard content={false} sx={{ padding: "0.4rem" }}>
                                        <FormControl fullWidth key={name} className={classes.formControl} required={required} disabled={disabled}>
                                            <Stack direction='row' spacing={2} justifyContent='space-evenly'>
                                                <Typography marginTop={0.5}>{label}</Typography>
                                                <Tooltip title={tooltip}>
                                                    <Slider
                                                        value={_.get(form.values, name)}
                                                        id={name}
                                                        disabled={disabled}
                                                        name={name}
                                                        onChange={form.handleChange}
                                                        onBlur={form.handleBlur}
                                                        marks={false}
                                                        step={config.step || 1}
                                                        min={config.min}
                                                        max={config.max}
                                                    />
                                                </Tooltip>
                                                <Typography>{_.get(form.values, name) || 0}{config.suffix}</Typography>
                                            </Stack>
                                        </FormControl>
                                    </MainCard>
                                    <FormHelperText error={Boolean(form.errors[name])}>{form.touched[name] && form.errors[name] && String(form.errors[name]) || helpText}</FormHelperText>
                                </Grid>
                            )
                        default:
                            return null;
                    }
                })}
                {children}
                {formComponent && <Grid item xs={xs} sm={sm} lg={lg} alignSelf="flex-start">{formComponent}</Grid>}
            </Grid>
        </form>
    );
});

export default MUIForm;
