import { Alert, Button, Grid, Typography } from "@mui/material";
import TestConnection from "./TestConnection";
import { useEffect, useState } from "react";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";

const ConnectorActions = (props: Record<string, any>) => {
    const { formData, type, formErrors, actionHandler, edit } = props;
    const [connectionStatus, setConnectionStatus] = useState<boolean>(false);

    useEffect(() => {
        setConnectionStatus(false)
    }, [formData])

    return <>{!formErrors && !connectionStatus &&
        <Alert severity="info" sx={{ marginBottom: '1rem', lineHeight: 0 }}>
            <Typography variant="caption" fontSize={13}>Add/Update Connectors config on a successful test connection</Typography>
        </Alert>}
        <Grid container justifyContent="flex-end" spacing={2} alignItems="center">
            <Grid item display="flex">
                <TestConnection connectorInfo={{ ...formData, ...(type && { type }) }} disabled={formErrors} setConnectionStatus={setConnectionStatus} />
            </Grid>
            <Grid item display="flex">
                <Button
                    variant="contained"
                    onClick={(e) => actionHandler(e)}
                    size="large"
                    disabled={formErrors || !connectionStatus}
                    sx={{ py: "0.8rem", px: "1.2rem" }}
                    startIcon={edit ? <EditOutlined /> : <PlusOutlined />}
                >
                    <Typography variant="h6">
                        {edit ? 'Update' : 'Add'}
                    </Typography>
                </Button>
            </Grid>
        </Grid>
    </>
}

export default ConnectorActions;