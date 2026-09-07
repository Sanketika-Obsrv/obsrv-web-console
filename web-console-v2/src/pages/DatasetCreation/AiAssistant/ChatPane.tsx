import { Box, Paper, Typography } from '@mui/material';
import React from 'react';
import { t } from 'utils/i18n';

export interface ChatPaneProps {
  datasetId: string | null;
}

/**
 * Chat surface shell. Message list, composer and rich cards land in T12; this
 * renders the empty state so the layout and routing can be verified first.
 */
const ChatPane: React.FC<ChatPaneProps> = ({ datasetId }) => (
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
    <Typography variant="body2" color="text.secondary">
      {datasetId
        ? t('aiAssistant.resumingDraft')
        : t('aiAssistant.newDatasetHint')}
    </Typography>
    <Box sx={{ flex: 1 }} />
  </Paper>
);

export default ChatPane;
