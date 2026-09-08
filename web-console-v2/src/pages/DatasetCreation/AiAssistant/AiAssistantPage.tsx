import { Box } from '@mui/material';
import React from 'react';
import { useParams } from 'react-router-dom';
import { t } from 'utils/i18n';
import ChatPane from './ChatPane';
import PreviewPane from './PreviewPane';
import SplitLayout from './SplitLayout';
import { usePreviewFocus } from './usePreviewFocus';

/** Route placeholder used before `datasets/create` has run. */
export const NEW_DATASET_PARAM = '<new>';

/**
 * Entry point for the conversational dataset flow.
 *
 * The assistant coordinates the existing dataset APIs; the server stays the
 * source of truth and the preview renders whatever the last read returned.
 */
const AiAssistantPage: React.FC = () => {
  const { datasetId: datasetIdParam } = useParams<{ datasetId: string }>();
  const datasetId =
    !datasetIdParam || datasetIdParam === NEW_DATASET_PARAM
      ? null
      : datasetIdParam;

  const { focusSection, changedRefs, recordAction } = usePreviewFocus();

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 8rem)',
        minHeight: '30rem',
      }}
    >
      <SplitLayout
        leftLabel={t('aiAssistant.chatPaneLabel')}
        rightLabel={t('aiAssistant.previewPaneLabel')}
        separatorLabel={t('aiAssistant.separatorLabel')}
        left={
          <ChatPane datasetId={datasetId} onActionExecuted={recordAction} />
        }
        right={
          <PreviewPane
            datasetId={datasetId}
            focusSection={focusSection}
            changedRefs={changedRefs}
          />
        }
      />
    </Box>
  );
};

export default AiAssistantPage;
