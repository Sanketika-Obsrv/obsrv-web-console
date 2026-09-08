import {
  Alert,
  Box,
  List,
  ListItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';
import { t } from 'utils/i18n';
import { Action } from './engine/actions';
import { ExecutionOutcome } from './engine/executor';
import SessionResumeList from './session/SessionResumeList';
import { AiSession, Message } from './session/types';

export interface ChatPaneProps {
  datasetId: string | null;
  messages: Message[];
  /** True while the persisted conversation is being restored. */
  loading: boolean;
  /** False when the browser refused to persist the conversation. */
  persisting: boolean;
  /** Other conversations that can be picked up again. */
  resumable: AiSession[];
  currentSessionId?: string;
  onClearSession?: (sessionId: string) => void;
  /**
   * Reports each dispatched action and its outcome so the preview can follow
   * along. Nothing calls it yet — the composer and the resolver that dispatch
   * actions land in T12 and T13.
   */
  onActionExecuted?: (action: Action, outcome: ExecutionOutcome) => void;
}

/**
 * Chat surface.
 *
 * The transcript is plain text for now: rich cards — file drop, conflicts,
 * confirmations, API errors — land in T12, and the composer that dispatches
 * actions in T13. What is here already is what makes the persisted session
 * observable: turns survive a reload, and a browser that refuses to store
 * them says so rather than losing them silently.
 */
const ChatPane: React.FC<ChatPaneProps> = ({
  datasetId,
  messages,
  loading,
  persisting,
  resumable,
  currentSessionId,
  onClearSession,
}) => (
  <Paper
    variant="outlined"
    sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      m: 1,
      p: 2,
      gap: 1,
      overflow: 'auto',
    }}
  >
    <Typography variant="h5">{t('aiAssistant.chatTitle')}</Typography>

    {!persisting && (
      <Alert severity="warning">{t('aiAssistant.notPersisted')}</Alert>
    )}

    {loading ? (
      <Typography role="status" variant="body2" color="text.secondary">
        {t('aiAssistant.restoringSession')}
      </Typography>
    ) : (
      <Stack spacing={1} sx={{ flex: 1 }}>
        {messages.length === 0 ? (
          <>
            <Typography variant="body2" color="text.secondary">
              {datasetId
                ? t('aiAssistant.resumingDraft')
                : t('aiAssistant.newDatasetHint')}
            </Typography>
            <SessionResumeList
              sessions={resumable}
              currentSessionId={currentSessionId}
              onClear={onClearSession ?? (() => undefined)}
            />
          </>
        ) : (
          <List dense disablePadding>
            {messages.map((message) => (
              <ListItem
                key={message.id}
                disableGutters
                data-role={message.role}
                data-failed={message.failureCode ? 'true' : undefined}
                sx={{ display: 'block' }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="div"
                >
                  {message.role}
                </Typography>
                <Typography
                  variant="body2"
                  color={message.failureCode ? 'error.main' : 'text.primary'}
                >
                  {message.text}
                </Typography>
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    )}

    <Box sx={{ flex: 1 }} />
  </Paper>
);

export default ChatPane;
