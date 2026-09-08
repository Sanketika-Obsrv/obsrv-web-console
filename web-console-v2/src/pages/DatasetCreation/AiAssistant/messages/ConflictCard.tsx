import { Alert, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import React from 'react';
import { Action } from '../engine/actions';
import { ConflictCandidate } from './types';

export interface ConflictCardProps {
  path: string;
  candidates: ConflictCandidate[];
  /** How many observed values the API's recommendation would narrow. */
  valuesAtRisk?: number;
  onAction: (action: Action) => void;
}

/**
 * Resolves a datatype conflict against the counts the API actually reported.
 *
 * The wizard shows a "Recommended Change" button and nothing else, so a
 * recommendation that truncates most of the observed values looks identical to
 * one that costs nothing. The counts and the warning are the point of this
 * card — both come from the API's own conflict message.
 */
const ConflictCard: React.FC<ConflictCardProps> = ({
  path,
  candidates,
  valuesAtRisk,
  onAction,
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

      <Stack spacing={1}>
        {candidates.map((candidate) => (
          <Stack
            key={candidate.dataType}
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Button
              size="small"
              variant={candidate.isSafest ? 'contained' : 'outlined'}
              onClick={() =>
                onAction({
                  kind: 'resolve_conflict',
                  path,
                  mode: 'apply',
                  dataType: candidate.dataType,
                })
              }
            >
              {candidate.dataType}
            </Button>

            {candidate.count !== undefined && (
              <Typography variant="caption" color="text.secondary">
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
        Dismissing marks the conflict resolved without changing the type, i.e.
        keeping whatever the API already decided. Offered because leaving a
        conflict unresolved blocks the save.
      */}
      <Button
        size="small"
        variant="text"
        sx={{ alignSelf: 'flex-start' }}
        onClick={() =>
          onAction({ kind: 'resolve_conflict', path, mode: 'dismiss' })
        }
      >
        Keep the current type
      </Button>
    </Stack>
  </Paper>
);

export default ConflictCard;
