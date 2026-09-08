import { Box } from '@mui/material';
import React from 'react';
import { useParams } from 'react-router-dom';
import { t } from 'utils/i18n';
import ChatPane from './ChatPane';
import PreviewPane from './PreviewPane';
import SplitLayout from './SplitLayout';
import { useAssistant } from './useAssistant';

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

  const assistant = useAssistant(datasetId);

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
          <ChatPane
            datasetId={assistant.datasetId}
            messages={assistant.messages}
            loading={assistant.loading}
            persisting={assistant.persisting}
            resumable={assistant.resumable}
            currentSessionId={assistant.currentSessionId}
            onClearSession={assistant.clearSession}
            onAction={assistant.dispatch}
            onSampleRows={assistant.attachSample}
            onSubmitSecrets={assistant.submitSecrets}
            onSend={assistant.send}
            busy={assistant.busy}
            suggestions={assistant.suggestions}
          />
        }
        right={
          <PreviewPane
            datasetId={assistant.datasetId}
            focusSection={assistant.focusSection}
            changedRefs={assistant.changedRefs}
          />
        }
      />
    </Box>
  );
};

export default AiAssistantPage;
