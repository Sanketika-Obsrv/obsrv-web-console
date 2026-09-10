/**
 * Telling data apart from an instruction.
 *
 * There is no file picker any more: a sample arrives pasted into the box or
 * dropped on the conversation. Pasting means the composer receives something
 * that is not an instruction, so it has to be recognised before the resolver
 * sees it — otherwise a JSON array is read as a sentence and refused.
 *
 * The guard is deliberately narrow. Mistaking data for an instruction costs
 * one clarifying turn; mistaking an instruction for data would hand the
 * user's words to the schema detector. So only text that *parses* as a JSON
 * object, an array of objects, or JSONL counts — an instruction that merely
 * mentions braces does not.
 */
import { parseSample } from '../messages/sampleParse';

/** How many field names a summary reads out before trailing off. */
const NAMED_FIELDS = 3;

/** True when this text is a sample rather than something said. */
export const looksLikeData = (text: string): boolean => {
  const trimmed = text.trim();

  // Cheap first: data starts with a brace. This is what keeps "dedup on
  // {order_id}" out — it is an instruction that happens to contain one.
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;

  const parsed = parseSample(trimmed);

  return parsed.ok && parsed.rows.length > 0;
};

/** Every field name the rows carry, in the order they first appear. */
const fieldsOf = (rows: Record<string, unknown>[]): string[] => {
  const seen = new Set<string>();

  rows.forEach((row) => Object.keys(row).forEach((key) => seen.add(key)));

  return [...seen];
};

/**
 * What was read, in a sentence — so the user confirms against what the
 * parser saw rather than against what they meant to paste.
 */
export const summariseSample = (rows: Record<string, unknown>[]): string => {
  const fields = fieldsOf(rows);
  const named = fields.slice(0, NAMED_FIELDS).join(', ');
  const rest = fields.length > NAMED_FIELDS ? '…' : '';

  return `${rows.length} row${rows.length === 1 ? '' : 's'} with ${
    fields.length
  } field${fields.length === 1 ? '' : 's'}${named ? ` (${named}${rest})` : ''}`;
};
