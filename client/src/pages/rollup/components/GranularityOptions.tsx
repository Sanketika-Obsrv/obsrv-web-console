import { useEffect, useState } from 'react'
import * as _ from "lodash"
import { Grid, Checkbox, Alert, Chip, Typography } from '@mui/material';
import CustomGranularity from './CustomGranularity';
import { useLocation } from 'react-router';
import { Box } from '@mui/system';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import { granularityOptions } from "../utils/commonUtils"

const GranularityOptions = ({ selectedOptions, setSelectedOptions, setSelectedGranularityOptions, customGranularity, setCustomGranularity }: any) => {
    const [open, setOpen] = useState<boolean>(false);
    const location = useLocation();
    const existingGranularity = location.state?.rollupGranularityOption;
    const [disableGranularity, setDisableGranularity] = useState(false);
    const [disabledCustomGranularity, setDisableCustomGranularity] = useState(false)

    const handleCheckboxChange = (value: string) => {
        if (selectedOptions.includes(value)) {
            setSelectedOptions(_.filter(selectedOptions, (option: any) => option !== value));
        } else {
            setSelectedOptions([...selectedOptions, value]);
        }
        const newSelected = _.includes(selectedOptions, value)
            ? _.filter(selectedOptions, (item) => item !== value)
            : [...selectedOptions, value];
        setSelectedOptions(newSelected);
    };

    const handleClose = () => {
        setOpen(false);
    };

    useEffect(() => {
        const customOptions = customGranularity.map((option: Record<string, string>) => option.value);
        setSelectedGranularityOptions([...selectedOptions, ...customOptions])
    }, [selectedOptions, customGranularity])

    useEffect(() => {
        const allOptionsIncluded = _.every((granularityOptions), option =>
            _.includes(existingGranularity, option)
        );
        if (allOptionsIncluded) {
            setDisableGranularity(true);
        } else {
            setDisableGranularity(false);
        }
    }, [disableGranularity && disabledCustomGranularity]);

    const customGranuralities = (customGranularity: Record<string, any>[]) => {
        if (!_.isEmpty(customGranularity)) return (
            <Box>
                <Typography variant="h5">Custom granularity selected : </Typography>
                {
                    customGranularity?.map((granularity: any, index: number) => {
                        return (
                            <Chip key={index} sx={{ mt: 1, mr: 1 }} label={granularity?.label}
                                onDelete={() => {
                                    const filtered = _.filter(customGranularity, (item) => item.value !== granularity?.value)
                                    setCustomGranularity(filtered);
                                }}
                                deleteIcon={<CancelRoundedIcon color="primary" />}
                            />
                        )
                    })
                }
            </Box>
        )
    }

    return (<>
        <Grid container position="relative">
            {disableGranularity && disabledCustomGranularity ? null : <Box>
                <Grid item style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                    {granularityOptions.map((option: any) => {
                        if (option.checkbox === true) {
                            return <Grid style={{ display: 'flex', alignItems: 'center' }} key={option.value}>
                                <Checkbox
                                    checked={location.state?.edit ? true : selectedOptions.includes(option.value) || existingGranularity.includes(option.value)}
                                    onChange={() => handleCheckboxChange(option.value)}
                                    disabled={location.state?.edit ? true : existingGranularity.includes(option.value)}
                                />
                                {_.capitalize(option.label)}
                            </Grid>
                        }
                    })}
                </Grid>
                <Grid sx={{ mt: 3, ml: 1 }}>
                    {customGranuralities(customGranularity)}
                </Grid>
            </Box>}
            <CustomGranularity setDisableCustomGranularity={setDisableCustomGranularity} handleClose={handleClose} customGranularity={customGranularity} setCustomGranularity={setCustomGranularity} open={open} setOpen={setOpen} />
        </Grid>
    </>)
}

export default GranularityOptions;
