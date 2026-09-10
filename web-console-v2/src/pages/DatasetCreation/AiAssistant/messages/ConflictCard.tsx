import { Alert, Chip, Paper, Stack, Typography } from '@mui/material';
import React from 'react';
import { ConflictCandidate } from './types';

export interface ConflictCardProps {
  path: string;
  candidates: ConflictCandidate[];
  /** How many observed values the API's recommendation would narrow. */
  valuesAtRisk?: number;
}

/**
 * A datatype conflict, with the counts the API actually reported.
 *
 * The wizard shows a "Recommended Change" button and nothing else, so a
 * recommendation that truncates most of the observed values looks identical
 * to one that costs nothing. The counts and the warning are the point of this
 * card, and they stay — dense numbers read badly as a sentence. What went is
 * the row of buttons: the type is named in words.
 */
const ConflictCard: React.FC<ConflictCardProps> = ({
  path,
  candidates,
  valuesAtRisk,
}) => (
  <Paper variant="outlined" sx={{ p: 1.5 }}>
    <Stack spacing={1}>
      <Typography variant="subtitle2">
        <code>{path}</code> arrived as more than one type
      </Typography>

      {valuesAtRisk !== undefined && valuesAtRisk > 0 && (
        <Alert severity="warning">
          {`The recommended type would narrow ${valuesAtRisk} observed value${
            valuesAtRisk === 1 ? '' : 's'
          }.`}
        </Alert>
      )}

      <Stack spacing={0.5}>
        {candidates.map((candidate) => (
          <Stack
            key={candidate.dataType}
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Typography variant="body2" fontWeight="medium">
              {candidate.dataType}
            </Typography>

            {candidate.count !== undefined && (
              <Typography
                variant="caption"
                component="span"
                color="text.secondary"
              >
                {`seen ${candidate.count} time${
                  candidate.count === 1 ? '' : 's'
                }`}
              </Typography>
            )}

            {candidate.isRecommended && (
              <Chip size="small" label="Recommended by the API" />
            )}
            {candidate.isSafest && (
              <Chip size="small" color="success" label="Holds every value" />
            )}
          </Stack>
        ))}
      </Stack>

      {/*
        Keeping the current type marks the conflict resolved without changing
        anything, which is worth saying: an unresolved conflict blocks the
        save, so "leave it" has to be a reachable answer.
      */}
      <Typography variant="caption" component="p" color="text.secondary">
        Tell me which it should be, or say &quot;keep the current type&quot;.
      </Typography>
    </Stack>
  </Paper>
);

export default ConflictCard;
