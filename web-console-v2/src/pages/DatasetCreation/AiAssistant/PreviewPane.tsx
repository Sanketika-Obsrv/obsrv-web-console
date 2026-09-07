import { Chip, Paper, Stack, Typography } from '@mui/material';
import React from 'react';
import { t } from 'utils/i18n';

export interface PreviewPaneProps {
  datasetId: string | null;
}

/**
 * Preview surface shell. T11 replaces the body with `AllConfigurations` in
 * read-only mode, fed by `datasets/read` + `generate-fields`, so the preview
 * always renders server truth rather than local state.
 */
const PreviewPane: React.FC<PreviewPaneProps> = ({ datasetId }) => (
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
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="h5">{t('aiAssistant.previewTitle')}</Typography>
      <Chip
        size="small"
        label={datasetId ?? t('aiAssistant.newDatasetLabel')}
      />
    </Stack>
    <Typography variant="body2" color="text.secondary">
      {t('aiAssistant.previewEmpty')}
    </Typography>
  </Paper>
);

export default PreviewPane;
