/**
 * What the dataset already says, read back at the start.
 *
 * Opening a dataset the conversation did not build, the agenda has nothing
 * to ask — the document answers its questions — so the first turn has to
 * establish what is there. Not as a substitute for the preview, which shows
 * the whole document beside the chat, but as the shared ground an
 * instruction needs: "make it required" means nothing until both sides know
 * which fields exist.
 *
 * Everything here comes from the document. Nothing is inferred, so the recap
 * cannot promise a setting the server does not hold.
 */
import { DatasetSnapshot } from './executor';
import { outstandingWork } from './finalCheck';

const block = (
  dataset: DatasetSnapshot,
  key: string,
): Record<string, unknown> => (dataset[key] ?? {}) as Record<string, unknown>;

/** `a`, `a and b`, `a, b and c`. */
const join = (phrases: string[]): string =>
  phrases.length < 2
    ? (phrases[0] ?? '')
    : `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;

/** The settings the document holds, in the words the questions used. */
const settings = (dataset: DatasetSnapshot): string[] => {
  const indexing = (block(dataset, 'dataset_config').indexing_config ??
    {}) as Record<string, boolean>;
  const dedup = block(dataset, 'dedup_config');
  const validation = block(dataset, 'validation_config');
  const transformations = (dataset.transformations_config ?? []) as unknown[];
  const denorm = (block(dataset, 'denorm_config').denorm_fields ??
    []) as unknown[];

  const stores = [
    indexing.olap_store_enabled && 'the real-time store',
    indexing.lakehouse_enabled && 'the lakehouse',
    indexing.cache_enabled && 'the cache',
  ].filter(Boolean) as string[];

  return [
    ...(stores.length ? [`${join(stores)} on`] : []),
    ...(dedup.drop_duplicates
      ? [`dedup on ${String(dedup.dedup_key ?? 'a key')}`]
      : []),
    ...(validation.mode ? [`${String(validation.mode)} validation`] : []),
    ...(transformations.length
      ? [
          `${transformations.length} transformation${
            transformations.length === 1 ? '' : 's'
          }`,
        ]
      : []),
    ...(denorm.length
      ? [`${denorm.length} join${denorm.length === 1 ? '' : 's'}`]
      : []),
  ];
};

export interface RecapContext {
  /**
   * True when a live copy of this dataset exists.
   *
   * It cannot be read off the document: a `mode=edit` read returns the
   * *draft copy*, whose own status is "Draft", so from here a live dataset
   * looks exactly like a draft. Found in the browser, where a live dataset
   * was called a draft and the caveat that matters most never fired.
   */
  liveElsewhere?: boolean;
}

/**
 * The live-dataset caveat.
 *
 * A live dataset is edited through the draft copy the API makes on a
 * `mode=edit` read, and it stays live and unchanged until someone
 * republishes it — which the assistant deliberately does not do. Saying so
 * once, at the start, is the difference between a change that looks lost and
 * one that is understood.
 */
const liveCaveat = (context: RecapContext): string =>
  context.liveElsewhere
    ? ' It is live, so my changes go to a draft copy and take effect only when it is republished — from the dataset list or the wizard.'
    : '';

export const recap = (
  dataset?: DatasetSnapshot,
  context: RecapContext = {},
): string => {
  if (!dataset) return '';

  const name = String(dataset.name ?? dataset.dataset_id ?? 'This dataset');
  const kind = dataset.type ? `${String(dataset.type)} data` : 'unknown type';
  const status = context.liveElsewhere
    ? 'live'
    : String(dataset.status ?? 'Draft').toLowerCase();

  const opening = `${name} — ${kind}, ${status}.`;

  if (!dataset.data_schema) {
    return `${opening} There is no schema yet, so no sample has been read.${liveCaveat(
      context,
    )}`;
  }

  const fields = Object.keys(
    (dataset.data_schema.properties ?? {}) as Record<string, unknown>,
  ).length;
  const held = settings(dataset);
  const has = `${fields} field${fields === 1 ? '' : 's'}${
    held.length ? `, ${join(held)}` : ''
  }.`;

  const work = outstandingWork(dataset);
  const missing = work.length ? ` Still outstanding: ${join(work)}.` : '';

  return `${opening} ${has}${missing}${liveCaveat(context)}`;
};
