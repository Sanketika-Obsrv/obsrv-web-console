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
import { MODELS, ModelSpec } from './model/catalog';
import { Capability } from './model/tiers';

export interface ModelBannerProps {
  capability?: Capability;
  /** Set while the weights are downloading. */
  progress?: LoadProgress;
  ready: boolean;
  /**
   * Ids of the models whose weights are already in this browser.
   *
   * Per model, not a single flag: "the model is already downloaded" was true
   * of the small one and said nothing about the large one, so the button
   * beside it read as "switch to the better model" when it meant "fetch
   * another gigabyte". Reported by the user, who clicked it.
   */
  cached: string[];
  /**
   * Models this browser could actually hold, smallest first.
   *
   * Anything beyond the first is offered as an alternative rather than an
   * upgrade: the small model is the recommendation, and a bigger download is
   * only worth mentioning where there is room for it.
   */
  choices?: ModelSpec[];
  onEnable: (model?: ModelSpec) => void;
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
/** What a button for this model should say, given what is already here. */
const labelFor = (
  model: ModelSpec,
  cached: string[],
  plain: boolean,
): string => {
  if (cached.includes(model.id)) {
    return plain ? 'Use the model' : `Use ${model.label}`;
  }

  return plain
    ? 'Download the model'
    : `Download ${model.label} (${model.downloadMB} MB)`;
};

const ModelBanner: React.FC<ModelBannerProps> = ({
  capability,
  progress,
  ready,
  cached,
  choices = [MODELS[0]],
  onEnable,
  onRemove,
  error,
}) => {
  /**
   * The list is empty until capability detection returns, and this renders
   * before that. Falling back to the recommended model keeps the offer
   * honest in the meantime; a blind destructure threw during render, which
   * takes the page with it.
   */
  const [smallest = MODELS[0], ...alternatives] = choices;
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
        {cached.includes(smallest.id)
          ? `${smallest.label} is already downloaded in this browser.`
          : `Optional: download a small model (about ${smallest.downloadMB} MB) so instructions can be phrased freely. Everything works without it.${alternatives
              .map((model) =>
                cached.includes(model.id)
                  ? ` ${model.label} is already here.`
                  : ` ${model.label} understands more and costs about ${model.downloadMB} MB.`,
              )
              .join('')}`}
      </Typography>
      <Button
        size="small"
        variant="outlined"
        onClick={() => onEnable(smallest)}
      >
        {labelFor(smallest, cached, true)}
      </Button>
      {alternatives.map((model) => (
        <Button key={model.id} size="small" onClick={() => onEnable(model)}>
          {labelFor(model, cached, false)}
        </Button>
      ))}
    </Stack>
  );
};

export default ModelBanner;
