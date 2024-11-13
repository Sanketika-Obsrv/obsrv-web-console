import React, { useEffect } from 'react';
import { Alert as MuiAlert, Stack } from '@mui/material';
import { useAlert } from 'contexts/AlertContextProvider';
import { theme } from 'theme';

const AlertComponent: React.FC = () => {
    const { visible, message, type, hideAlert } = useAlert();

    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                hideAlert();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible, hideAlert]);

    const getAlertStyles = (type: string) => {
        switch (type) {
            case 'success':
                return {
                    backgroundColor: theme.palette.success.light
                };
            case 'error':
                return {
                    backgroundColor: theme.palette.error.light
                };
            case 'warning':
                return {
                    backgroundColor: theme.palette.warning.light
                };
            case 'info':
                return {
                    backgroundColor: theme.palette.info.light
                };
            default:
                return {};
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 100,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                maxWidth: '600px',
                zIndex: 1300
            }}
        >
            {visible && (
                <Stack spacing={2} sx={{ width: '100%' }}>
                    <MuiAlert
                        onClose={hideAlert}
                        severity={type}
                        sx={{ width: '100%', ...getAlertStyles(type) }}
                    >
                        {message}
                    </MuiAlert>
                </Stack>
            )}
        </div>
    );
};

export default AlertComponent;
