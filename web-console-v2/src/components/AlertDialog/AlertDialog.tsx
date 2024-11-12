import React from 'react';
import { Button, Dialog, DialogContentText, Typography } from '@mui/material';
import { Box, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import interactIds from 'data/telemetry/interact.json';
import styles from "./AlertDialog.module.css";

const AlertDialog = ({ handleClose, action = null, open = false, context = {} }: any) => {
    const handleAction = () => {
        if (action) action();
        handleClose(true);
    };

    context.show = context.show === undefined ? true : context.show;

    return (
        <>
            <Dialog open={open} onClose={handleClose}>
                <Box className={styles.mainContainer}>
                    <DialogTitle>{context?.title}</DialogTitle>
                    <DialogContent>
                        {typeof context?.content === 'string' ? (
                            <DialogContentText>{context?.content}</DialogContentText>
                        ) : (
                            <div>
                                <Typography variant="body1" component="span">
                                    {context?.content}
                                </Typography>
                            </div>
                        )}
                        {context?.component}
                    </DialogContent>
                    {context.show === true && (
                        <DialogActions>
                            <Button
                                size='small'
                                data-edataid={interactIds.alert_dialog_cancel}
                                onClick={(e) => handleClose()}
                            >
                                Cancel
                            </Button>
                            <Button
                                size='small'
                                data-edataid={interactIds.alert_dialog_agree}
                                variant="contained"
                                onClick={handleAction}
                                autoFocus
                            >
                                Agree
                            </Button>
                        </DialogActions>
                    )}
                </Box>
            </Dialog>
        </>
    );
};

export default AlertDialog;
