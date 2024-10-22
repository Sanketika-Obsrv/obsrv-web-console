import React from 'react';
import { Button, Typography } from '@mui/material';

interface Props {
    handleClick?: () => void;
    icon: any;
    buttonProps?: any;
    label?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const IconButtonWithTips = ({ handleClick = () => {}, buttonProps, label, icon }: Props) => {
    return (
        <>
            {icon && label ? (
                <Button variant="outlined" onClick={handleClick} startIcon={icon} {...buttonProps}>
                    <Typography variant="body2" color="text.primary">
                        {label}
                    </Typography>
                </Button>
            ) : (
                <Button variant="outlined" onClick={handleClick} {...buttonProps}>
                    <span
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {icon}
                    </span>
                </Button>
            )}
        </>
    );
};

export default IconButtonWithTips;
