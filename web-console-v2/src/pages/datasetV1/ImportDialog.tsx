/*eslint-disable*/
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, Grid, TextField, Typography } from "@mui/material";
import MUIForm from "components/form";
import HtmlTooltip from "components/HtmlTooltip";
import _ from "lodash";
import { useEffect, useState } from "react";
import { datasetRead } from "services/datasetV1";
import { DatasetStatus } from "types/datasets";

const onSubmission = (value: any) => { };

const ImportDailog = (props: any) => {
    const { setOpenDailog, setCheckValidation, datasetId, datasetName, setDatasetId, setDatasetName, onSubmit, isLiveExists, openAlertDialog, closeDialog } = props
    const [value, subscribe] = useState<any>({})
    const [nameError, setNameError] = useState('');
    const [validImport, setValid] = useState(true)
    const [name, setName] = useState<any>("")
    const [datasetExists, setDatasetExists] = useState<boolean>(true);
    const [localDatasetId, setLocalDatasetId] = useState(datasetId);
    const [localDatasetName, setLocalDatasetName] = useState(datasetName);

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
        await onSubmit({ datasetName: localDatasetName, datasetId: localDatasetId, importType })
        setOpenDailog(false)
    }

    const onClose = () => {
        setLocalDatasetName("")
        setLocalDatasetId("")
        setCheckValidation(true)
        setOpenDailog(false);
    }

    useEffect(() => {
        const { importType } = value
        if (importType === "new") {
            setCheckValidation(true)
        }
    }, [value])

    const nameRegex = /^[^!@#$%^&*()+{}[\]:;<>,?~\\|]*$/;
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalDatasetName(newValue);
        setName(newValue)
        if (nameRegex.test(newValue)) {
            const generatedId = newValue.toLowerCase().replace(/\s+/g, '-');
            setLocalDatasetId(generatedId)
            setNameError('');
        } else {
            setNameError('The field should exclude any special characters, permitting only alphabets, numbers, ".", "-", and "_".');
        }
    };

    const fetchDataset = async () => {
        return datasetRead({ datasetId: `${localDatasetId}?mode=edit` }).then((response: any) => {
            return response?.data?.result
        }).catch((err: any) => { console.log(err) })
    }

    const checkDatasetExists = async () => {
        const isDatasetExists = await fetchDataset();
        if (isDatasetExists) {
            setDatasetExists(true);
        }
        else {
            setDatasetExists(false);
        }
    };

    useEffect(() => {
        checkDatasetExists()
        const { importType } = value
        const isValid = datasetExists || !_.isEmpty(nameError) || (localDatasetName.length < 4 || localDatasetName.length > 100)
        importType === "overwrite" ? setValid(false) : setValid(isValid)
    }, [localDatasetName, value?.importType, nameError,datasetExists])

    return <Dialog fullWidth={true} open={openAlertDialog} onClose={closeDialog}>
        <Box sx={{ p: 1, py: 1.5 }}>
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
                                        onChange={handleNameChange}
                                        required
                                        value={localDatasetName}
                                        variant="outlined"
                                        fullWidth
                                        error={Boolean(nameError) || datasetExists}
                                        helperText={
                                            nameError ||
                                            (localDatasetName.length > 0 && (localDatasetName.length < 4 || localDatasetName.length > 100)
                                                ? 'Dataset name should be between 4 and 100 characters'
                                                : '') ||
                                            (datasetExists ? 'Dataset already exists' : '')
                                        }
                                    />
                                </HtmlTooltip>
                            </Grid>
                            <Grid item xs={12} sm={6} lg={6}>
                                <HtmlTooltip title="ID for the dataset - for querying" arrow placement="top-start">
                                    <TextField
                                        name={'dataset_id'}
                                        label={'Dataset ID'}
                                        onChange={(e) => setLocalDatasetId(e.target.value)}
                                        required
                                        value={localDatasetId}
                                        variant="outlined"
                                        fullWidth
                                        disabled
                                    />
                                </HtmlTooltip>
                            </Grid>
                        </Grid>
                    }
                    <Grid item xs={12} margin={1}>
                        <Grid container>
                            <Grid item marginRight={2}>
                                <Button variant="contained" onClick={selectImportOption} disabled={validImport}>
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
    </Dialog>
}

export default ImportDailog;