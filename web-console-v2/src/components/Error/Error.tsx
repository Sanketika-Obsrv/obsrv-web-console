import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import Error from '../../assets/ErrorSvg';
import styles from './Error.module.css';

interface ErrorPageProps {
  onRetry: () => void;
  title: string;
  message: string;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ onRetry, title, message }) => (
  <Box className={styles.errorContainer}>
    <svg className={styles.errorIcon}>
      <Error className={styles.errorIcon} />
    </svg>
    <Typography variant="bodyBold" className={styles.errorTitle}>
      {title}
    </Typography>
    <Typography variant="body1" className={styles.errorDescription}>
      {message}
    </Typography>
    <Button
      variant="contained"
      color="primary"
      className={styles.button}
      onClick={onRetry}
    >
      Retry
    </Button>
  </Box>
);

export default ErrorPage;
