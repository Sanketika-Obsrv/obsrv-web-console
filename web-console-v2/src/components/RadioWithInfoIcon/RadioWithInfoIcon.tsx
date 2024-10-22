import { RJSFSchema, UiSchema } from '@rjsf/utils';
import React from 'react';
import { FormControlLabel, Tooltip, IconButton, Stack, Radio } from '@mui/material';
import { ReactComponent as InfoCircle } from 'assets/upload/Info.svg';
import styles from './RadioWithInfoIcon.module.css';

interface Option {
    value: string;
    label: string;
}

interface RadioWithInfoIconProps {
    options: {
        enumOptions: Option[];
    };
    value: string;
    onChange: (value: string) => void;
    uiSchema: UiSchema;
    schema: RJSFSchema;
}

const RadioWithInfoIcon: React.FC<RadioWithInfoIconProps> = ({
    options,
    value,
    onChange,
    uiSchema,
    schema
}) => {
    const { title } = schema;
    const { 'ui:help': help } = uiSchema || {};

    const helpTexts = (help || '').split(',');

    const handleCheckboxChange = (optionValue: string) => {
        if (value === optionValue) {
            onChange('');
        } else {
            onChange(optionValue);
        }
    };

    return (
        <Stack direction="row" spacing={2} alignItems="center">
            {options.enumOptions.map((option, index) => {
                const tooltipText = helpTexts[index]?.trim();
                return (
                    <FormControlLabel
                        key={index}
                        control={
                            <Radio
                                checked={value === option.value}
                                onChange={() => handleCheckboxChange(option.value)}
                                color="primary"
                            />
                        }
                        label={
                            <Stack direction="row" spacing={1} alignItems="center">
                                <span>{option.label}</span>
                                {tooltipText && (
                                    <Tooltip
                                        title={tooltipText}
                                        arrow
                                        classes={{
                                            tooltip: styles.customTooltip,
                                            arrow: styles.customArrow
                                        }}
                                    >
                                        <IconButton
                                            aria-label={`info for ${title}`}
                                            color="primary"
                                        >
                                            <InfoCircle className={styles.iconStyle} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Stack>
                        }
                    />
                );
            })}
        </Stack>
    );
};

export default RadioWithInfoIcon;
