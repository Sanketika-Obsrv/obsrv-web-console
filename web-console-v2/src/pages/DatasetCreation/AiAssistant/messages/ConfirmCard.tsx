import {
  Button,
  List,
  ListItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';
import { Action } from '../engine/actions';

export interface ConfirmCardProps {
  title: string;
  /** What is about to be written, so the user is not confirming blind. */
  summary?: string[];
  confirmLabel?: string;
  confirmAction: Action;
  onAction: (action: Action) => void;
  onCancel?: () => void;
}

/** Explicit confirmation for a step that changes the dataset's status. */
const ConfirmCard: React.FC<ConfirmCardProps> = ({
  title,
  summary,
  confirmLabel = 'Save',
  confirmAction,
  onAction,
  onCancel,
}) => (
  <Paper variant="outlined" sx={{ p: 1.5 }}>
    <Stack spacing={1}>
      <Typography variant="subtitle2">{title}</Typography>

      {summary && summary.length > 0 && (
        <List dense disablePadding>
          {summary.map((line) => (
            <ListItem key={line} disableGutters sx={{ py: 0 }}>
              <Typography variant="body2" color="text.secondary">
                {line}
              </Typography>
            </ListItem>
          ))}
        </List>
      )}

      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="contained"
          onClick={() => onAction(confirmAction)}
        >
          {confirmLabel}
        </Button>
        <Button size="small" onClick={onCancel}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  </Paper>
);

export default ConfirmCard;
