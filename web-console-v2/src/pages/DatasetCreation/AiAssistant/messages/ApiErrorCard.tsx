import { Alert, AlertTitle, Typography } from '@mui/material';
import React from 'react';
import { Diagnosis } from '../engine/errorMap';

export interface ApiErrorCardProps {
  diagnosis: Diagnosis;
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
 * not, so the card leads with the explanation. The retry used to be a button
 * and is now a sentence: a failure is the moment the user most needs to know
 * what to say next, and there is nothing to press anywhere in this
 * conversation.
 *
 * The server's own message stays behind a disclosure rather than being led
 * with — it names internal storage types and JSON pointers, and there is no
 * reason for a screen reader to read it out unprompted. A disclosure reveals
 * text; it does nothing to the dataset.
 */
const ApiErrorCard: React.FC<ApiErrorCardProps> = ({ diagnosis }) => {
  const { retryAction, detail } = diagnosis;

  return (
    <Alert severity={SEVERITY[diagnosis.recovery]}>
      <AlertTitle>{TITLE[diagnosis.recovery]}</AlertTitle>
      <Typography variant="body2">{diagnosis.explanation}</Typography>

      {(retryAction || diagnosis.recovery === 'retry') && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {retryAction
            ? 'Say "try again" and I will retry with the available option.'
            : 'Say "try again" and I will send it again.'}
        </Typography>
      )}

      {detail && (
        <Typography variant="caption" component="details" sx={{ mt: 1 }}>
          <summary>Details</summary>
          <Typography
            variant="caption"
            component="pre"
            sx={{ whiteSpace: 'pre-wrap' }}
          >
            {detail}
          </Typography>
        </Typography>
      )}
    </Alert>
  );
};

export default ApiErrorCard;
