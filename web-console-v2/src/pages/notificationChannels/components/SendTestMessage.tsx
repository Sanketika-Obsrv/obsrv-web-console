/* eslint-disable */
import React from 'react';
import { Button, CircularProgress, Grid } from "@mui/material";
import { DialogActions } from "@mui/material";
import { Box, DialogContent, DialogTitle } from "@mui/material";
import MUIForm from "components/form";
import { useState } from "react";
import * as yup from 'yup';
import _ from 'lodash';
import { testChannel } from "services/notificationChannels";
import Loader from "components/Loader";
import en from 'utils/locales/en.json'
import { useAlert } from "contexts/AlertContextProvider";

const SendTestMessage = (props: any) => {
    const { channel = {}, onClose, setTestChannel } = props;
    const { type } = channel;
    const [loading, setLoading] = useState(false);
    const [value, subscribe] = useState<any>({ message: `Testing ${_.capitalize(type)} integration. If you can read this, it's working!` });
    const onSubmission = (value: any) => { };
    const { showAlert } = useAlert();

    const fields = [
        {
            name: "message",
            label: "Custom Message",
            type: 'text',
            required: true
        },
    ]

    const validationSchema = yup
        .object()
        .shape({ message: yup.string().required(en.isRequired) });

    const sendMessage = async () => {
        const message = _.get(value, 'message');

        if (!message) {
            setTestChannel(false)
            showAlert("Invalid Message", "error")
            return;
        }

        setLoading(true)
        try {
            await testChannel({ data: { message, payload: channel } })
            setTestChannel(true)
            showAlert("Message Sent", "success")
        } catch (err) {
            setTestChannel(false)
            showAlert("Failed to dispatch message", "error")
        } finally {
            setLoading(false)
            onClose()
        }
    }

    return <>
        {loading ? <Loader loading={loading} /> : <Box sx={{ p: 1, py: 1.5 }}>
            <DialogTitle>Test Notification Channel</DialogTitle>
            <DialogContent>
                <Grid container>
                    <Grid item xs={12} m={2}>
                        <MUIForm
                            initialValues={value}
                            enableReinitialize={true}
                            subscribe={subscribe}
                            onSubmit={(value: any) => onSubmission(value)}
                            fields={fields}
                            size={{ xs: 12 }}
                            validationSchema={validationSchema}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button color="error" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="contained" autoFocus onClick={_ => sendMessage()}>
                    Send Message
                </Button>
            </DialogActions>
        </Box>}
    </>
}


export default SendTestMessage