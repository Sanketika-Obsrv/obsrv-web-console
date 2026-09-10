import {
  Alert,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';
import { REQUIRED_MODEL } from './model/catalog';
import { LoadProgress } from './model/engineClient';

export interface ModelBannerProps {
  /** Set while the weights are downloading or the engine is starting. */
  progress?: LoadProgress;
  ready: boolean;
  /** True when the weights are already in this browser. */
  cached: boolean;
  /** Retries the load, because a download can simply fail. */
  onRetry: () => void;
  error?: string;
}

/**
 * What the model is doing, while it is doing it.
 *
 * This used to offer the model and promise that everything worked without
 * it. It is not optional any more: every instruction is typed, so
 * understanding loose phrasing is the product rather than an extra. The
 * banner's job is now to report a load the user did not ask for and cannot
 * decline — which makes saying what is happening, and how much of their
 * bandwidth it costs, the whole point. A returning user whose weights are
 * cached is not warned about a fetch that will not happen.
 *
 * It renders nothing once the model is running: a permanent badge for the
 * normal state is noise.
 */
const ModelBanner: React.FC<ModelBannerProps> = ({
  progress,
  ready,
  cached,
  onRetry,
  error,
}) => {
  if (error) {
    return (
      <Alert
        severity="warning"
        action={
          <Button size="small" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        {`${error} Until it loads I cannot read your instructions — you can build the dataset in the wizard instead, from the link beside the preview.`}
      </Alert>
    );
  }

  if (ready) return null;

  const percent = Math.round((progress?.progress ?? 0) * 100);

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={0.5}>
        <Typography variant="body2">
          {cached
            ? `Starting ${REQUIRED_MODEL.label} — it is already in this browser.`
            : `Loading ${REQUIRED_MODEL.label}, about ${REQUIRED_MODEL.downloadMB} MB. This happens the first time only; it is kept in this browser afterwards.`}
        </Typography>

        <Typography variant="caption" component="p" color="text.secondary">
          {progress?.text ?? 'Preparing…'}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={percent}
          aria-label="Model load progress"
          aria-valuenow={percent}
        />
      </Stack>
    </Paper>
  );
};

export default ModelBanner;
