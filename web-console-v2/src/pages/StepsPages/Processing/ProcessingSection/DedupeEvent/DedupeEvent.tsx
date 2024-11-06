import React, { useEffect, useState } from 'react';
import { Checkbox, FormControl, FormControlLabel, FormGroup, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import _ from 'lodash';

const DedupeEvent = (props: any) => {
    const { data, handleAddOrEdit, transformationOptions, isSuccess, isProceed } = props;
    const [isChecked, setIsChecked] = useState(false);
    const [dedupKey, setDedupKey] = useState("");
    useEffect(() => {
        if(isChecked && !_.isEmpty(dedupKey)){
            isProceed(true);
        }
    }, [isChecked])
    const handleCheckBox = (event: any) => {
        setIsChecked(event.target.checked);
        console.log('Checkbox is checked:', event.target.checked);
        if(!event.target.checked){
            setDedupKey(""); 
            const dedupeEvent = {
                drop_duplicates: event.target.checked,
                dedup_key: ""
            };
            handleAddOrEdit(dedupeEvent);
            isProceed(true);
        }
    };
    const handleSelection = (event: any) => {
        setDedupKey(event.target.value)
        console.log('selection:', event.target.value);
        const dedupeEvent = {
            drop_duplicates: isChecked,
            dedup_key: event.target.value
        };
        handleAddOrEdit(dedupeEvent);
        isProceed(true);
    }

    return (
        <Stack >
            <FormGroup>
                <FormControlLabel control={<Checkbox checked={isChecked} 
                        onChange={handleCheckBox} />} label="Enable Deduplication" />
            </FormGroup>
            <FormControl fullWidth >
                <InputLabel id="dedupKey-select-label">dedupKey</InputLabel>
                <Select
                    labelId="dedupKey-select-label"
                    id="dedupKey-select"
                    label="dedupKey"
                    value={isChecked ? dedupKey : ""}
                    onChange={handleSelection}
                    disabled={!isChecked}
                >
                    {transformationOptions.map((option: string) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Stack>
    );
};

export default DedupeEvent;