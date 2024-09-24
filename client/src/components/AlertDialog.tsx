import { Button, Dialog, DialogContentText } from '@mui/material';
import { Box, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import interactIds from 'data/telemetry/interact.json';

const AlertDialog = ({ handleClose, action = null, open = false, context = {} }: any) => {
    const handleAction = () => {
        if (action) action();
        handleClose(true);
    };

    context.show = context.show === undefined ? true : context.show;

    return (
        <>
            <Dialog open={open} onClose={handleClose}>
                <Box sx={{ p: 1, py: 1.5 }}>
                    <DialogTitle>{context?.title}</DialogTitle>
                    <DialogContent>
                        <DialogContentText>{context?.content}</DialogContentText>
                        {context?.component}
                    </DialogContent>
                    {context.show === true && (
                        <DialogActions>
                            <Button data-edataid={interactIds.alert_dialog_cancel} color="error" onClick={(e) => handleClose()}>
                                Cancel
                            </Button>
                            <Button data-edataid={interactIds.alert_dialog_agree} variant="contained" onClick={handleAction} autoFocus>
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
