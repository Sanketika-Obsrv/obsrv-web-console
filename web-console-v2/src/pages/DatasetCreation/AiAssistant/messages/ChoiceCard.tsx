import { Button, Paper, Stack, Typography } from '@mui/material';
import React from 'react';
import { Action } from '../engine/actions';
import { ChoiceOption } from './types';

export interface ChoiceCardProps {
  prompt?: string;
  options: ChoiceOption[];
  onAction: (action: Action) => void;
  /** True once one option has been taken; the buttons are then withdrawn. */
  answered?: boolean;
  chosenLabel?: string;
}

/**
 * A set of buttons rather than a typed answer.
 *
 * This is what makes the rule-only tier a first-class mode: every branch of
 * the workflow can be reached by clicking, with no model and no parsing.
 */
const ChoiceCard: React.FC<ChoiceCardProps> = ({
  prompt,
  options,
  onAction,
  answered,
  chosenLabel,
}) => (
  <Paper variant="outlined" sx={{ p: 1.5 }}>
    <Stack spacing={1}>
      {prompt && <Typography variant="body2">{prompt}</Typography>}

      {answered ? (
        <Typography variant="body2" color="text.secondary">
          {chosenLabel ?? 'Answered'}
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {options.map((option) => (
            <Stack key={option.label} spacing={0.25}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => onAction(option.action)}
              >
                {option.label}
              </Button>
              {option.hint && (
                <Typography
                  variant="caption"
                  component="span"
                  color="text.secondary"
                >
                  {option.hint}
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  </Paper>
);

export default ChoiceCard;
