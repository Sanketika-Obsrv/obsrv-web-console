/*eslint-disable*/
import { Alert, Box, Button, DialogContent, DialogTitle, Grid, TextField, Typography } from "@mui/material";
import MUIForm from "components/form";
import HtmlTooltip from "components/HtmlTooltip";
import _ from "lodash";
import { useEffect, useState } from "react";

const onSubmission = (value: any) => { };

const ImportDailog = (props: any) => {
    const { setOpenDailog, setCheckValidation, datasetId, datasetName, setDatasetId, setDatasetName, onSubmit, isLiveExists } = props
    const [value, subscribe] = useState<any>({})
    const options = [
        { label: 'Import as new dataset', component: '', value: 'new' },
        ...(!isLiveExists ? [{ label: 'Overwrite the Dataset', component: '', value: 'overwrite' }] : [])
    ];


    const fields = [
        {
            name: "importType",
            label: "Select import options",
            type: 'radio',
            required: true,
            selectOptions: options,
        }
    ]

    const selectImportOption = async () => {
        const { importType } = value
       
        await onSubmit({ datasetName, datasetId, importType })
        setOpenDailog(false)
    }

    const onClose = () => {
        setDatasetName( "")
        setDatasetId("")
        setCheckValidation(true)
        setOpenDailog(false);
    }

    useEffect(() => {
        const { importType } = value
        if (importType === "new") {
            setDatasetName("")
            setDatasetId("")
            setCheckValidation(true)
        }
    }, [value])

    return <Box sx={{ p: 1, py: 1.5 }}>
        <DialogTitle>
            <Alert severity="error" sx={{ lineHeight: 0, display: "flex", justifyContent: "flex-start", mt: 1 }}>
                <Typography variant="caption" fontSize={14}>
                    Dataset Already Exists. Please select the option given below.
                </Typography>
            </Alert>
        </DialogTitle>
        <DialogContent>
            <Grid container>
                <Grid item xs={12} margin={1}>
                    <MUIForm
                        initialValues={{}}
                        subscribe={subscribe}
                        onSubmit={(value: any) => onSubmission(value)}
                        fields={fields}
                        size={{ xs: 12 }}
                    />
                </Grid>
                {_.get(value, "importType") === "new" &&
                    <Grid container spacing={3} justifyContent="center" alignItems="baseline" display="flex">
                        <Grid item xs={12} sm={6} lg={6}>
                            <HtmlTooltip title="Name of the dataset" arrow placement="top-start">
                                <TextField
                                    name={'name'}
                                    label={'Dataset Name'}
                                    onChange={(e) => setDatasetName(e.target.value)}
                                    required
                                    value={datasetName}
                                    variant="outlined"
                                    fullWidth
                                />
                            </HtmlTooltip>
                        </Grid>
                        <Grid item xs={12} sm={6} lg={6}>
                            <HtmlTooltip title="ID for the dataset - for querying" arrow placement="top-start">
                                <TextField
                                    name={'dataset_id'}
                                    label={'Dataset ID'}
                                    onChange={(e) => setDatasetId(e.target.value)}
                                    required
                                    value={datasetId}
                                    variant="outlined"
                                    fullWidth
                                />
                            </HtmlTooltip>
                        </Grid>
                    </Grid>
                }
                <Grid item xs={12} margin={1}>
                    <Grid container>
                        <Grid item marginRight={2}>
                            <Button variant="contained" onClick={selectImportOption} disabled={_.isEmpty(value) }>
                                Import
                            </Button>
                        </Grid>
                        <Grid item >
                            <Button variant="contained" color="error" onClick={onClose}>
                                Cancel
                            </Button>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </DialogContent>
    </Box>
}

export default ImportDailog;