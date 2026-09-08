import { Alert, Divider, Paper, Stack, Typography } from '@mui/material';
import React from 'react';
import { t } from 'utils/i18n';
import ChatComposer from './ChatComposer';
import ModelBanner, { ModelBannerProps } from './ModelBanner';
import { Action } from './engine/actions';
import { UiSpec } from './engine/connectors';
import FileDropCard from './messages/FileDropCard';
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
  /** Dispatched when a card is used. */
  onAction?: (action: Action) => void;
  /** Receives a sample the user supplied through a file-drop card. */
  onSampleRows?: (rows: Record<string, unknown>[], file: File) => void;
  /** Receives connector credentials; deliberately not an action. */
  onSubmitSecrets?: (secrets: Record<string, unknown>) => void;
  /** The chosen connector's schema, supplied live rather than by a card. */
  connectorUiSpec?: UiSpec;
  /** Called with what the user typed. */
  onSend?: (text: string) => void;
  /** True while a turn is in flight. */
  busy?: boolean;
  /** Example instructions offered as chips. */
  suggestions?: string[];
  /** The in-browser model's state and controls, when offered at all. */
  model?: ModelBannerProps;
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
  onSubmitSecrets,
  connectorUiSpec,
  onSend,
  busy = false,
  suggestions,
  model,
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

    {model && <ModelBanner {...model} />}

    {!persisting && (
      <Alert severity="warning">{t('aiAssistant.notPersisted')}</Alert>
    )}

    {loading ? (
      <Typography role="status" variant="body2" color="text.secondary">
        {t('aiAssistant.restoringSession')}
      </Typography>
    ) : (
      <Stack spacing={1} sx={{ flex: 1, overflow: 'auto' }}>
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
            onSubmitSecrets={onSubmitSecrets}
            connectorUiSpec={connectorUiSpec}
          />
        )}

        {/*
          Attaching a sample is what creates the draft, so it stays available
          for as long as there is no draft — not only while the conversation
          is empty. Naming the dataset first must not remove the only way to
          supply a sample.
        */}
        {!datasetId && (
          <FileDropCard onRows={onSampleRows ?? (() => undefined)} />
        )}
      </Stack>
    )}

    <Divider />
    <ChatComposer
      onSend={onSend ?? (() => undefined)}
      busy={busy}
      suggestions={suggestions}
    />
  </Paper>
);

export default ChatPane;
