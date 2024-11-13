import React, { useState } from 'react';
import {
  Popover,
  Card,
  Box,
  TextField,
  Typography,
  Button,
} from '@mui/material';

interface CopyDatasetProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  handleClose: () => void;
  sourceDatasetId: string;
  handleSave: (
    sourceDatasetId: string,
    destinationDatasetId: string,
    isLive: boolean,
  ) => void;
}

const CopyDataset: React.FC<CopyDatasetProps> = ({
  open,
  anchorEl,
  handleClose,
  sourceDatasetId,
  handleSave,
}) => {
  const [destinationDatasetId, setDestinationDatasetId] = useState<string>('');

  const saveDatasetCopy = () => {
    handleSave(sourceDatasetId, destinationDatasetId, true);
    setDestinationDatasetId('');
    handleClose();
  };

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
            fullWidth
            label="New Dataset ID"
            value={destinationDatasetId}
            onChange={(e) => setDestinationDatasetId(e.target.value)}
          />
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
          <Button
            variant="contained"
            onClick={saveDatasetCopy}
            disabled={!destinationDatasetId}
          >
            <Typography variant="h5" fontWeight={500}>
              Save
            </Typography>
          </Button>
        </Box>
      </Card>
    </Popover>
  );
};

export default CopyDataset;
