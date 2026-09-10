import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';
import { t } from 'utils/i18n';
import ChatComposer from './ChatComposer';
import ModelBanner, { ModelBannerProps } from './ModelBanner';
import { Action } from './engine/actions';
import { UiSpec } from './engine/connectors';
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
  /** Writes the conversation's action trail to a file. */
  onExportTrail?: () => void;
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
  onExportTrail,
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
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
    >
      <Typography variant="h5">{t('aiAssistant.chatTitle')}</Typography>

      {/*
        Offered whenever there is something to export. Every change is
        recorded with the action that made it, so the trail is worth having
        without waiting for the dataset to be finished.

        The tooltip uses `describeChild`, so the hint becomes the button's
        description rather than its accessible name — the default replaces the
        name, which left the button announced as a paragraph about credentials.
      */}
      {onExportTrail && messages.length > 0 && (
        <Tooltip title={t('aiAssistant.exportTrailHint')} describeChild>
          <Button size="small" variant="text" onClick={onExportTrail}>
            {t('aiAssistant.exportTrail')}
          </Button>
        </Tooltip>
      )}
    </Stack>

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
          No standing file drop. It was here when nothing asked for a sample
          and the user had to know to supply one; now the assistant asks, and
          its question carries the drop card. Leaving this in showed a second
          copy of the same control underneath every question — and offered it
          at the *name* question, where attaching a sample is refused for
          want of a name. That is the failure the agenda was built to remove.
          Seen against a live cluster.
        */}
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
