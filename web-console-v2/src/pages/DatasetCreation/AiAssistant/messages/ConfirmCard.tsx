import { List, ListItem, Paper, Stack, Typography } from '@mui/material';
import React from 'react';
import { CONFIRM_LABELS } from '../engine/answer';

export interface ConfirmCardProps {
  title: string;
  /** What is about to be written, so nothing is agreed to blind. */
  summary?: string[];
}

/**
 * What is about to happen, waiting on a yes.
 *
 * The confirming action stays on the message rather than on a button: a
 * typed "yes" is matched against it, and "no" abandons it. Confirming is
 * still explicit — it is the wording that changed, not the safeguard.
 */
const ConfirmCard: React.FC<ConfirmCardProps> = ({ title, summary }) => (
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

      <Typography variant="caption" component="p" color="text.secondary">
        {/*
          Read from the same words `readOffer` matches a reply against, so
          the two can never say something different from what is printed
          here.
        */}
        Say {CONFIRM_LABELS.accept} to go ahead, or {CONFIRM_LABELS.decline} to
        leave it.
      </Typography>
    </Stack>
  </Paper>
);

export default ConfirmCard;
