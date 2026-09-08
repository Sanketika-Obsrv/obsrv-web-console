import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { t } from 'utils/i18n';
import { AiSession } from './types';

export interface SessionResumeListProps {
  sessions: AiSession[];
  /** Excluded from the list — it is the conversation already on screen. */
  currentSessionId?: string;
  onClear: (sessionId: string) => void;
  /** Injected so the relative time is deterministic under test. */
  now?: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Coarse relative time; the list only needs "roughly when", not precision. */
const describeAge = (updatedAt: number, now: number): string => {
  const elapsed = Math.max(0, now - updatedAt);

  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;

  return `${Math.floor(elapsed / DAY)}d ago`;
};

/**
 * Conversations the user can pick up again.
 *
 * A session with no turns is not offered: it carries nothing to resume, and
 * one is created every time the page is opened. Nor is the conversation
 * currently on screen.
 */
const SessionResumeList: React.FC<SessionResumeListProps> = ({
  sessions,
  currentSessionId,
  onClear,
  now = Date.now(),
}) => {
  const resumable = sessions.filter(
    (session) =>
      session.messages.length > 0 && session.sessionId !== currentSessionId,
  );

  if (resumable.length === 0) return null;

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        {t('aiAssistant.resumeHeading')}
      </Typography>
      <List dense disablePadding>
        {resumable.map((session) => {
          const label = session.datasetId ?? t('aiAssistant.draftNotCreated');
          const turns =
            session.messages.length === 1
              ? '1 message'
              : `${session.messages.length} messages`;

          return (
            <ListItem
              key={session.sessionId}
              disableGutters
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  aria-label={`Clear conversation for ${label}`}
                  onClick={() => onClear(session.sessionId)}
                >
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={
                  session.datasetId ? (
                    <Link
                      component={RouterLink}
                      to={`/dataset/ai/${session.datasetId}`}
                    >
                      {session.datasetId}
                    </Link>
                  ) : (
                    label
                  )
                }
                secondary={`${session.step} · ${turns} · ${describeAge(
                  session.updatedAt,
                  now,
                )}`}
              />
            </ListItem>
          );
        })}
      </List>
    </Stack>
  );
};

export default SessionResumeList;
