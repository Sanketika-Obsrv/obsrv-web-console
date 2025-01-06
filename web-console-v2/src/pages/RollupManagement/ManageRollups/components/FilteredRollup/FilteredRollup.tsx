import React from 'react';
import { Box, Button, Grid, Link, Alert, Tooltip, Typography, AlertTitle } from "@mui/material";
import { useState, useEffect } from "react";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FilteredRollUpschema from "pages/Rollup/schema/FilteredRollupSchema.json";
import Ajv from "ajv";
import _ from "lodash";
import { useAlert } from "contexts/AlertContextProvider";
import Loader from "components/Loader";
import TransformSpecEditor from './FilteredRollupSpecEditor';
import styles from "./FilteredRollup.module.css";

const sampleFilterQuery = JSON.stringify({
    "filter": {
        "type": "and",
        "fields": [
            {
                "type": "selector",
                "dimension": "eid",
                "value": "AUDIT"
            },
            {
                "type": "in",
                "dimension": "context_env",
                "values": ["dev", "qa"]
            }
        ]
    }
}, null, 2);

interface FilteredRollUpsProps {
    filteredRollup: Record<string, any>;
    setFilteredRollup: (data: Record<string, any>) => void;
    setIsValidFilter: (isValid: boolean) => void;
    flattenedData: any[];
    setSkipFilters: (skip: boolean) => void;
    filterRollupErrors?: string;
    setFilterRollupErrors: (error?: string) => void;
    skipFilters: boolean;
    setActiveStep?: (step: number) => void;
}

export const FilteredRollup: React.FC<FilteredRollUpsProps> = ({
    filteredRollup,
    setFilteredRollup,
    setIsValidFilter,
    flattenedData,
    setSkipFilters,
    filterRollupErrors,
    setFilterRollupErrors,
    skipFilters,
    setActiveStep
}) => {
    const [expandExplore, setExpandExplore] = useState(false);
    const [dataCopyStatus, setDataCopyStatus] = useState("Copy");
    const [addFilter, setAddFilter] = useState(false);
    const [loading, setLoading] = useState(false);
    const { showAlert } = useAlert();

    const onDataPaste = (data: Record<string, any>) => {
        setFilteredRollup(data);
    };

    // Effect to handle initial filter data
    useEffect(() => {
        if (filteredRollup && 'filter' in filteredRollup && !_.isEmpty(filteredRollup.filter)) {
            setAddFilter(true);
            setIsValidFilter(true);
        } else {
            setAddFilter(false);
            setFilterRollupErrors(undefined);
        }
        handleValidate();
    }, [filteredRollup]);

    const filteredRollupForm = () => {
        if (loading || skipFilters) return <Loader loading={loading} />;
        return (
            <>
                <TransformSpecEditor
                    initialData={filteredRollup}
                    setInitialData={setFilteredRollup}
                    onChange={onDataPaste}
                    reset={skipFilters}
                    setReset={setSkipFilters}
                />
                {renderExploreFilterRollup()}
            </>
        );
    };

    const renderSampleData = () => {
        const handleCopy = () => {
            navigator.clipboard.writeText(sampleFilterQuery);
            setDataCopyStatus("Copied");
        };

        if (dataCopyStatus === "Copied") setTimeout(() => { setExpandExplore(false); }, 2000);

        return (
            <Box className={styles.sampleFilter}>
                <Grid container justifyContent="space-between">
                    <Grid item className={styles.sampleFilterQueryFontContainer}>
                        <Typography variant="h6" className={styles.sampleFilterQueryFontContainer}>
                            <pre className={styles.sampleQuery}>{sampleFilterQuery}</pre>
                        </Typography>
                    </Grid>
                    <Grid item className={styles.copyButton}>
                        <Tooltip title={dataCopyStatus}>
                            <Button
                                color='secondary'
                                size='small'
                                endIcon={dataCopyStatus === "Copy" ? <ContentCopyIcon /> : <CheckIcon />}
                                onClick={handleCopy}
                                variant="outlined"
                            >
                                {dataCopyStatus}
                            </Button>
                        </Tooltip>
                    </Grid>
                </Grid>
            </Box>
        );
    };

    const handleValidate = async () => {
        try {
            setExpandExplore(false);
            setFilterRollupErrors(undefined);
            setAddFilter(true);
            
            if (_.isEmpty(filteredRollup)) {
                setAddFilter(false);
                return;
            }

            const ajv = new Ajv();
            const validated = await ajv.validate(FilteredRollUpschema, filteredRollup);
            setIsValidFilter(validated);

            if (!validated) {
                const error = ajv.errors;
                const errorMessage: string = _.get(error, [0, "instancePath"])?.replace(/\//g, ' ') + " " + _.get(error, [0, "message"]);
                setFilterRollupErrors(errorMessage);
                throw new Error("Invalid filters" + errorMessage);
            }
            showAlert("The provided filters are valid", 'success');
        } catch (error: any) {
            console.error("Validation error:", error.message);
        }
    };

    const renderExploreFilterRollup = () => {
        const handleExpand = () => {
            setExpandExplore(!expandExplore);
            setDataCopyStatus("Copy");
        };

        return (
            <>
                <Grid container className={styles.container}>
                    <Grid item>
                        <Grid container spacing={2.5} alignItems="center">
                            <Grid item>
                                <Button
                                    onClick={handleExpand}
                                    variant="text"
                                    className={styles.buttonSample}
                                    startIcon={expandExplore ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                >
                                    <Typography variant="body2">
                                        View Sample Filter Spec
                                    </Typography>
                                </Button>
                            </Grid>
                            <Grid item>
                                <Link href="https://druid.apache.org/docs/25.0.0/querying/filters.html" target="_blank">
                                    <Grid container alignItems="center" spacing={1} direction="row">
                                        <Grid item mt={0.5}>
                                            <TravelExploreIcon fontSize="small" color="primary" />
                                        </Grid>
                                        <Grid item>
                                            <Typography variant="body2">Explore More...</Typography>
                                        </Grid>
                                    </Grid>
                                </Link>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item>
                        <Grid container alignItems="center" spacing={1}>
                            <Grid item>
                                <Button
                                    size="small"
                                    color={addFilter ? filterRollupErrors ? "error" : "success" : "primary"}
                                    sx={{
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        '&:hover': {
                                            backgroundColor: 'primary.main',
                                            color: 'white',
                                            borderColor: 'primary.main',
                                        },
                                    }}
                                    variant="outlined"
                                    onClick={handleValidate}
                                >
                                    {addFilter ? filterRollupErrors ? "Invalid filter" : "Valid Filter" : "Validate Filter"}
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
                {!_.isEmpty(filterRollupErrors) && (
                    <Alert severity='error' className={styles.filterInvalid}>
                        <AlertTitle><Typography variant="body1" fontWeight={500}>Invalid filter</Typography></AlertTitle>
                        <Typography variant="body1">{filterRollupErrors}</Typography>
                    </Alert>
                )}
                {expandExplore && renderSampleData()}
            </>
        );
    };

    return filteredRollupForm();
};

export default FilteredRollup;
