import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
} from '@mui/material';

interface EditDimensionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (editedValue: string) => void;
  defaultValue: string;
  rollupMetadata: any[];
  editingDimension?: any;
}

const EditDimensionDialog: React.FC<EditDimensionDialogProps> = ({
  open,
  onClose,
  onSave,
  defaultValue,
  rollupMetadata,
  editingDimension,
}) => {
  const [editedValue, setEditedValue] = React.useState(defaultValue);
  const [dimensionNameError, setDimensionNameError] = React.useState('');

  const validateDimensionName = (name: string) => {
    if (!name) {
      return 'Dimension name is required';
    }
    if (name.length < 4) {
      return 'Dimension name must be at least 4 characters long';
    }
    if (/^[0-9]/.test(name)) {
      return 'Dimension name cannot start with a number';
    }
    if (!/^[a-zA-Z0-9._]+$/.test(name)) {
      return 'Only letters, numbers, dots (.) and underscores (_) are allowed';
    }
    
    // Check if name matches any rollupMetadata name
    const hasMatchingMetadataName = rollupMetadata.some(
      (metadata: any) => metadata.name.toLowerCase() === name.toLowerCase()
    );

    if (hasMatchingMetadataName) {
      return 'Dimension name already exists';
    }

    // Check for existing dimension names and display names
    const existingDimensions = rollupMetadata
      .flatMap((field: any) => field.dimensions || [])
      .filter((dimension: any) => 
        dimension.name !== editingDimension?.name && 
        dimension.column !== editingDimension?.column
      );

    const hasDuplicateName = existingDimensions.some(
      (dimension: any) => 
        dimension.name.toLowerCase() === name.toLowerCase() || 
        dimension.column.toLowerCase() === name.toLowerCase()
    );

    if (hasDuplicateName) {
      return 'Dimension name already exists';
    }

    return '';
  };

  const handleDimensionNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEditedValue(value);
    setDimensionNameError(validateDimensionName(value));
  };

  const handleSave = () => {
    onSave(editedValue);
    onClose();
  };

  React.useEffect(() => {
    setEditedValue(defaultValue);
  }, [defaultValue]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Typography variant='h1'>
          Edit Dimension Field
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Field Name"
            type="text"
            fullWidth
            value={editedValue}
            onChange={handleDimensionNameChange}
            error={!!dimensionNameError}
            helperText={dimensionNameError}
            required
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button size='small' onClick={onClose}>Cancel</Button>
        <Button
          size='small'
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={!!dimensionNameError || !editedValue}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDimensionDialog;
