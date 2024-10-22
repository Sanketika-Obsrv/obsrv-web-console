import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const ConnectorManagement: React.FC<SvgIconProps> = (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <rect
            x="18"
            y="15"
            width="4"
            height="4"
            rx="2"
            transform="rotate(90 18 15)"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
        />
        <rect
            x="6"
            y="8"
            width="4"
            height="4"
            rx="2"
            transform="rotate(-90 6 8)"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
        />
        <path
            d="M8 8V13C8 14.8856 8 15.8284 8.58579 16.4142C9.17157 17 10.1144 17 12 17H14"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
        />
    </SvgIcon>
);

export default ConnectorManagement;
