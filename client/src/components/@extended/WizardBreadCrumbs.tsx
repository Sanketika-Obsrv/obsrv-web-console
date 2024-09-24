import { Grid, IconButton, Breadcrumbs as MuiBreadcrumbs, TextField, Tooltip, Typography } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addState } from 'store/reducers/wizard';
import { useEffect, useState, useCallback } from 'react';
import { error } from 'services/toaster';
import _ from "lodash";
import { hasSpecialCharacters } from 'services/utils';
import ModeOutlinedIcon from '@mui/icons-material/ModeOutlined';
import en from 'utils/locales/en.json';
import { Box } from '@mui/material';
import { DatasetStatus } from 'types/datasets';

const WizardBreadcrumbs = (props: any) => {
    const { rollup, datasetId } = props;
    const dispatch = useDispatch();
    const [datasetName, setDatasetName] = useState('');
    const [edit, setEdit] = useState(false);
    const [params] = useSearchParams();
    const masterDataset = params.get("master");
    const datasetStatus = params.get("status");
    const datasetConfiguration = useSelector((state: any) => state?.wizard?.pages?.datasetConfiguration?.state);
    const renderLabel = () => {
        if (datasetName) return datasetName;
        else if (masterDataset === "true") return "New Master Dataset";
        else return "New Dataset";
    }

    useEffect(() => {
        setDatasetName(datasetConfiguration?.config?.name);
    }, [datasetConfiguration]);

    const handleClick = () => {
        if (datasetName)
            setEdit((prevState) => !prevState);
    }

    const debouncedUpdateValue = useCallback(_.debounce(setDatasetName || (() => { }), 1500), []);

    const handleEditId = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const hasLeadingSpace = /^\s/.test(e.target.value);
            const hasTrailingSpace = /\s$/.test(e.target.value);
            if (hasLeadingSpace || hasTrailingSpace) throw new Error(en.whiteSpaceConflict)
            if (hasSpecialCharacters(e.target.value)) throw new Error("Dataset name cannot have special characters")
            if (e.target.value && e.target.value.length >= 4) {
                debouncedUpdateValue(e.target.value);
                if (datasetConfiguration) {
                    dispatch(addState({
                        id: 'datasetConfiguration', state: {
                            ...datasetConfiguration,
                            config: {
                                ...datasetConfiguration.config,
                                name: e.target.value.trim(),
                            }
                        }
                    }));
                    handleClick();
                } else throw new Error("Dataset ID not found, updated failed")
            } else {
                throw new Error("Dataset name cannot have less than 4 characters")
            }
        } catch (err: string | any) {
            setEdit(false)
            setDatasetName(_.get(datasetConfiguration, ["config", "name"]))
            dispatch(error({ message: err?.message }));
        }
    }

    const renderWizardBreadCrumbs = () => {
        if (datasetStatus === DatasetStatus.Live) return null;
        return (
            <Box sx={{ display: "flex", alignItems: "center" }}>
                {!rollup ? <MuiBreadcrumbs aria-label="breadcrumb">
                    <Typography component={Link} to="/" color="textSecondary" variant="h6" sx={{ textDecoration: 'none' }}>
                        {'Home'}
                    </Typography>
                    {!edit && <Grid container alignItems="center">
                        <Grid item>
                            <Typography onClick={handleClick} color="text.primary" variant="h5">{renderLabel()}</Typography>
                        </Grid>
                        <Grid item>{datasetName &&
                            <Tooltip title="Edit Dataset name">
                                <IconButton onClick={handleClick}>
                                    <ModeOutlinedIcon fontSize='small' />
                                </IconButton>
                            </Tooltip>}
                        </Grid>
                    </Grid>}
                    {edit &&
                        <TextField
                            name="id"
                            label="Edit dataset name"
                            value={datasetName}
                            autoFocus
                            InputProps={{
                                sx: { "&.MuiInputBase-root": { marginBottom: 2 } }
                            }}
                            onBlur={(e: React.ChangeEvent<HTMLInputElement> | any) => handleEditId(e)}
                            onKeyDown={(e: React.ChangeEvent<HTMLInputElement> | any) => {
                                if (e.key === 'Enter') handleEditId(e);
                            }}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setDatasetName(e.target.value);
                            }}
                            required
                            variant='standard'
                        />
                    }
                </MuiBreadcrumbs> :
                    <MuiBreadcrumbs>
                        <Typography component={Link} to="/" color="textSecondary" variant="h6" sx={{ textDecoration: 'none' }}>
                            {'Home'}
                        </Typography>
                        <Typography color="text.primary">{datasetId.slice(0, -2)}</Typography>
                    </MuiBreadcrumbs>}
            </Box>
        );
    }

    return renderWizardBreadCrumbs();
};

export default WizardBreadcrumbs;
