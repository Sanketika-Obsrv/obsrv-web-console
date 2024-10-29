import React from 'react';
import { Box, Button, Grid, Link, Alert, Tooltip, Typography, AlertTitle } from "@mui/material";
import TransformSpecEditor from "./TransformSpecEditor";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import AccordionSection from "components/Accordian/AccordionSection";
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FilteredRollUpschema from "../schema/FilteredRollupSchema.json";
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import Ajv from "ajv";
import _ from "lodash";
import { useAlert } from "contexts/AlertContextProvider";
import Loader from "components/Loader";


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
}, null, 2)

const FilteredRollUps = (props: Record<string, any>) => {
    const { filteredRollup, setFilteredRollup, setIsValidFilter, flattenedData, setSkipFilters, filterRollupErrors, setFilterRollupErrors, skipFilters } = props;
    const location = useLocation()
    const isEdit: boolean = location?.state?.edit || false
    const [expandExplore, setExpandExplore] = useState(false)
    const [dataCopyStatus, setDataCopyStatus] = useState("Copy")
    const [addFilter, setAddFilter] = useState(false)
    const [loading, setLoading] = useState(false)
    const { showAlert } = useAlert();

    const onDataPaste = (data: Record<string, any>) => {
        setFilteredRollup(data)
    }

    useEffect(() => {
        setAddFilter(false)
        setFilterRollupErrors(undefined)
        handleValidate()
    }, [filteredRollup])

    useEffect(() => {
        if (isEdit) {
            _.isEmpty(flattenedData) ? setLoading(true) : setLoading(false)
        }
    }, [flattenedData])

    const filteredRollupForm = () => {
        if (loading || skipFilters) return <Loader loading={loading} />
        return <>
            <TransformSpecEditor initialData={filteredRollup} setInitialData={setFilteredRollup} onChange={onDataPaste} reset={skipFilters} setReset={setSkipFilters} />
            {renderExploreFilterRollup()}
        </>
    }

    const renderSampleData = () => {
        const handleCopy = () => {
            navigator.clipboard.writeText(sampleFilterQuery)
            setDataCopyStatus("Copied")
        }

        if (dataCopyStatus == "Copied") setTimeout(() => { setExpandExplore(false) }, 2000)

        return <Box mt={1} sx={{ bgcolor: "secondary.200", border: "1px solid #e2e2e2" }}>
            <Grid container justifyContent={"space-between"}>
                <Grid item ml={1}>
                    <Typography variant="caption" fontSize={14}>
                        <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{sampleFilterQuery}</pre>
                    </Typography>
                </Grid>
                <Grid item m={3}>
                    <Tooltip title={dataCopyStatus}>
                        <Button color='secondary' size='medium' endIcon={dataCopyStatus == "Copy" ? <ContentCopyIcon /> : <CheckIcon />} onClick={() => handleCopy()} variant="outlined">
                            {dataCopyStatus}
                        </Button>
                    </Tooltip>
                </Grid>
            </Grid>
        </Box>
    }

    const handleValidate = async () => {
        try {
            setExpandExplore(false);
            setFilterRollupErrors(undefined);
            setAddFilter(true);
            if (_.isEmpty(filteredRollup)) {
                setAddFilter(false)
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
            setExpandExplore(!expandExplore)
            setDataCopyStatus("Copy")
        }

        const skipRollupFilters = () => {
            setIsValidFilter(true)
            setSkipFilters(true)
            setFilterRollupErrors(undefined)
            setAddFilter(false)
            showAlert("Filters are skipped", 'success');
            setTimeout(() => { setSkipFilters(false) }, 500)
        }

        const filterRollUpActions = () => {
            return <Grid item>
                <Grid container spacing={2.5} alignItems={"center"}>
                    <Grid item>
                        <Button
                            onClick={_ => handleExpand()}
                            variant="text"
                            sx={{ fontSize: '1.25rem', p: 1 }}
                            startIcon={expandExplore ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        >
                            <Typography variant="body2">
                                View Sample Filter Spec
                            </Typography>
                        </Button>
                    </Grid>
                    <Grid item>
                        <Link href="https://druid.apache.org/docs/25.0.0/querying/filters.html" target="_blank">
                            <Grid container alignItems={"center"} spacing={1} direction={"row"}>
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
        }

        return <>
            <Grid container alignItems={"center"} mt={2} justifyContent={"space-between"}>
                {filterRollUpActions()}
                <Grid item>
                    <Grid container alignItems={"center"} spacing={1}>
                        <Grid item>
                            <Button
                                onClick={skipRollupFilters}
                                variant="outlined"
                                sx={{ fontSize: '1.25rem', p: 1 }}>
                                <Typography variant="body2">
                                Skip Filters
                                </Typography>
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button
                                onClick={_ => handleValidate()}
                                variant="contained"
                                color={addFilter ? filterRollupErrors ? "error" : "success" : "primary"}
                                sx={{ fontSize: '1.25rem', p: 1 }}
                                endIcon={addFilter ? filterRollupErrors ? <CloseOutlined /> : <CheckOutlined /> : null}
                            >
                                <Typography variant="body2">
                                    {addFilter ? filterRollupErrors ? "Invalid filter" : "Valid Filter" : "Validate Filter"}
                                </Typography>
                            </Button>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
            {!_.isEmpty(filterRollupErrors) &&
                <Alert severity='error' sx={{ lineHeight: 0, display: "flex", mt: 1 }}>
                    <AlertTitle><Typography variant="body1" fontWeight={500}>Invalid filter</Typography></AlertTitle>
                    <Typography variant="caption">{filterRollupErrors}</Typography>
                </Alert>
            }
            {expandExplore && renderSampleData()}
        </>
    }

    const sections = [
        {
            id: 'filteredRollups',
            title: <Typography variant="h6" fontWeight={500} mt={0.5}>Add Filters</Typography>,
            component: loading ?  
                        <></>
                        // Skeleton
                        : filteredRollupForm(),
            description: <Typography variant="body2" fontWeight={500}>Set up filters to selectively process input data during ingestion. Only the data that meets the specified conditions will be ingested</Typography>,
            noGrid: true,
        },
    ];

    return <AccordionSection sections={sections} />
}

export default FilteredRollUps;