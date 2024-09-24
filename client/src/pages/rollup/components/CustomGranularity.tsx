import { Autocomplete, Button, Dialog, Grid, TextField } from '@mui/material';
import { Box, DialogTitle } from '@mui/material';
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { granularityOptions } from '../utils/commonUtils';
import * as _ from "lodash"
import { PlusOutlined } from '@ant-design/icons';
import CloseIcon from '@mui/icons-material/Close';

const CustomGranularity = ({ setDisableCustomGranularity, customGranularity, setCustomGranularity, handleClose, action = null, open = false, setOpen, context = {} }: any) => {
    const location = useLocation();
    const existingGranularity = location.state?.rollupGranularityOption;
    const filteredGranularityOptions = granularityOptions.filter(option => option.checkbox !== true && !existingGranularity.includes(option.value));

    useEffect(() => {
        if (_.isEmpty(filteredGranularityOptions)) {
            setDisableCustomGranularity(true)
        }
        else {
            setDisableCustomGranularity(false)
        }
    }, [])

    return (
        <>
            {
                _.isEmpty(filteredGranularityOptions) ? "" : <>
                    <Button
                        size="medium"
                        startIcon={<PlusOutlined />}
                        sx={{ fontWeight: 500, position: 'absolute', right: 0 }}
                        onClick={() => setOpen(true)}
                    >
                        Custom granularity
                    </Button>
                    <Dialog open={open} onClose={handleClose} fullWidth={true}>
                        <Box sx={{ p: 1, paddingBottom: 3 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 2.5 }}>
                                <DialogTitle sx={{ mb: 1 }}>Add custom granularity</DialogTitle>
                                <Box onClick={handleClose}>
                                    <CloseIcon />
                                </Box>
                            </Box>
                            <Grid item sx={{ px: 3 }}>
                                <Autocomplete
                                    id="rollup-granuralities"
                                    multiple
                                    getOptionLabel={(option) => option.label}
                                    value={customGranularity}
                                    onChange={(event: any, newValue: any) => {
                                        setCustomGranularity(newValue);
                                    }}
                                    disableCloseOnSelect
                                    options={filteredGranularityOptions}
                                    renderInput={(params) => <TextField {...params} label="Add custom granularity" />}
                                />
                            </Grid>
                        </Box>
                    </Dialog>
                </>
            }
        </>
    );
};

export default CustomGranularity;
