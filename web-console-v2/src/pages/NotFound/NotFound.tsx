import { Button, Typography } from "@mui/material";
import { Box } from "@mui/system";
import React, { useCallback } from "react";
import Error from '../../assets/ErrorSvg';
import styles from './NotFound.module.css';
import { useNavigate } from "react-router-dom";

export const  NotFound = () => {
  const navigate = useNavigate();
  const handleHome = useCallback(() => {
    navigate("/dashboard")
  }, []);
    return (
        <Box
         className={styles.container}
        >
            <Box>
            <svg className={styles.errorIcon}>
                <Error className={styles.errorIcon}></Error>
            </svg>
            </Box>
    
          <Typography variant="h2" sx={{ marginTop: 2 }}>
            Page not found
          </Typography>
        </Box>)
}