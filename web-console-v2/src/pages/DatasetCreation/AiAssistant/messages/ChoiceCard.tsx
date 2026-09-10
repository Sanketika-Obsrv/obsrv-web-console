import { Paper, Stack, Typography } from '@mui/material';
import React from 'react';
import { ChoiceOption } from './types';

export interface ChoiceCardProps {
  prompt?: string;
  options: ChoiceOption[];
}

/**
 * The answers this question will take, listed.
 *
 * These used to be buttons. Nothing in the transcript is clickable now — the
 * surface is a conversation, and a row of buttons is a menu of the sentences
 * the assistant likes. The options stay on the card because a typed answer is
 * matched against them (`answerTo`), and because a question is easier to
 * answer when its answers are visible.
 */
const ChoiceCard: React.FC<ChoiceCardProps> = ({ prompt, options }) => (
  <Paper variant="outlined" sx={{ p: 1.5 }}>
    <Stack spacing={1}>
      {prompt && <Typography variant="body2">{prompt}</Typography>}

      <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
        {options.map((option) => (
          <li key={option.label}>
            <Typography variant="body2" component="span">
              {option.label}
            </Typography>
            {option.hint && (
              <Typography
                variant="caption"
                component="span"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                {option.hint}
              </Typography>
            )}
          </li>
        ))}
      </Stack>

      <Typography variant="caption" component="p" color="text.secondary">
        Type your answer — one of these, or something else entirely.
      </Typography>
    </Stack>
  </Paper>
);

export default ChoiceCard;
