import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AllConfigurations from 'pages/DatasetCreation/PreviewAndSave/AllConfigurations';
import React, { useEffect, useState } from 'react';
import { datasetConfigStatus, useFetchDatasetsById } from 'services/dataset';
import { Dataset } from 'types/dataset';
import { DatasetStatus } from 'types/datasets';
import { t } from 'utils/i18n';
import { PreviewSection } from './engine/previewFocus';

/** How long a change stays highlighted before the flash fades. */
export const DEFAULT_HIGHLIGHT_MS = 4000;

export interface PreviewPaneProps {
  datasetId: string | null;
  /** Accordion to open — the section the assistant's last action touched. */
  focusSection?: PreviewSection;
  /** JSON Schema refs the last action changed, flashed in the schema table. */
  changedRefs?: string[];
  highlightMs?: number;
}

/**
 * Fields the progress report needs. Kept identical to the projection
 * `AllConfigurations` requests so both share one React Query entry rather than
 * reading the dataset twice.
 */
const PREVIEW_FIELDS = [
  'dataset_id',
  'name',
  'data_schema',
  'validation_config',
  'dedup_config',
  'denorm_config',
  'dataset_config',
  'type',
  'connectors_config',
  'transformations_config',
];

const STEP_LABELS = ['Connectors', 'Ingestion', 'Processing', 'Storage'];

/**
 * Progress is computed by `datasetConfigStatus`, the same function the dataset
 * list uses, so the conversational flow and the wizard can never disagree
 * about how far along a draft is.
 */
const ProgressSummary: React.FC<{ dataset?: Dataset }> = ({ dataset }) => {
  const status = dataset
    ? datasetConfigStatus(dataset)
    : {
        isConnectorFilled: false,
        isIngestionFilled: false,
        isProcessingFilled: false,
        isStorageFilled: false,
        progress: 0,
      };

  const filled = [
    status.isConnectorFilled,
    status.isIngestionFilled,
    status.isProcessingFilled,
    status.isStorageFilled,
  ];

  return (
    <Box>
      <FormGroup row>
        {STEP_LABELS.map((label, index) => (
          <FormControlLabel
            key={label}
            label={label}
            control={
              <Checkbox
                size="small"
                disabled
                checked={filled[index]}
                inputProps={{ 'aria-label': label }}
              />
            }
          />
        ))}
      </FormGroup>
      <LinearProgress
        variant="determinate"
        value={Math.round(status.progress)}
        aria-label={t('aiAssistant.progressLabel')}
      />
    </Box>
  );
};

/**
 * The preview surface.
 *
 * Everything here is server truth: the dataset comes from `datasets/read` and
 * the schema table from `generate-fields`, exactly as the wizard's own preview
 * step does. The assistant only says *where to look* — which accordion to open
 * and which rows just changed — never what the values are.
 */
const PreviewPane: React.FC<PreviewPaneProps> = ({
  datasetId,
  focusSection,
  changedRefs,
  highlightMs = DEFAULT_HIGHLIGHT_MS,
}) => {
  const [highlighted, setHighlighted] = useState<string[] | undefined>(
    changedRefs,
  );

  // The highlight is a flash: it marks what just changed, then clears so the
  // next change is the only thing standing out.
  useEffect(() => {
    setHighlighted(changedRefs);

    if (!changedRefs?.length) return undefined;

    const timer = setTimeout(() => setHighlighted([]), highlightMs);
    return () => clearTimeout(timer);
  }, [changedRefs, highlightMs]);

  const response = useFetchDatasetsById({
    datasetId: datasetId ?? '',
    queryParams: `status=${DatasetStatus.Draft}&fields=${PREVIEW_FIELDS}&mode=edit`,
  });

  return (
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

      {datasetId ? (
        <>
          <ProgressSummary dataset={response.data} />
          <AllConfigurations
            datasetId={datasetId}
            status={DatasetStatus.Draft}
            focusSection={focusSection}
            changedRefs={highlighted}
          />
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('aiAssistant.previewEmpty')}
        </Typography>
      )}
    </Paper>
  );
};

export default PreviewPane;
