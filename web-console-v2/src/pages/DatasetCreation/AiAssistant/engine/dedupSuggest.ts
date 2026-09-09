/**
 * Ranks dedup keys by what they would actually do to the user's sample.
 *
 * There is no server-side dedup suggestion: the wizard's picker offers every
 * eligible field with no indication of whether it is unique, so a key that
 * would silently drop rows looks identical to one that would drop none. The
 * sample the user already supplied is enough to tell them apart, and
 * `countDuplicates` is already the measurement the executor warns with — so
 * the ranking and the warning cannot disagree.
 *
 * Pure, and deliberately given the eligible paths rather than the schema: the
 * caller already computes eligibility, and this module has no business
 * deciding what a dedup key may be.
 */
import { countDuplicates } from './preflight';

export interface DedupCandidate {
  path: string;
  /** Rows that would be dropped as duplicates, out of `total`. */
  duplicates: number;
  total: number;
  /** How many different values the key took. */
  distinct: number;
  /** The name reads like an identifier, which is a hint and nothing more. */
  looksLikeId: boolean;
}

/** `order_id`, `orderId`, `id`, `uuid`, `order_key` — a hint, not evidence. */
const ID_NAME = /(^|[._])(id|ids|uuid|guid|key)$|id$/i;

/**
 * Candidates worth offering, best first.
 *
 * A key absent from any row is dropped rather than ranked last: deduplicating
 * on it discards every row that lacks it, and no ordering makes that a
 * reasonable suggestion.
 *
 * The data outranks the name. A unique `trace` beats a repeated `order_id`,
 * because the name is a guess about intent and the sample is an observation.
 */
export const dedupCandidates = (
  rows: Record<string, unknown>[],
  paths: string[],
): DedupCandidate[] => {
  if (!rows.length) return [];

  return paths
    .map((path) => {
      const { duplicates, total, distinct, missing } = countDuplicates(
        rows,
        path,
      );

      return missing > 0
        ? undefined
        : {
            path,
            duplicates,
            total,
            distinct,
            looksLikeId: ID_NAME.test(path.split('.').pop() ?? path),
          };
    })
    .filter((candidate): candidate is DedupCandidate => Boolean(candidate))
    .sort(
      (left, right) =>
        left.duplicates - right.duplicates ||
        Number(right.looksLikeId) - Number(left.looksLikeId) ||
        left.path.localeCompare(right.path),
    );
};

/**
 * The evidence for a candidate, phrased as evidence.
 *
 * Sample rows are capped, so uniqueness here is not proof about the stream —
 * "in all 4 sample rows" says what was actually checked, where "unique" alone
 * would claim more than we know.
 */
export const describeCandidate = ({
  duplicates,
  total,
}: DedupCandidate): string => {
  if (duplicates === 0) {
    return total === 1
      ? 'unique in the 1 sample row'
      : `unique in all ${total} sample rows`;
  }

  return `would drop ${duplicates} of ${total} sample rows`;
};
