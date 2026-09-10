/**
 * Reading a sample the user supplied, without sending anything.
 *
 * Lifted out of the file-drop card when that card was removed: a sample now
 * arrives by pasting it into the composer or dropping the file on the
 * conversation, and both paths need the same parsing and the same limits.
 * Nothing here touches the network — the rows are the user's own data, and
 * what happens to them is decided a turn later, once they have confirmed it.
 */
import _ from 'lodash';

/** The sample size the wizard's ingestion step accepts. */
export const MAX_SAMPLE_BYTES = 1024 * 1024;

export type ParseResult =
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
 * `FileReader` rather than `Blob.text()`: the latter is missing from jsdom,
 * and `FileReader` is available everywhere this runs.
 */
const readText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

/**
 * Reads and parses a dropped file.
 *
 * The size is checked before the read, so an enormous file is refused rather
 * than pulled into memory to be refused afterwards.
 */
export const readSampleFile = async (
  file: File,
  maxBytes: number = MAX_SAMPLE_BYTES,
): Promise<ParseResult> => {
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `That file is too large. The limit is ${Math.round(
        maxBytes / 1024 / 1024,
      )} MB.`,
    };
  }

  const parsed = parseSample(await readText(file));

  if (parsed.ok && parsed.rows.length === 0) {
    return { ok: false, error: 'That sample contains no records.' };
  }

  return parsed;
};
