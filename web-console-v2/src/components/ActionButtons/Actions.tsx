import React, { ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import styles from './Actions.module.css';
interface ButtonConfig {
    id: string;
    label: string;
    variant?: 'text' | 'outlined' | 'contained';
    color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    disabled?: boolean;
    icon?: ReactNode;
}

interface ActionsProps {
    buttons: ButtonConfig[];
    onClick: (id: string) => void;
}

const Actions = ({ buttons, onClick }: ActionsProps) => {
    return (
        <Box className={styles.actionContainers}>
            <Box>
                {buttons.map((buttonConfig, index) => (
                    <Button
                        key={index}
                        variant={buttonConfig.variant || 'text'}
                        color={buttonConfig.color || 'primary'}
                        disabled={buttonConfig.disabled || false}
                        onClick={() => onClick(buttonConfig.id)}
                        className={styles.button}
                        sx={{mr: 8}}
                    >
                        {buttonConfig.icon && <Button color="primary">{buttonConfig.icon}</Button>}
                        {buttonConfig.label}
                    </Button>
                ))}
            </Box>
        </Box>
    );
};

export default Actions;
