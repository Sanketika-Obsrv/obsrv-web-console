import React, { SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { Checkbox, FormControl, FormControlLabel, FormGroup, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import DedupeEvents from 'components/Form/DynamicForm';
import schema from './Schema';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import _ from 'lodash';

interface FormData {
    [key: string]: unknown;
}

interface Schema {
    title: string;
    schema: RJSFSchema;
    uiSchema: UiSchema;
}

interface ConfigureConnectorFormProps {
    schema: Schema;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onChange: (formData: FormData, errors?: unknown[] | null) => void;
}

const DedupeEvent = (props: any) => {
    const { data, handleAddOrEdit, transformationOptions, isSuccess, isProceed } = props;
    const dropDuplicates = _.get(data, ['drop_duplicates']);
    const dedupKey = _.get(data, ['dedup_key']);
    const existingData = {
        section1: {
            dropDuplicates: dropDuplicates ? ['Enable Deduplication'] : [],
            dedupeKey: dropDuplicates ? dedupKey : ''
        }
    };

    const [formData, setFormData] = useState<{ [key: string]: unknown }>(existingData);

    const transformationOption = useMemo(() => {
        if (!_.isEmpty(transformationOptions))
            _.set(
                schema,
                ['schema', 'properties', 'section1', 'properties', 'dedupeKey', 'enum'],
                transformationOptions
            );
    }, [transformationOptions]);


    useEffect(() => {
        const formDropDuplicates = _.get(formData, ['section1', 'dropDuplicates']);
        const formDedupKey = _.get(formData, ['section1', 'dedupeKey']);
        if (formDropDuplicates !== dropDuplicates && formDedupKey !== dedupKey) {
            setFormData(existingData);
        }
        if (dropDuplicates && dedupKey !== '' && _.includes(transformationOptions, dedupKey)) {
            isProceed(true);
        }
    }, [isSuccess]);

    const handleChange: ConfigureConnectorFormProps['onChange'] = (formInfo) => {
        isProceed(false);
        setFormData(formInfo);
        const value: any = _.get(formInfo, ['section1']);
        const dedupeKey = _.get(formInfo, ['section1']);
        const dropDuplicates = _.get(value, 'dropDuplicates');
        if (!_.isUndefined(dropDuplicates)) {
            const isDropDuplicates = dropDuplicates.includes('Enable Deduplication');
            const dedupKey = isDropDuplicates ? _.get(dedupeKey, 'dedupeKey', '') : '';
            const dedupeEvent = {
                drop_duplicates: isDropDuplicates,
                dedup_key: dedupKey
            };

            if (!isDropDuplicates) {
                const updatedData = {
                    section1: {
                        dropDuplicates: '',
                        dedupeKey: ''
                    }
                };

                setFormData(updatedData);
            }

            const shouldAddOrEdit =
                (isDropDuplicates && dedupKey !== '') || (!isDropDuplicates && dedupKey === '');

            if (shouldAddOrEdit) {
                handleAddOrEdit(dedupeEvent);
                isProceed(true);
            }
        }
    };

    const [isChecked, setIsChecked] = useState(false);
    const [dedupValue, setDedupValue] = useState("");
    const handleCheckBox = (event: any) => {
        setIsChecked(event.target.checked);
        console.log('Checkbox is checked:', event.target.checked);
        if(!event.target.checked){
            setDedupValue(""); 
            const dedupeEvent = {
                drop_duplicates: event.target.checked,
                dedup_key: ""
            };
            handleAddOrEdit(dedupeEvent);
            isProceed(true);
        }
    };
    const handleSelection = (event: any) => {
        setDedupValue(event.target.value)
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
                    value={isChecked ? dedupValue : ""}
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