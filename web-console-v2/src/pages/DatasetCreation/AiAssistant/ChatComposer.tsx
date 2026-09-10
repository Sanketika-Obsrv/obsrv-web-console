import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { IconButton, Stack, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';
import { t } from 'utils/i18n';

export interface ChatComposerProps {
  onSend: (text: string) => void;
  /** True while a turn is in flight; a second send would race two writes. */
  busy: boolean;
}

/**
 * Where the user types.
 *
 * Sending is blocked while a turn is in flight, because a turn is a
 * read-modify-write against the dataset and two in parallel would race. What
 * was typed is kept rather than cleared in that case, so nothing is lost.
 *
 * Nothing is offered to click. Example phrases used to sit above the box;
 * they made the surface a menu of the sentences the assistant liked, which
 * is the wizard it replaces wearing different clothes. Everything is said
 * in words now, and a request it cannot take yet is answered with what is
 * missing rather than hidden by never being offered.
 */
const ChatComposer: React.FC<ChatComposerProps> = ({ onSend, busy }) => {
  const [text, setText] = useState('');

  const send = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;

    onSend(trimmed);
    setText('');
  };

  return (
    <Stack spacing={1}>
      {busy && (
        <Typography
          role="status"
          variant="caption"
          component="span"
          color="text.secondary"
        >
          {t('aiAssistant.working')}
        </Typography>
      )}

      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          label={t('aiAssistant.messageLabel')}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Shift+Enter keeps the newline, so a long instruction can be
            // written across lines.
            if (event.key !== 'Enter' || event.shiftKey) return;
            event.preventDefault();
            send(text);
          }}
        />
        <IconButton
          color="primary"
          aria-label={t('aiAssistant.send')}
          disabled={busy || text.trim().length === 0}
          onClick={() => send(text)}
        >
          <SendOutlinedIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
};

export default ChatComposer;
