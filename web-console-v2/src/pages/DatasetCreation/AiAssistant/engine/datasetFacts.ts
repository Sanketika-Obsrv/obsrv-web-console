/**
 * What the document currently says, boiled down for the model.
 *
 * The prompt has never told the model the dataset's own values — only the
 * question being asked and the sentence typed at it — so "why is the id
 * still the old one" or "leave the name as telemetry" had nothing to be
 * read against. This module is the one place that turns `AgendaState` into
 * a small, named set of facts, read the same way `recap.ts` and
 * `finalCheck.ts` read it: through the document, never through a guess.
 *
 * Reading only `AgendaState.dataset`/`.pending` is what stops the model
 * being handed a setting the server does not actually hold — there is no
 * other path in, so a fact reported here is a fact the document reported
 * first.
 */
import { DatasetDiffGroup, DatasetDiffResult } from 'services/datasetApi';
import { Action } from './actions';
import { AgendaState } from './agenda';

export interface DatasetFacts {
  datasetId?: string;
  name?: string;
  datasetType?: string;
  stores: { realtime: boolean; lakehouse: boolean; cache: boolean };
  keys: { timestamp?: string; primary?: string; partition?: string };
  dedup?: { enabled: boolean; key?: string };
  fieldCount: number;
  hasDraft: boolean;
  /**
   * Added, Modified and Deleted field counts — what a Live dataset's pending
   * draft would change if republished right now, read from the same
   * live-vs-draft diff `PreviewSummary.tsx`'s "Summary of changes" tab reads
   * (`GET /api/dataset/diff/:id`). Absent, never zero, for a dataset that has
   * never been Live (there is nothing to diff against) or one with nothing
   * pending — the model must not be handed a comparison that was never run.
   */
  liveDiff?: { additions: number; modifications: number; deletions: number };
}

/** The same accessor `agenda.ts`, `recap.ts` and `finalCheck.ts` each use. */
const block = (state: AgendaState, key: string): Record<string, unknown> =>
  (state.dataset?.[key] ?? {}) as Record<string, unknown>;

/** Narrows an unknown document value to a string, or nothing. */
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

/**
 * How many individual changes one diff group holds.
 *
 * Mirrors `PreviewSummary.tsx`'s own `transform`: a group expands into one
 * row per `items` entry, plus one more when it carries a bare `value` — the
 * same truthy check that function uses, so a falsy `value` (never sent by
 * the API for a real change) is not miscounted as one. Counted here rather
 * than re-derived from the schema, so this can never disagree with the
 * table the wizard itself renders from the same response.
 */
const countGroup = (group: DatasetDiffGroup): number =>
  (group.items?.length ?? 0) + (group.value ? 1 : 0);

const countGroups = (groups?: DatasetDiffGroup[]): number =>
  (groups ?? []).reduce((total, group) => total + countGroup(group), 0);

/**
 * The Added/Modified/Deleted counts, from the raw diff response — present
 * only once there is at least one real change to report. A dataset that was
 * never Live has no `liveDiff` on the state at all (see `AgendaState`'s own
 * doc), and a Live dataset with nothing pending has one whose three counts
 * are all zero; both cases end up absent here, which is the point: an
 * all-zero diff and a diff that was never computed must read identically to
 * the model — as nothing to report.
 */
const liveDiffFacts = (diff?: DatasetDiffResult): DatasetFacts['liveDiff'] => {
  if (!diff) return undefined;

  const counts = {
    additions: countGroups(diff.additions),
    modifications: countGroups(diff.modifications),
    deletions: countGroups(diff.deletions),
  };

  const hasPending =
    counts.additions + counts.modifications + counts.deletions > 0;

  return hasPending ? counts : undefined;
};

export const datasetFacts = (state: AgendaState): DatasetFacts => {
  const indexing = block(state, 'dataset_config').indexing_config as
    Record<string, boolean> | undefined;
  const keys = block(state, 'dataset_config').keys_config as
    Record<string, string> | undefined;
  const dedupConfig = block(state, 'dedup_config');
  const properties = state.dataset?.data_schema?.properties as
    Record<string, unknown> | undefined;
  const liveDiff = liveDiffFacts(state.liveDiff);

  return {
    // Read only from the committed document, never from `pending`: the id
    // is not fixed until `datasets/create` has run, so an id proposed before
    // then is not yet the immutable one the name question can be asked about.
    datasetId: state.dataset?.dataset_id,
    name: asString(state.dataset?.name) ?? state.pending?.name,
    datasetType: asString(state.dataset?.type) ?? state.pending?.datasetType,
    stores: {
      realtime: Boolean(indexing?.olap_store_enabled),
      lakehouse: Boolean(indexing?.lakehouse_enabled),
      cache: Boolean(indexing?.cache_enabled),
    },
    keys: {
      timestamp: asString(keys?.timestamp_key),
      primary: asString(keys?.data_key),
      partition: asString(keys?.partition_key),
    },
    // Absent until the draft exists: before that there is no `dedup_config`
    // to read, and reporting `enabled: false` would claim a decision nobody
    // has had the chance to make either way.
    ...(state.dataset
      ? {
          dedup: {
            enabled: dedupConfig.drop_duplicates === true,
            ...(asString(dedupConfig.dedup_key)
              ? { key: asString(dedupConfig.dedup_key) }
              : {}),
          },
        }
      : {}),
    fieldCount: Object.keys(properties ?? {}).length,
    hasDraft: Boolean(state.dataset?.dataset_id),
    ...(liveDiff ? { liveDiff } : {}),
  };
};

/**
 * True when an action asks for the value the document already holds.
 *
 * A rename to the name already on the document, or a storage change that
 * only repeats the flags already set, would be a PATCH that changes
 * nothing — this is what lets a later caller recognise that and skip the
 * round trip instead of running it. General on purpose: an action kind with
 * no matching fact (most of them, for now) simply is not a no-op by this
 * reading, so it returns `false` rather than guessing.
 */
export const alreadySatisfied = (
  action: Action,
  facts: DatasetFacts,
): boolean => {
  switch (action.kind) {
    case 'set_dataset_name':
      return facts.name !== undefined && action.name === facts.name;

    case 'set_storage':
      return (
        (action.realtime === undefined ||
          action.realtime === facts.stores.realtime) &&
        (action.lakehouse === undefined ||
          action.lakehouse === facts.stores.lakehouse) &&
        (action.cache === undefined || action.cache === facts.stores.cache)
      );

    case 'set_dedup': {
      if (!facts.dedup) return false;
      if (action.enabled !== facts.dedup.enabled) return false;

      // Disabling dedup is a no-op regardless of which key was named, since
      // there is nothing left for the key to qualify once it is off.
      return action.enabled && action.key !== undefined
        ? action.key === facts.dedup.key
        : true;
    }

    default:
      return false;
  }
};
