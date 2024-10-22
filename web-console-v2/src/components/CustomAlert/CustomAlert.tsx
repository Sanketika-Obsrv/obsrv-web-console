import React, { FC, ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PriorityHighOutlinedIcon from '@mui/icons-material/PriorityHighOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import styles from './CustomAlert.module.css';

type AlertType = 'error' | 'warning' | 'info' | 'success';

interface CustomAlertProps {
  type: AlertType;
  title: string;
  message?: ReactNode;
}

const CustomAlert: FC<CustomAlertProps> = ({ type, title, message }) => {
  const iconMap: Record<AlertType, ReactNode> = {
    error: <CancelOutlinedIcon fontSize="inherit" />,
    warning: <PriorityHighOutlinedIcon fontSize="inherit" />,
    info: <InfoOutlinedIcon fontSize="inherit" />,
    success: <CheckCircleOutlinedIcon fontSize="inherit" />,
  };

  const bgColorMap: Record<AlertType, string> = {
    error: ' rgba(255, 238, 238, 1)',
    warning: '#FFF6E6',
    info: '#E9F4FF',
    success: '#EAFBEE',
  };

  const textColorMap: Record<AlertType, string> = {
    error: '#721c24',
    warning: '#856404',
    info: '#0c5460',
    success: '#155724',
  };

  return (
    <div className={styles.alertContainer}>
      <Alert
        severity={type}
        icon={iconMap[type]}
        style={{
          backgroundColor: bgColorMap[type],
          color: textColorMap[type],
        }}
      >
        <AlertTitle style={{ color: textColorMap[type] }}>{title}</AlertTitle>
        {message && <div>{message}</div>}
      </Alert>
    </div>
  );
};

export default CustomAlert;
