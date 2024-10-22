import React, { createContext, useState, ReactNode, useContext } from 'react';
import { AlertColor } from '@mui/material';

type AlertContextProps = {
    visible: boolean;
    message: string;
    type: AlertColor;
    showAlert: (message: string, type: AlertColor) => void;
    hideAlert: () => void;
};

const defaultContextValue: AlertContextProps = {
    visible: false,
    message: '',
    type: 'info',
    showAlert: () => {
        /* Default no-op implementation */
    },
    hideAlert: () => {
        /* Default no-op implementation */
    }
};

const AlertContext = createContext<AlertContextProps>(defaultContextValue);

export const AlertContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [visible, setVisible] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [type, setType] = useState<AlertColor>('info');

    const showAlert = (message: string, type: AlertColor) => {
        setMessage(message);
        setType(type);
        setVisible(true);
    };

    const hideAlert = () => {
        setVisible(false);
        setMessage('');
        setType('info');
    };

    return (
        <AlertContext.Provider
            value={{
                visible,
                message,
                type,
                showAlert,
                hideAlert
            }}
        >
            {children}
        </AlertContext.Provider>
    );
};

export const useAlert = () => useContext(AlertContext);
