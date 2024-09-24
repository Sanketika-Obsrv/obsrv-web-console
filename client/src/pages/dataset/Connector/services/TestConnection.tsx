import { error, success } from 'services/toaster';
import { LinkOutlined } from '@ant-design/icons';
import * as _ from "lodash";
import { useDispatch } from 'react-redux';
import { verifyConnection } from 'services/connectors';
import { useState } from 'react';
import { LoadingButton } from '@mui/lab';
import Loader from 'components/Loader';

const TestConnection = (props: any) => {
    const { connectorInfo, disabled, setConnectionStatus } = props;
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);

    const testConnection = async (payload: Record<string, any>) => {
        setLoading(true);
        try {
            const { connector_type, ...rest } = payload || {};
            await verifyConnection({ type: connector_type, config: rest });
            dispatch(success({ message: "Connection established successfully" }));
            setLoading(false);
            setConnectionStatus(true)
        } catch (err) {
            dispatch(error({ message: "Failed to establish connection." }));
            setLoading(false);
            setConnectionStatus(false)
        }
    }

    return (
        <>
            {loading && <Loader />}
            <LoadingButton
                onClick={_ => testConnection(connectorInfo)}
                variant="outlined"
                color="primary"
                disabled={disabled}
                loading={loading}
                startIcon={<LinkOutlined />}
                loadingPosition='end'
                sx={{ fontWeight: 500, verticalAlign: 'top', }}
                size="large"
            >
                Test connection
            </LoadingButton>
        </>
    );
}

export default TestConnection;