/**
 * Whether an utterance is about this dataset at all.
 *
 * The assistant does one job, and saying so is kinder than guessing: an
 * instruction about the weather should be told plainly that it cannot be
 * done here, not reported as an instruction that could not be understood.
 *
 * Deliberately generous towards dataset work. A false "yes" costs a
 * clarifying question, which is the ordinary outcome for anything unclear; a
 * false "no" tells the user their real request is impossible, which is worse.
 * So anything naming a field of the dataset, or any word this product's own
 * vocabulary uses, counts as on topic.
 */
import { FieldVocabulary } from './fieldVocabulary';

/**
 * The words the console's own dataset screens use.
 *
 * Drawn from the wizard's labels and the API's own vocabulary rather than
 * invented: these are the terms a user reading the console would reach for.
 */
const DATASET_WORDS = [
  'action',
  'allow',
  'arrival',
  'array',
  'boolean',
  'cache',
  'call',
  'change',
  'column',
  'connector',
  'data',
  'dataset',
  'date',
  'dedup',
  'dedupe',
  'denorm',
  'denormalise',
  'denormalize',
  'double',
  'drop',
  'duplicate',
  'duplicates',
  'encrypt',
  'enrich',
  'epoch',
  'event',
  'field',
  'fields',
  'file',
  'format',
  'hudi',
  'ignore',
  'index',
  'ingestion',
  'join',
  'joined',
  'json',
  'key',
  'keys',
  'lakehouse',
  'long',
  'lookup',
  'mask',
  'master',
  'name',
  'nested',
  'number',
  'object',
  'optional',
  'partition',
  'personal',
  'pii',
  'preview',
  'primary',
  'processing',
  'publish',
  'realtime',
  'redo',
  'reference',
  'reject',
  'rename',
  'required',
  'row',
  'rows',
  'sample',
  'save',
  'schema',
  'sensitive',
  'skip',
  'storage',
  'store',
  'string',
  'telemetry',
  'time',
  'timestamp',
  'transaction',
  'transform',
  'transformation',
  'type',
  'undo',
  'unique',
  'unknown',
  'upload',
  'validate',
  'validation',
] as const;

const WORDS = new Set<string>(DATASET_WORDS);

/**
 * Verbs that open an instruction.
 *
 * An attempt at an instruction is dataset work even when its object is
 * vague: "make the thing better" earns a clarifying question, not a refusal.
 * Only at the start, so "I would make a poor cricketer" is not an
 * instruction.
 */
const INSTRUCTION =
  /^(?:please\s+)?(?:make|set|change|add|remove|delete|rename|enable|disable|apply|update|turn)\b/i;

/**
 * Stems, so inflections do not each need listing.
 *
 * "Deduplication" is the word a user reading the console's own help would
 * type, and it is not "dedup" — matching the stem covers that and
 * "masking", "encryption", "partitioning" without a dictionary.
 */
const STEMS = [
  'connect',
  'dedup',
  'denorm',
  'encrypt',
  'ingest',
  'lakehouse',
  'mask',
  'partition',
  'schema',
  'storage',
  'timestamp',
  'transform',
  'valid',
];

/** `real-time` and `date-time` are two words once split, and both count. */
const tokens = (utterance: string): string[] =>
  utterance
    .toLowerCase()
    .split(/[^a-z0-9_.]+/)
    .filter(Boolean);

export const isAboutDataset = (
  utterance: string,
  vocabulary?: FieldVocabulary,
): boolean => {
  const said = tokens(utterance);
  if (said.length === 0) return false;

  if (INSTRUCTION.test(utterance.trim())) return true;
  if (said.some((word) => WORDS.has(word))) return true;
  if (said.some((word) => STEMS.some((stem) => word.startsWith(stem)))) {
    return true;
  }

  // A field of *this* dataset, named exactly. Fuzzy matching is the
  // resolver's job; here a plain mention is enough.
  const paths = (vocabulary?.entries ?? []).flatMap((entry) => [
    entry.path.toLowerCase(),
    entry.name.toLowerCase(),
  ]);

  return said.some((word) => paths.includes(word));
};
