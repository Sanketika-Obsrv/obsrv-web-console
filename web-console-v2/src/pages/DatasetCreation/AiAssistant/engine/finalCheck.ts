/**
 * The closing read.
 *
 * The assistant does not publish: making a dataset live happens from the
 * dataset list or from the wizard's preview, which is where the console has
 * always done it and where the confirmation the user expects lives. So "save
 * it" is not a write — every change went to the server as it was made — but
 * it is not nothing either. It is the one moment worth reading the document
 * back and saying what is still unset, because that is the only thing the
 * preview cannot tell the user at a glance.
 *
 * Everything reported here is derived from the document, so the check cannot
 * claim a problem the server does not have.
 */
import { DatasetSnapshot } from './executor';
import { unresolvedConflicts } from './schemaEditor';

const block = (
  dataset: DatasetSnapshot,
  key: string,
): Record<string, unknown> => (dataset[key] ?? {}) as Record<string, unknown>;

/**
 * What is still unset or unresolved, in the words the questions used.
 *
 * The key rules are the wizard's own: the real-time store partitions by
 * time, and the lakehouse partitions by a field and identifies a record by
 * one. A dataset that reached the end without them is one the wizard would
 * refuse to build.
 */
export const outstandingWork = (dataset?: DatasetSnapshot): string[] => {
  if (!dataset) return [];

  const work: string[] = [];

  if (!dataset.name) work.push('it has no name');
  if (!dataset.type) work.push('nothing says what kind of data it holds');

  if (!dataset.data_schema) {
    work.push('there is no schema yet, so no sample has been read');
    return work;
  }

  const conflicted = unresolvedConflicts(dataset.data_schema);

  if (conflicted.length) {
    work.push(
      `${conflicted.join(', ')} still ${
        conflicted.length === 1 ? 'has' : 'have'
      } more than one type`,
    );
  }

  const indexing = block(dataset, 'dataset_config').indexing_config as
    Record<string, boolean> | undefined;
  const keys = (block(dataset, 'dataset_config').keys_config ?? {}) as Record<
    string,
    string
  >;

  const realtime = Boolean(indexing?.olap_store_enabled);
  const lakehouse = Boolean(indexing?.lakehouse_enabled);
  const cache = Boolean(indexing?.cache_enabled);

  if (!realtime && !lakehouse && !cache) {
    work.push('no store is switched on, so nothing would be queryable');
  }

  if (realtime && !keys.timestamp_key) {
    work.push('the real-time store has no timestamp field');
  }

  if ((lakehouse || cache) && !keys.data_key) {
    work.push('no field identifies a record');
  }

  if (lakehouse && !keys.partition_key) {
    work.push('the lakehouse has no partition field');
  }

  return work;
};
