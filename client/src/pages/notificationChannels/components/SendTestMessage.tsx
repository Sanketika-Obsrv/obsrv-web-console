import { Button, CircularProgress, Grid } from "@mui/material";
import { DialogActions } from "@mui/material";
import { Box, DialogContent, DialogTitle } from "@mui/material";
import MUIForm from "components/form";
import { useState } from "react";
import * as yup from 'yup';
import _ from 'lodash';
import { useDispatch } from "react-redux";
import { error, success } from "services/toaster";
import { testChannel } from "services/notificationChannels";
import Loader from "components/Loader";
import en from 'utils/locales/en.json'

const SendTestMessage = (props: any) => {
    const { channel = {}, onClose , setTestChannel} = props;
    const { type } = channel;
    const [loading, setLoading] = useState(false);
    const [value, subscribe] = useState<any>({ message: `Testing ${_.capitalize(type)} integration. If you can read this, it's working!` });
    const onSubmission = (value: any) => { };
    const dispatch = useDispatch();

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
        .shape({ message: yup.string().required(en.isRequired)});

    const sendMessage = async () => {
        const message = _.get(value, 'message');

        if (!message) {
            setTestChannel(false)
            dispatch(error({ message: "Invalid Message" }));
            return;
        }

        setLoading(true)
        try {
            await testChannel({ data: { message, payload: channel } })
            setTestChannel(true)
            dispatch(success({ message: "Message Sent" }));
        } catch (err) {
            setTestChannel(false)
            dispatch(error({ message: "Failed to dispatch message" }));
        } finally {
            setLoading(false)
            onClose()
        }
    }

    return <>
        {loading && <Loader />}
        <Box sx={{ p: 1, py: 1.5 }}>
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
        </Box>
    </>
}


export default SendTestMessage