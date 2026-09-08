import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import React from 'react';
import { t } from 'utils/i18n';
import { Action } from './engine/actions';
import { ExecutionOutcome } from './engine/executor';
import MessageList from './messages/MessageList';
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
  /** Dispatched when a card is used. The resolver that drives it lands in T13. */
  onAction?: (action: Action) => void;
  /** Receives a sample the user supplied through a file-drop card. */
  onSampleRows?: (rows: Record<string, unknown>[], file: File) => void;
  /**
   * Reports each dispatched action and its outcome so the preview can follow
   * along. Called by the resolver in T13.
   */
  onActionExecuted?: (action: Action, outcome: ExecutionOutcome) => void;
}

/**
 * Chat surface.
 *
 * Turns render through `MessageList`, so a turn can carry a card — a file
 * drop, a conflict with real counts, a confirmation, an explained API error —
 * and every action stays reachable by clicking. The composer that turns typed
 * text into actions lands in T13.
 */
const ChatPane: React.FC<ChatPaneProps> = ({
  datasetId,
  messages,
  loading,
  persisting,
  resumable,
  currentSessionId,
  onClearSession,
  onAction,
  onSampleRows,
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
          <MessageList
            messages={messages}
            onAction={onAction ?? (() => undefined)}
            onSampleRows={onSampleRows ?? (() => undefined)}
          />
        )}
      </Stack>
    )}

    <Box sx={{ flex: 1 }} />
  </Paper>
);

export default ChatPane;
