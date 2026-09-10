import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { t } from 'utils/i18n';
import ChatComposer from './ChatComposer';
import ModelBanner, { ModelBannerProps } from './ModelBanner';
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
  /**
   * Receives a file dropped anywhere on the conversation.
   *
   * Dropping is one of the two ways a sample arrives — the other is pasting
   * it into the composer — now that the file-drop card and its button are
   * gone. The pane only hands the file up; reading it, and asking whether to
   * use it, happen a layer above.
   */
  onSampleFile?: (file: File) => void;
  /** Receives connector credentials; deliberately not an action. */
  onSubmitSecrets?: (secrets: Record<string, unknown>) => void;
  /** The chosen connector's schema, supplied live rather than by a card. */
  connectorUiSpec?: UiSpec;
  /** Called with what the user typed. */
  onSend?: (text: string) => void;
  /** True while a turn is in flight. */
  busy?: boolean;
  /** The in-browser model's state and controls, when offered at all. */
  model?: ModelBannerProps;
  /** Writes the conversation's action trail to a file. */
  onExportTrail?: () => void;
}

/**
 * Chat surface.
 *
 * Everything is said in words. Turns render through `MessageList`, and a
 * turn can still carry a card — a conflict with real counts, a confirmation,
 * an explained API error — but a card states its case and is answered by
 * typing. The credential form is the single exception, because a password
 * typed into the box would be persisted with the transcript.
 *
 * The whole pane is a drop target, which is what replaced the file-drop
 * card: dropping a sample anywhere works, and there is no button to find.
 */
const ChatPane: React.FC<ChatPaneProps> = ({
  datasetId,
  messages,
  loading,
  persisting,
  resumable,
  currentSessionId,
  onClearSession,
  onSampleFile,
  onSubmitSecrets,
  connectorUiSpec,
  onSend,
  busy = false,
  model,
  onExportTrail,
}) => {
  const [draggingOver, setDraggingOver] = useState(false);

  /**
   * Only a file drag is worth reacting to. Dragging selected text across the
   * pane is not an attempt to supply a sample, and lighting the pane up for
   * it would be noise.
   */
  const carriesFile = (event: React.DragEvent) =>
    Array.from(event.dataTransfer?.types ?? []).includes('Files');

  const onDrop = (event: React.DragEvent) => {
    setDraggingOver(false);
    if (!onSampleFile) return;

    const file = event.dataTransfer?.files?.[0];
    if (!file) return;

    event.preventDefault();
    onSampleFile(file);
  };

  return (
    <Paper
      variant="outlined"
      aria-label={t('aiAssistant.conversationLabel')}
      onDragOver={(event) => {
        if (!onSampleFile || !carriesFile(event)) return;
        // Without this the browser navigates to the file instead.
        event.preventDefault();
        setDraggingOver(true);
      }}
      onDragLeave={() => setDraggingOver(false)}
      onDrop={onDrop}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        m: 1,
        p: 2,
        gap: 1,
        overflow: 'auto',
        ...(draggingOver
          ? { outline: '2px dashed', outlineOffset: '-4px' }
          : {}),
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

      {/*
      The conversation waits for the model.
      
      Typed instructions are the only way in, and reading them is what the
      model does, so a composer offered before it is ready would accept
      something nothing could act on. The preview pane keeps rendering
      beside this, with its link to the wizard — which is the answer both
      for the wait and for a browser that cannot run the model at all.
    */}

      {!persisting && (
        <Alert severity="warning">{t('aiAssistant.notPersisted')}</Alert>
      )}

      {model && !model.ready ? null : loading ? (
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

      {draggingOver && (
        <Typography variant="body2" color="text.secondary">
          {t('aiAssistant.dropHint')}
        </Typography>
      )}

      {/*
        Nothing to type into until the model is running: reading typed
        instructions is what it does, so a composer offered before then
        would take something nothing could act on. The preview pane stays up
        beside this, with its link to the wizard.
      */}
      {(!model || model.ready) && (
        <>
          <Divider />
          <ChatComposer onSend={onSend ?? (() => undefined)} busy={busy} />
        </>
      )}
    </Paper>
  );
};

export default ChatPane;
