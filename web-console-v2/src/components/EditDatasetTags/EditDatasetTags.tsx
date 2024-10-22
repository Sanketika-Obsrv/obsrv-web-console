import React from 'react';
import { useEffect, useRef, useState } from 'react';
import * as _ from 'lodash';
import {
  Popover,
  Card,
  Box,
  TextField,
  Typography,
  Button,
  Chip,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Dataset } from '../../types/dataset';
interface EditDatasetTagsProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  handleClose: () => void;
  dataset: Dataset;
  handleSave: (dataset: Dataset, tags: string[], initialTags: string[]) => void;
}

const EditDatasetTags: React.FC<EditDatasetTagsProps> = ({
  open,
  anchorEl,
  handleClose,
  dataset,
  handleSave,
}) => {
  const textRef: any = useRef();
  const [disable, setDisable] = useState<boolean>(true);
  const [initialTags, setInitialTags] = useState<string[]>([]);

  const [tagsData, setTagsData] = useState<string[]>(
    _.get(dataset, 'tags') || [],
  );

  const saveTags = () => {
    handleSave(dataset, tagsData, initialTags);
    handleClose();
  };

  const addTag = (e: any) => {
    let newTag: any = textRef.current.value.trim();

    newTag = _.toLower(newTag);

    if (newTag && !tagsData.map((tag) => _.toLower(tag)).includes(newTag)) {
      setTagsData([...tagsData, _.startCase(newTag)]);
    }
    textRef.current.value = '';
    setDisable(false);
  };

  const handleChange = () => {
    return null;
  };

  const deleteTag = (tag: string) => {
    setTagsData((prevState: string[]) => {
      const data = _.filter(prevState, (tagd: string) => tagd !== tag);
      return data;
    });
    setDisable(false);
  };

  useEffect(() => {
    setTagsData(_.get(dataset, 'tags') || []);
    setInitialTags(_.get(dataset, 'tags') || []);
  }, [dataset]);

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
      <Card elevation={3} sx={{ border: '0.12rem solid #dadde9' }}>
        <Box p={2} position="relative">
          <TextField
            inputRef={textRef}
            fullWidth
            label="Edit tags..."
            inputProps={{ maxLength: 20 }}
            onChange={handleChange}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') addTag(e);
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    aria-label="add item"
                    onClick={addTag}
                    sx={{ mr: 1, fontSize: '1.25rem' }}
                    startIcon={<AddIcon sx={{ fontSize: '1.25rem' }} />}
                  >
                    <Typography variant="h6">Add</Typography>
                  </Button>
                </InputAdornment>
              ),
            }}
          />
          <Box
            display="flex"
            alignItems="center"
            flexWrap="wrap"
            flexGrow={1}
            gap={1}
            my={1}
          >
            {tagsData &&
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
              ))}
            {tagsData.length < 1 && <p>No tags available</p>}
          </Box>
        </Box>
        <Box
          p={1}
          m={1}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Button variant="outlined" onClick={handleClose}>
            <Typography variant="h5" fontWeight={500}>
              Discard
            </Typography>
          </Button>
          <Button variant="contained" onClick={saveTags} disabled={disable}>
            <Typography variant="h5" fontWeight={500}>
              Save
            </Typography>
          </Button>
        </Box>
      </Card>
    </Popover>
  );
};

export default EditDatasetTags;
