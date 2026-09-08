import { Alert, AlertTitle, Button, Stack, Typography } from '@mui/material';
import React, { useState } from 'react';
import { Action } from '../engine/actions';
import { Diagnosis } from '../engine/errorMap';

export interface ApiErrorCardProps {
  diagnosis: Diagnosis;
  onAction: (action: Action) => void;
}

/** Severity by what the user can do about it, not by HTTP status. */
const SEVERITY: Record<Diagnosis['recovery'], 'error' | 'warning' | 'info'> = {
  replay: 'info',
  retry: 'info',
  revise: 'warning',
  reauth: 'warning',
  restart: 'error',
  report: 'error',
};

const TITLE: Record<Diagnosis['recovery'], string> = {
  replay: 'Someone else changed this dataset',
  retry: 'Could not reach the server',
  revise: 'That change needs adjusting',
  reauth: 'Signed out',
  restart: 'This dataset is gone',
  report: 'The assistant built an invalid request',
};

/**
 * A failed action, explained.
 *
 * The failure this replaces is a storage step that appeared to save and did
 * not, so the card leads with the explanation and offers the corrected retry
 * the diagnosis derived. The server's own message is kept behind "Details"
 * rather than led with: it names internal storage types and JSON pointers.
 */
const ApiErrorCard: React.FC<ApiErrorCardProps> = ({ diagnosis, onAction }) => {
  const [showDetail, setShowDetail] = useState(false);
  const { retryAction, detail } = diagnosis;

  return (
    <Alert severity={SEVERITY[diagnosis.recovery]}>
      <AlertTitle>{TITLE[diagnosis.recovery]}</AlertTitle>
      <Typography variant="body2">{diagnosis.explanation}</Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        {retryAction && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onAction(retryAction)}
          >
            Retry with the available option
          </Button>
        )}
        {detail && (
          <Button size="small" onClick={() => setShowDetail(!showDetail)}>
            Details
          </Button>
        )}
      </Stack>

      {/*
        Rendered only when asked for, rather than collapsed: the server's
        message names internal storage types and JSON pointers, and there is
        no reason for a screen reader to read it out unprompted.
      */}
      {detail && showDetail && (
        <Typography
          variant="caption"
          component="pre"
          sx={{ mt: 1, whiteSpace: 'pre-wrap' }}
        >
          {detail}
        </Typography>
      )}
    </Alert>
  );
};

export default ApiErrorCard;
