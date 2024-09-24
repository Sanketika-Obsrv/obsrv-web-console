import { Alert, Box, Button, DialogContent, DialogTitle, Grid, TextField, Typography } from "@mui/material";
import MUIForm from "components/form";
import HtmlTooltip from "components/HtmlTooltip";
import _ from "lodash";
import { useEffect, useState } from "react";

const onSubmission = (value: any) => { };

const ImportDailog = (props: any) => {
    const { setFiles, setOpenDailog, setCheckValidation, form, handleNameChange, onSubmit } = props
    const [value, subscribe] = useState<any>({})
    const options = [{ label: 'Import as new dataset', component: '', value: 'new' }, { label: 'Overwrite the Dataset', component: '', value: 'overwrite' }];

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
        const { initialValues, values } = form
        const formValues = importType === "new" ? values : initialValues
        await onSubmit({ ...formValues, importType })
        setOpenDailog(false)
    }

    const onClose = () => {
        const { initialValues } = form
        form.setFieldValue("name", _.get(initialValues, ""))
        form.setFieldValue("dataset_id", _.get(initialValues, ""))
        setCheckValidation(true)
        setOpenDailog(false);
        setFiles([])
    }

    useEffect(() => {
        const { importType } = value
        if (importType === "new") {
            form.setFieldValue("name", "")
            form.setFieldValue("dataset_id", "")
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
                                    onBlur={form.handleBlur}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        handleNameChange(e, form.setFieldValue, 'dataset_id', 'name')
                                    }
                                    required
                                    value={_.get(form.values, "name") || ''}
                                    variant="outlined"
                                    fullWidth
                                    error={Boolean(form.errors["name"])}
                                    helperText={form.touched["name"] && form.errors["name"] && String(form.errors["name"])}
                                />
                            </HtmlTooltip>
                        </Grid>
                        <Grid item xs={12} sm={6} lg={6}>
                            <HtmlTooltip title="ID for the dataset - for querying" arrow placement="top-start">
                                <TextField
                                    name={'dataset_id'}
                                    label={'Dataset ID'}
                                    onBlur={form.handleBlur}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.handleChange(e)}
                                    required
                                    value={_.get(form.values, "dataset_id") || ''}
                                    variant="outlined"
                                    fullWidth
                                    error={Boolean(form.errors["dataset_id"])}
                                    helperText={form.touched["dataset_id"] && form.errors["dataset_id"] && String(form.errors["dataset_id"])}
                                />
                            </HtmlTooltip>
                        </Grid>
                    </Grid>
                }
                <Grid item xs={12} margin={1}>
                    <Grid container>
                        <Grid item marginRight={2}>
                            <Button variant="contained" onClick={selectImportOption} disabled={_.isEmpty(value) || _.get(value, "importType") === "new" ? Boolean(form.errors["dataset_id"] || form.errors["dataset_id"]) : false}>
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