import React, { useMemo } from "react";
import { Box, Checkbox, FormControlLabel, FormGroup, Grid, Typography, LinearProgress } from "@mui/material";
import { theme } from "theme";
import styles from "./RollupsList.module.css";

interface TableStatusCheckboxesProps {
    metrics: any[];
    dimensions: any[];
}

const TableStatusCheckboxes: React.FC<TableStatusCheckboxesProps> = ({ metrics, dimensions }) => {
    const LinearProgressWithLabel = useMemo(() => {
        const Component: React.FC<{ value: number }> = ({ value }) => (
            <Box className={styles.progressRoot}>
                <Box className={styles.progressBar}>
                    <LinearProgress
                        variant="determinate"
                        value={value}
                        sx={{
                            backgroundColor: theme.palette.grey[200],
                            '& .MuiLinearProgress-bar': {
                                backgroundColor: theme.palette.secondary.main,
                            },
                        }}
                    />
                </Box>
                <Box>
                    <Typography
                        variant="h2"
                        sx={{
                            color: value > 50 ? theme.palette.secondary.main : theme.palette.common.black,
                        }}
                    >{`${Math.round(value)}%`}</Typography>
                </Box>
            </Box>
        );

        Component.displayName = "LinearProgressWithLabel";
        return Component;
    }, []);

    const fields = [
        { 
            label: 'Metrics', 
            filled: Array.isArray(metrics) && metrics.length > 0
        },
        { 
            label: 'Dimensions', 
            filled: Array.isArray(dimensions) && dimensions.length > 0
        }
    ];

    // Calculate combined progress (50% for metrics, 50% for dimensions)
    const progress = (
        (Array.isArray(metrics) && metrics.length > 0 ? 50 : 0) +
        (Array.isArray(dimensions) && dimensions.length > 0 ? 50 : 0)
    );

    return (
        <FormGroup row>
            <Grid container spacing={2} sx={{ display: 'flex', alignItems: 'center' }}>
                <Grid item>
                    <Box className={styles.fieldContainer}>
                        {fields.map((field, index) => (
                            <FormControlLabel
                                key={index}
                                control={
                                    field.filled ? (
                                        <Checkbox
                                            size="large"
                                            checked={field.filled}
                                            disabled
                                            sx={{
                                                color: theme.palette.secondary.main,
                                                '&.Mui-checked': {
                                                    color: theme.palette.secondary.main,
                                                },
                                                '& .MuiSvgIcon-root': { fontSize: 16 }
                                            }}
                                        />
                                    ) : (
                                        <Box className={styles.unchecked} />
                                    )
                                }
                                label={
                                    <Typography variant="caption" color="textSecondary">
                                        {field.label}
                                    </Typography>
                                }
                            />
                        ))}
                        <LinearProgressWithLabel value={progress} />
                    </Box>
                </Grid>
            </Grid>
        </FormGroup>
    );
};

export default TableStatusCheckboxes;
