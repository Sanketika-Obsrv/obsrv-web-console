import { useEffect, useRef, useState, } from "react";
import * as _ from "lodash";
import { Popover, Card, Box, TextField, Typography, Button, Chip, Tooltip, InputAdornment, } from "@mui/material";
import { useDispatch, useSelector, } from "react-redux";
import { error, } from "services/toaster";
import AnimateButton from "./@extended/AnimateButton";
import AddIcon from '@mui/icons-material/Add';
import { hasSpecialCharacters } from "services/utils";
import en from 'utils/locales/en.json'

const EditDatasetTags = ({ dataset, open, anchorEl, handleClose = () => { }, handleSave = () => { }, }: any) => {
    const textRef: any = useRef();
    const [tagsData, setTagsData] = useState<string[]>(_.get(dataset, 'tags') || []);
    const dispatch = useDispatch();
    const maxTagsLimit: any = useSelector((state: any) => state?.config?.validationLimit?.maxTag || 5);
    const [disable, setDisable] = useState<boolean>(true);

    const checkInput = (newTag: string) => {
        if (newTag !== undefined && newTag !== null && newTag !== '') {
            const exists = _.findIndex(tagsData, (tag: string) => tag === _.trim(_.toUpper(newTag)));
            if (exists > -1) {
                dispatch(error({ message: 'Tag already exists' }));
                return false;
            }
            if (hasSpecialCharacters(newTag)) {
                dispatch(error({ message: 'Tag cannot have special characters' }));
                return false;
            }
            if (_.size(newTag) > 20) {
                dispatch(error({ message: 'Tag cannot have more than 20 characters' }));
                return false;
            }
            return true;
        }
        return false;
    }

    const addTag = (e: any) => {
        const newTag: string = _.trim(_.toUpper(textRef.current.value));
        if (checkInput(newTag)) {
            if (tagsData.length >= maxTagsLimit) {
                dispatch(error({ message: en.maxTagsLimit.replace('{maxTagsLimit}', maxTagsLimit) }));
            } else {
                setTagsData((prevState: string[]) => {
                    const data = [...prevState, newTag];
                    textRef.current.value = '';
                    return data;
                });
                setDisable(false)
            }
        }
    }

    const saveTags = () => {
        handleSave(dataset, tagsData);
    }

    const deleteTag = (tag: string) => {
        setTagsData((prevState: string[]) => {
            const data = _.filter(prevState, (tagd: string) => tagd !== tag);
            return data;
        });
        setDisable(false)
    }

    useEffect(() => {
        setTagsData(_.get(dataset, 'tags') || []);
    }, [dataset]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement> | any) => {
        const tagLength = _.get(e, ["target", "value", "length"])
        setDisable(tagLength)
    }

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            disablePortal={false}
            PaperProps={{ sx: { minWidth: '30vw' } }}
        >
            <Card elevation={3} sx={{ border: '1px solid #dadde9' }}>
                <Box p={2} position="relative">
                    <TextField
                        inputRef={textRef}
                        fullWidth
                        label="Edit tags..."
                        inputProps={{ maxlength: 20, }}
                        onChange={handleChange}
                        onKeyDown={(e: React.ChangeEvent<HTMLInputElement> | any) => {
                            if (e.key === 'Enter') addTag(e)
                        }}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">
                                <Button
                                    aria-label="add item"
                                    onClick={addTag}
                                    sx={{ mr: 1, fontSize: '1.25rem', }}
                                    startIcon={<AddIcon sx={{ fontSize: '1.25rem', }} />}
                                >
                                    <Typography variant="h6">Add</Typography>
                                </Button>
                            </InputAdornment>
                        }}
                    />
                    <Box display="flex" alignItems="center" flexWrap="wrap" flexGrow={1} gap={1} my={1}>
                        {
                            tagsData.map((tag: string, index: number) => (
                                <Tooltip title={tag} key={index}>
                                    <Chip
                                        key={index}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        label={
                                            <Typography variant="body2" align="left">
                                                {tag}
                                            </Typography>
                                        }
                                        onDelete={() => deleteTag(tag)}
                                    />
                                </Tooltip>
                            ))
                        }
                    </Box>
                </Box>
                <Box p={1} m={1} display="flex" justifyContent="space-between" alignItems="center">
                    <AnimateButton>
                        <Button variant="outlined" onClick={handleClose}>
                            <Typography variant="h5" fontWeight={500}>Discard</Typography>
                        </Button>
                    </AnimateButton>
                    <AnimateButton>
                        <Button variant="contained" onClick={saveTags} disabled={disable}>
                            <Typography variant="h5" fontWeight={500}>Save</Typography>
                        </Button>
                    </AnimateButton>
                </Box>
            </Card>
        </Popover>
    );
};

export default EditDatasetTags;
