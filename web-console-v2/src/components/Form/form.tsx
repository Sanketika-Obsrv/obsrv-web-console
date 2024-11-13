import {
    Autocomplete,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormHelperText,
    FormLabel,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Radio,
    Select,
    Slider,
    Stack,
    TextField,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    Chip
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useFormik } from 'formik';
import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import _ from 'lodash';

const MUIForm = forwardRef((props: any, ref: any) => {
    const {
        initialValues,
        validationSchema = null,
        onSubmit,
        fields,
        children,
        subscribe = null,
        subscribeErrors = null,
        size = {},
        enableReinitialize = false,
        formComponent = null,
        customUpdate = null,
        customError = null,
        debounce
    } = props;
    const { xs = 12, sm = 12, lg = 12 } = size;

    // eslint-disable-next-line @typescript-eslint/no-empty-function, react-hooks/exhaustive-deps
    const debouncedSubscribeValue = useCallback(_.debounce(subscribe || (() => {}), 1000), []);
    const form = useFormik({ initialValues, validationSchema, onSubmit, enableReinitialize });
    const formRef = useRef(form);
    const [showPassword, setShowPassword] = useState<any>({});

    if (ref) {
        ref.current = formRef.current;
    }

    const handleAutoComplete = (
        setFieldValue: any,
        value: any,
        multiple: boolean,
        name: string
    ) => {
        if (multiple) {
            setFieldValue(name, value);
        } else setFieldValue(name, value.value);
    };

    useEffect(() => {
        if (!subscribe) return;
        if (debounce) debouncedSubscribeValue(form.values);
        else subscribe(form.values);
    }, [debounce, debouncedSubscribeValue, form.values, subscribe]);

    useEffect(() => {
        subscribeErrors && subscribeErrors(form.errors);
    }, [form.errors, subscribeErrors]);

    const customUpdateValue = useCallback(
        () => (key: any, value: any) => form.setFieldValue(key, value),
        []
    );
    const customUpdateErrors = useCallback(
        () => (key: any, value: any) => form.setErrors({ [key]: value }),
        []
    );

    useEffect(() => {
        customUpdate && customUpdate(customUpdateValue);
        customError && customError(customUpdateErrors);
    }, []);

    const handleClickShowPassword = (name: string) => {
        setShowPassword((prevState: any) => ({
            ...prevState,
            [name]: !prevState[name]
        }));
    };

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    return (
        <form onSubmit={form.handleSubmit}>
            <Grid container spacing={3}>
                {fields.map((field: any) => {
                    const {
                        name,
                        tooltip = '',
                        label,
                        type,
                        dependsOn = null,
                        selectOptions,
                        required = false,
                        helperText = '',
                        disabled = false,
                        multiple = false,
                        filterInclude = false,
                        config = {}
                    } = field;
                    const helpText = helperText || field.helperText;

                    if (dependsOn) {
                        const { key, value } = dependsOn;
                        if (filterInclude) {
                            if (
                                !_.includes(_.get(form.values, key), value) &&
                                !(_.get(form.values, [key]) === value)
                            )
                                return null;
                        } else {
                            if (!(_.get(form.values, [key]) === value)) return null;
                        }
                    }

                    switch (type) {
                        case 'text':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <TextField
                                        value={_.get(form.values, [name]) || ''}
                                        onChange={(e) => form.setFieldValue(name, e.target.value)}
                                        variant="outlined"
                                        fullWidth
                                        autoComplete="off"
                                        onBlur={form.handleBlur}
                                        label={label}
                                        required
                                        placeholder={tooltip}
                                        error={Boolean(form.errors[name] && form.touched[name])}
                                        helperText={
                                            (form.touched[name] &&
                                                form.errors[name] &&
                                                String(form.errors[name])) ||
                                            helpText
                                        }
                                    />
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
                                            type="number"
                                            onBlur={form.handleBlur}
                                            error={Boolean(form.errors[name] && form.touched[name])}
                                            helperText={
                                                (form.touched[name] &&
                                                    form.errors[name] &&
                                                    String(form.errors[name])) ||
                                                helpText
                                            }
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
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            onClick={() =>
                                                                handleClickShowPassword(name)
                                                            }
                                                            onMouseDown={handleMouseDownPassword}
                                                            edge="end"
                                                        >
                                                            {showPassword[name] ? (
                                                                <VisibilityOff fontSize="small" />
                                                            ) : (
                                                                <Visibility fontSize="small" />
                                                            )}
                                                        </IconButton>
                                                    </InputAdornment>
                                                )
                                            }}
                                            type={showPassword[name] ? 'text' : 'password'}
                                            onBlur={form.handleBlur}
                                            error={Boolean(form.errors[name] && form.touched[name])}
                                            helperText={
                                                (form.touched[name] &&
                                                    form.errors[name] &&
                                                    String(form.errors[name])) ||
                                                helpText
                                            }
                                        />
                                    </Tooltip>
                                </Grid>
                            );
                        case 'checkbox':
                            return (
                                <Grid
                                    item
                                    xs={xs}
                                    sm={sm}
                                    lg={lg}
                                    key={name}
                                    alignSelf="flex-start"
                                >
                                    <Tooltip title={tooltip}>
                                        <FormGroup>
                                            <Stack direction="row" spacing={1}>
                                                {selectOptions.map((option: any) => {
                                                    const { value, label } = option;
                                                    return (
                                                        <FormControlLabel
                                                            key={`${name}-${value}`}
                                                            name={name}
                                                            disabled={disabled}
                                                            control={
                                                                <Checkbox
                                                                    onBlur={form.handleBlur}
                                                                    name={name}
                                                                    className="size-medium"
                                                                    checked={_.includes(
                                                                        _.get(form.values, name),
                                                                        value
                                                                    )}
                                                                    value={value}
                                                                    onChange={form.handleChange}
                                                                    disabled={disabled}
                                                                />
                                                            }
                                                            label={label}
                                                        />
                                                    );
                                                })}
                                            </Stack>
                                        </FormGroup>
                                    </Tooltip>
                                    <FormHelperText error={Boolean(form.errors[name])}>
                                        {(form.touched[name] &&
                                            form.errors[name] &&
                                            String(form.errors[name])) ||
                                            helpText}
                                    </FormHelperText>
                                </Grid>
                            );
                        case 'radio':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <FormGroup>
                                            <Typography
                                                variant="h6"
                                                fontWeight="500"
                                                aria-label="form-label"
                                                gutterBottom
                                            >
                                                {label}
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                                {selectOptions.map((option: any) => {
                                                    const { value, label } = option;
                                                    return (
                                                        <FormControlLabel
                                                            key={`${name}-${value}`}
                                                            name={name}
                                                            disabled={disabled}
                                                            control={
                                                                <Radio
                                                                    onBlur={form.handleBlur}
                                                                    name={name}
                                                                    className="size-medium"
                                                                    checked={
                                                                        value ===
                                                                        _.get(form.values, name)
                                                                    }
                                                                    value={value}
                                                                    onChange={form.handleChange}
                                                                    required={required}
                                                                    disabled={disabled}
                                                                />
                                                            }
                                                            label={label}
                                                        />
                                                    );
                                                })}
                                            </Stack>
                                        </FormGroup>
                                    </Tooltip>
                                    <FormHelperText error={Boolean(form.errors[name])}>
                                        {(form.touched[name] &&
                                            form.errors[name] &&
                                            String(form.errors[name])) ||
                                            helpText}
                                    </FormHelperText>
                                </Grid>
                            );
                        case 'select':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <FormControl
                                            error={
                                                Boolean(form.errors[name]) &&
                                                Boolean(form.touched[name])
                                            }
                                            fullWidth
                                            required={required}
                                            disabled={disabled}
                                        >
                                            <InputLabel>{label}</InputLabel>
                                            <Select
                                                defaultValue={_.get(form.values, name) || ''}
                                                name={name}
                                                id={name}
                                                label={label}
                                                value={_.get(form.values, name)}
                                                onChange={form.handleChange}
                                                onBlur={form.handleBlur}
                                            >
                                                {selectOptions.map((option: any, index: any) => (
                                                    <MenuItem value={option.value} key={index}>
                                                        {option.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Tooltip>
                                    <FormHelperText error={Boolean(form.errors[name])}>
                                        {(form.touched[name] &&
                                            form.errors[name] &&
                                            String(form.errors[name])) ||
                                            helpText}
                                    </FormHelperText>
                                </Grid>
                            );
                        case 'toggle':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <FormControl>
                                            <FormLabel component="legend">{label}</FormLabel>
                                            <ToggleButtonGroup
                                                exclusive
                                                value={_.get(form.values, [name])}
                                                onChange={(event, value) =>
                                                    form.setFieldValue(name, value)
                                                }
                                            >
                                                {selectOptions.map((option: any) => {
                                                    const { value, label } = option;
                                                    return (
                                                        <Tooltip
                                                            key={`${name}-${value}`}
                                                            title={label}
                                                        >
                                                            <IconButton value={value}>
                                                                {label}
                                                            </IconButton>
                                                        </Tooltip>
                                                    );
                                                })}
                                            </ToggleButtonGroup>
                                        </FormControl>
                                    </Tooltip>
                                </Grid>
                            );
                        case 'slider':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <FormControl>
                                            <FormLabel component="legend">{label}</FormLabel>
                                            <Slider
                                                value={_.get(form.values, [name])}
                                                onChange={(event, value) =>
                                                    form.setFieldValue(name, value)
                                                }
                                                aria-labelledby="continuous-slider"
                                                min={config.min || 0}
                                                max={config.max || 100}
                                                step={config.step || 1}
                                            />
                                            <FormHelperText>
                                                {(form.touched[name] &&
                                                    form.errors[name] &&
                                                    String(form.errors[name])) ||
                                                    helpText}
                                            </FormHelperText>
                                        </FormControl>
                                    </Tooltip>
                                </Grid>
                            );
                        case 'autocomplete':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <Autocomplete
                                            multiple={multiple}
                                            options={selectOptions}
                                            value={
                                                multiple
                                                    ? _.get(form.values, [name]) || []
                                                    : _.find(selectOptions, {
                                                          value: _.get(form.values, [name])
                                                      })
                                            }
                                            onChange={(event, value) =>
                                                handleAutoComplete(
                                                    form.setFieldValue,
                                                    value,
                                                    multiple,
                                                    name
                                                )
                                            }
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    variant="outlined"
                                                    label={label}
                                                />
                                            )}
                                            disableClearable
                                            fullWidth
                                        />
                                    </Tooltip>
                                </Grid>
                            );
                        case 'chip':
                            return (
                                <Grid item xs={xs} sm={sm} lg={lg} key={name}>
                                    <Tooltip title={tooltip}>
                                        <FormControl>
                                            <FormLabel component="legend">{label}</FormLabel>
                                            <Stack direction="row" spacing={1}>
                                                {selectOptions.map((option: any) => (
                                                    <Chip
                                                        key={`${name}-${option.value}`}
                                                        label={option.label}
                                                        onClick={() =>
                                                            form.setFieldValue(name, option.value)
                                                        }
                                                        color={
                                                            _.get(form.values, [name]) ===
                                                            option.value
                                                                ? 'primary'
                                                                : 'default'
                                                        }
                                                    />
                                                ))}
                                            </Stack>
                                            <FormHelperText>
                                                {(form.touched[name] &&
                                                    form.errors[name] &&
                                                    String(form.errors[name])) ||
                                                    helpText}
                                            </FormHelperText>
                                        </FormControl>
                                    </Tooltip>
                                </Grid>
                            );
                        default:
                            return null;
                    }
                })}
            </Grid>
            {children}
            {formComponent}
        </form>
    );
});

MUIForm.displayName = 'MUIForm';

export default MUIForm;
