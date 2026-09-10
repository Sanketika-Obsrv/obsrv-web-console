/**
 * The examples offered under the composer when no question is on the table.
 *
 * Built from the dataset in hand. They used to be a fixed list written
 * against the probe dataset of this build, so every dataset was told it
 * could say "dedup on order_id" — reported by the user, whose datasets have
 * no such field. An example naming a field that does not exist is worse than
 * no example: it teaches a sentence the assistant will refuse.
 */
import { FieldVocabulary } from './engine/fieldVocabulary';

/** Offered before there is a dataset to talk about. */
export const OPENING_SUGGESTIONS = ['call it My Orders', "it's event data"];

/**
 * Always offered: an undo nobody knows about is not a safety net, and the
 * way to finish should never be hidden.
 */
const ALWAYS = ['undo that', 'save it'];

export const fallbackSuggestions = (vocabulary: FieldVocabulary): string[] => {
  // A top-level leaf reads best in a chip; a nested path looks like a typo.
  const example = vocabulary.entries.find(
    (entry) => entry.isLeaf && entry.depth === 1,
  )?.path;

  return [
    ...(example ? [`make ${example} required`, `dedup on ${example}`] : []),
    'enable the real-time store',
    ...ALWAYS,
  ];
};
