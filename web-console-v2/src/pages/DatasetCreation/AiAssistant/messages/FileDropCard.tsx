import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import _ from 'lodash';
import React, { useState } from 'react';

/** The sample size the wizard's ingestion step accepts. */
export const MAX_SAMPLE_BYTES = 1024 * 1024;

export interface FileDropCardProps {
  /** Receives the parsed rows and the file to upload. */
  onRows: (rows: Record<string, unknown>[], file: File) => void;
  prompt?: string;
  maxBytes?: number;
}

type ParseResult =
  { ok: true; rows: Record<string, unknown>[] } | { ok: false; error: string };

const NOT_JSON = 'Could not read that as JSON.';

/**
 * Parses a sample as JSON, then as JSONL.
 *
 * Both are accepted because both are what the wizard accepts. A JSONL file is
 * not valid JSON, so it is only recognised on the second attempt.
 */
export const parseSample = (text: string): ParseResult => {
  const asRows = (value: unknown): Record<string, unknown>[] | null => {
    if (Array.isArray(value)) {
      return value.filter((row) => _.isPlainObject(row)) as Record<
        string,
        unknown
      >[];
    }
    return _.isPlainObject(value) ? [value as Record<string, unknown>] : null;
  };

  try {
    const rows = asRows(JSON.parse(text));
    if (rows) return { ok: true, rows };
  } catch {
    // Not a single JSON document; try line-delimited below.
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return { ok: false, error: NOT_JSON };

  const rows: Record<string, unknown>[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (!_.isPlainObject(parsed)) return { ok: false, error: NOT_JSON };
      rows.push(parsed as Record<string, unknown>);
    } catch {
      return { ok: false, error: NOT_JSON };
    }
  }

  return { ok: true, rows };
};

/**
 * Reads a file as text.
 *
 * `FileReader` rather than `Blob.text()`: the latter is missing from jsdom, and
 * `FileReader` is available everywhere this runs.
 */
const readText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

/**
 * Sample upload inside the conversation.
 *
 * Pasting is a first-class path rather than a fallback, matching the wizard's
 * ingestion step. Both paths end in a `File`, because the API takes an upload
 * either way.
 */
const FileDropCard: React.FC<FileDropCardProps> = ({
  onRows,
  prompt,
  maxBytes = MAX_SAMPLE_BYTES,
}) => {
  const [error, setError] = useState<string>();
  const [pasted, setPasted] = useState('');

  const accept = (text: string, file: File) => {
    const parsed = parseSample(text);

    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    if (parsed.rows.length === 0) {
      setError('That sample contains no records.');
      return;
    }

    setError(undefined);
    onRows(parsed.rows, file);
  };

  const onFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxBytes) {
      setError(
        `That file is too large. The limit is ${Math.round(
          maxBytes / 1024 / 1024,
        )} MB.`,
      );
      return;
    }

    accept(await readText(file), file);
  };

  const usePasted = () =>
    accept(
      pasted,
      new File([pasted], 'pasted-sample.json', {
        type: 'application/json',
      }),
    );

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1}>
        <Typography variant="body2">
          {prompt ?? 'Add a sample so the schema can be detected.'}
        </Typography>
        <Typography variant="caption" component="span" color="text.secondary">
          {`JSON or JSONL, up to ${Math.round(maxBytes / 1024 / 1024)} MB.`}
        </Typography>

        <Button component="label" size="small" variant="outlined">
          Choose a file
          <input
            hidden
            type="file"
            aria-label="Choose a sample file"
            accept=".json,.jsonl,application/json"
            onChange={onFileChosen}
          />
        </Button>

        <TextField
          multiline
          minRows={2}
          size="small"
          label="Paste JSON"
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
        />
        <Button
          size="small"
          variant="text"
          disabled={pasted.trim().length === 0}
          onClick={usePasted}
          sx={{ alignSelf: 'flex-start' }}
        >
          Use this
        </Button>

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Paper>
  );
};

export default FileDropCard;
