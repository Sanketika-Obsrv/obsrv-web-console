import * as Yup from 'yup';
import { Formik } from 'formik';
import IconButton from 'components/@extended/IconButton';
import AnimateButton from 'components/@extended/AnimateButton';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Button, Grid, InputAdornment, OutlinedInput, Stack } from '@mui/material';
import LoginSocialButton from './LoginSocialButton';
import interactEdataIds from 'data/telemetry/interact.json';
import React from 'react';
import pageIds from 'data/telemetry/pageIds';
import { generateStartEvent } from 'services/telemetry';
import { getBaseURL } from 'services/configData';

const LoginForm = (props: any) => {

    const [showPassword, setShowPassword] = React.useState(false);

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };
    const startEvent = (event: any) => {
        generateStartEvent({
          edata: {
            type: interactEdataIds.login,
            pageid: pageIds.login,
          }, object: {}
        });
      }

    const handleMouseDownPassword = (event: React.SyntheticEvent) => {
        event.preventDefault();
    };

    return (
        (props.type === "") ? <></> :
        <Formik
            initialValues={{ username: '', password: '', submit: null }}
            validationSchema={Yup.object().shape({ username: Yup.string().max(255).required('User name is required'), password: Yup.string().max(255).required('Password is required') })}
            onSubmit={async () => { }}
        >
            {({ errors, handleBlur, handleChange, isSubmitting, touched, values }) => (
                <form
                    noValidate
                    action={props.type === 'obsrv' ? `${getBaseURL()}/api/oauth/v1/login` : `${getBaseURL()}/api/auth/ad`}
                    method="post"
                >
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Stack spacing={1}>
                                <OutlinedInput
                                    type="text"
                                    value={values.username}
                                    name="username"
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    placeholder={`Enter${props.type == "ad" ? " AD" : ""} user name`}
                                    fullWidth
                                    error={Boolean(touched.username && errors.username)}
                                />
                            </Stack>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack spacing={1}>
                                <OutlinedInput
                                    fullWidth
                                    color={'primary'}
                                    error={Boolean(touched.password && errors.password)}
                                    id="-password-login"
                                    type={showPassword ? 'text' : 'password'}
                                    value={values.password}
                                    name="password"
                                    onBlur={(event: React.FocusEvent<any, Element>) => {
                                        handleBlur(event);
                                    }}
                                    onChange={handleChange}
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <IconButton
                                                id="input-password"
                                                data-edataid={showPassword ? interactEdataIds.password_visible : interactEdataIds.password_invisble}
                                                aria-label="toggle password visibility"
                                                onClick={handleClickShowPassword}
                                                onMouseDown={handleMouseDownPassword}
                                                edge="end"
                                                color="secondary"
                                            >
                                                {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                            </IconButton>
                                        </InputAdornment>
                                    }
                                    placeholder={`Enter ${props.type == "ad" ? " AD" : ""} password`}
                                />
                            </Stack>
                        </Grid>
                        <Grid item xs={12}>
                            <AnimateButton>
                                <Button onClick={startEvent} data-edataid={interactEdataIds.login} disableElevation disabled={isSubmitting} fullWidth size="large" type="submit" variant="contained" color="primary">
                                    Login
                                </Button>
                            </AnimateButton>
                        </Grid>
                        <Grid item xs={12}>
                            <LoginSocialButton />
                        </Grid>
                    </Grid>
                </form>
            )}
        </Formik>)
}

export default LoginForm;