import {
  Alert,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';
import { LoadProgress } from './model/engineClient';
import { Capability } from './model/tiers';

export interface ModelBannerProps {
  capability?: Capability;
  /** Set while the weights are downloading. */
  progress?: LoadProgress;
  ready: boolean;
  /** True when the weights are already in this browser. */
  cached: boolean;
  /** Roughly how much will be downloaded, for an honest prompt. */
  downloadMb: number;
  onEnable: () => void;
  onRemove: () => void;
  error?: string;
}

/**
 * Offers the in-browser model, and is honest about the cost.
 *
 * The rule-only mode is the product, so this never blocks anything — it is an
 * offer, and the wording says so. The download size is stated up front
 * because it is the user's bandwidth and disk, and a returning user whose
 * weights are cached is not warned about a fetch that will not happen.
 */
const ModelBanner: React.FC<ModelBannerProps> = ({
  capability,
  progress,
  ready,
  cached,
  downloadMb,
  onEnable,
  onRemove,
  error,
}) => {
  if (error) {
    return (
      <Alert severity="warning">
        {`${error} The assistant still works without it.`}
      </Alert>
    );
  }

  if (progress) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={0.5}>
          <Typography variant="body2">{progress.text}</Typography>
          <LinearProgress
            variant="determinate"
            value={Math.round((progress.progress ?? 0) * 100)}
            aria-label="Model download progress"
          />
        </Stack>
      </Paper>
    );
  }

  if (ready) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography
          variant="caption"
          component="span"
          color="text.secondary"
          sx={{ flex: 1 }}
        >
          Understanding instructions with the in-browser model.
        </Typography>
        <Button size="small" onClick={onRemove}>
          Stop using it
        </Button>
      </Stack>
    );
  }

  // Tier 0: say why, once, without implying anything is broken.
  if (capability && capability.tier === 0) {
    return (
      <Typography variant="caption" component="span" color="text.secondary">
        {capability.reason ??
          'The in-browser model is unavailable here. Everything still works without it.'}
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography
        variant="caption"
        component="span"
        color="text.secondary"
        sx={{ flex: 1 }}
      >
        {cached
          ? 'The model is already downloaded in this browser.'
          : `Optional: download a small model (about ${downloadMb} MB) so instructions can be phrased freely. Everything works without it.`}
      </Typography>
      <Button size="small" variant="outlined" onClick={onEnable}>
        {cached ? 'Use the model' : 'Download the model'}
      </Button>
    </Stack>
  );
};

export default ModelBanner;
