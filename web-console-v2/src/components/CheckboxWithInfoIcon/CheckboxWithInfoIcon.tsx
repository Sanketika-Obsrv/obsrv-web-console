import React from 'react';
import { Box, FormControlLabel, Checkbox, Tooltip, IconButton, Stack } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { WidgetProps } from '@rjsf/utils';

// Define props for CustomCheckbox
interface CustomCheckboxProps {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
    description?: string; // Optional description
}

// Checkbox with info icon component
const CheckboxWithInfoWidget: React.FC<WidgetProps> = ({
    id,
    value,
    label,
    onChange,
    schema,
    uiSchema
}) => {
    const { title } = schema;
    const { 'ui:help': help } = uiSchema || {};
    return (
        <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
                control={
                    <Checkbox
                        id={id}
                        checked={value || false}
                        onChange={(event) => onChange(event.target.checked)}
                        color="primary"
                    />
                }
                label={label}
                sx={{
                    '& .MuiTypography-root': {
                        color: '#111111',
                        fontSize: '16px'
                    }
                }}
            />
            {help && (
                <Tooltip title={help} arrow>
                    <IconButton
                        aria-label={`info for ${title}`}
                        color="primary"
                        sx={{ width: '20px', height: '20px' }}
                    >
                        <InfoOutlinedIcon />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    );
};

// Custom checkbox component with description
export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
    label,
    value,
    onChange,
    description
}) => {
    return (
        <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
                control={
                    <Checkbox
                        checked={value || false}
                        onChange={(event) => onChange(event.target.checked)}
                        color="primary"
                    />
                }
                label={label}
                sx={{
                    '& .MuiTypography-root': {
                        color: '#111111',
                        fontSize: '16px'
                    }
                }}
            />
            {description && (
                <Tooltip title={description} arrow>
                    <IconButton
                        aria-label={`info for ${description}`}
                        color="primary"
                        sx={{ width: '20px', height: '20px' }}
                    >
                        <InfoOutlinedIcon />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    );
};

// Custom checkbox widget component
export const CustomCheckboxWidget: React.FC<WidgetProps> = ({
    value = [],
    onChange,
    options,
    uiSchema
}) => {
    const enumDescriptions = (uiSchema?.['ui:options']?.enumDescriptions || {}) as {
        [key: string]: string;
    };
    const formattedValue = typeof value === 'string' ? [value] : value;

    const handleChange = (item: string) => {
        const newValue = formattedValue.includes(item)
            ? formattedValue.filter((v: string) => v !== item)
            : [...formattedValue, item];
        onChange(newValue);
    };

    return (
        <Box display="flex" flexDirection="row">
            {options.enumOptions &&
                options.enumOptions.map((option, index) => (
                    <CustomCheckbox
                        key={index}
                        label={option.label as string}
                        value={value.includes(option.value as string)}
                        onChange={() => handleChange(option.value as string)}
                        description={enumDescriptions[option.value as string]}
                    />
                ))}
        </Box>
    );
};

export default CheckboxWithInfoWidget;
