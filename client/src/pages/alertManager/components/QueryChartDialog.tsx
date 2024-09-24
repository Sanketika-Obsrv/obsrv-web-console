import { Button, Dialog } from '@mui/material';
import { Box, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import interactIds from 'data/telemetry/interact.json';

const QueryChart = ({ handleClose, open = false, context = {} }: any) => {
    return (
        <>
            <Dialog open={open} onClose={handleClose} fullWidth>
                <Box sx={{ p: 1, py: 1.5 }}>
                    <DialogTitle>{context?.title}</DialogTitle>
                    <DialogContent>{context?.content}</DialogContent>
                    <DialogActions>
                        <Button
                            data-edataid={interactIds.alert_dialog_cancel}
                            color="error"
                            sx={{ marginX: '0.5rem' }}
                            variant="contained"
                            onClick={(e) => handleClose()}
                        >
                            Close
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </>
    );
};

export default QueryChart;
