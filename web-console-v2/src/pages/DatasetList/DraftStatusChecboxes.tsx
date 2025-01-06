import React from "react";
import { Box, Checkbox, FormControlLabel, FormGroup, Grid } from "@mui/material";
import { theme } from "theme";
import styles from "./DatasetlistCard.module.css"
import { DatasetlistCardProps } from "./DatasetlistCard";
import { Dataset } from "types/dataset";
import _ from "lodash";

interface DraftStatusCheckboxesProps {
    statusConfig: DatasetlistCardProps['draftDatasetConfigStatus'];
    dataset: Dataset;
}

const DraftStatusCheckboxes: React.FC<DraftStatusCheckboxesProps> = ({ statusConfig, dataset }) => {
    const fields = [
        { label: 'Connectors', filled: statusConfig.isConnectorFilled },
        { label: 'Ingestion', filled: statusConfig.isIngestionFilled },
        { label: 'Processing', filled: statusConfig.isProcessingFilled },
        { label: 'Storage', filled: statusConfig.isStorageFilled },
    ];

    return (
        <FormGroup row className={styles.formGroup}>
            <Box className={styles.checkBoxContainer}>
                {fields.map((field, index) => (
                    <FormControlLabel
                        key={index}
                        control={
                            field.filled ? (
                                <Checkbox
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
                                <Box
                                    className={styles.unchecked}
                                >
                                </Box>
                            )
                        }
                        label={field.label}
                    />
                ))}
            </Box>
        </FormGroup>
    );
};

export default DraftStatusCheckboxes;