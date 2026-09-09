/**
 * Reads a typed reply as an answer to the question that was just asked.
 *
 * This is the other half of the agenda. Asking narrows what the user is
 * likely to say; this narrows what has to be understood. A reply is matched
 * against the options the question itself offered, so the vocabulary is the
 * question's own — "mask it", "lakehouse", "order_ts" — rather than the whole
 * action surface. Nothing is inferred: an answer that matches one offered
 * option is that option, and anything else is handed on to the resolver.
 *
 * Because the match comes from the offered options, an answer needs no
 * confirming. Clicking "Mask it" and typing "mask it" are the same decision,
 * and asking the user to confirm the second would be asking them to say the
 * same thing twice.
 */
import { Action, DATA_TYPES, DataType } from './actions';
import { Prompt } from './agenda';
import { ChoiceOption } from '../messages/types';

/** Words that carry no choice, so they are ignored when comparing. */
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'do',
  'for',
  'i',
  'in',
  'is',
  'it',
  'its',
  'lets',
  'make',
  'me',
  'my',
  'of',
  'on',
  'one',
  'or',
  'please',
  'pick',
  'that',
  'thanks',
  'the',
  'them',
  'then',
  'this',
  'to',
  'use',
  'want',
  'with',
  'you',
]);

/**
 * A reply that declines.
 *
 * Anchored at the start: "no" declines, but "drop them, no duplicates" is an
 * instruction that happens to contain the word.
 */
const DECLINES =
  /^(?:no|nope|nah|none|not now|not yet|not really|skip|leave|later|keep)\b/i;

/**
 * A reply that says no to something in particular.
 *
 * "No" declines. "No duplicates" is the opposite of "keep duplicates" — a
 * negation with a subject is an instruction, and reading it as a decline
 * would keep exactly what the user asked to be rid of. So a negation is only
 * taken as a decline when it carries no subject.
 */
const NEGATES = /^(?:no|not|none|nope|nah|don'?t|do not|never)\b/i;

/** Words a bare decline is made of, so anything else counts as a subject. */
const DECLINE_WORDS = new Set([
  'dont',
  'later',
  'leave',
  'never',
  'no',
  'nah',
  'none',
  'nope',
  'not',
  'now',
  'really',
  'skip',
  'yet',
]);

const AFFIRMS =
  /^(?:yes|yeah|yep|yup|ok|okay|sure|do it|go ahead|go on|please do|save|publish|confirm|proceed|looks? (?:right|good)|that'?s right)\b/i;

/**
 * Replies at the name question that are not names.
 *
 * The name question is the one place a whole utterance is taken as a value,
 * which makes it the one place a command has to be let past — otherwise
 * "undo" names the dataset "undo".
 */
const COMMANDS =
  /^(?:undo|revert|redo|help|why|what|which|how|when|who|explain|tell me|start over|cancel|stop|quit|wait|back|go back|nevermind|never mind|save|publish)\b/i;

/** How people preface a name. */
const NAME_PREFIX =
  /^(?:(?:let'?s|lets|we(?:'ll| will)?|i(?:'d| would)? like to|please)\s+)?(?:call|name)\s+(?:it|this|the dataset)\s+/i;

const NAME_SUFFIX = /\s*(?:please|thanks|thank you)\s*[.!]?$/i;

const MAX_NAME = 100;

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9_.]+/)
    .filter(Boolean);

const content = (text: string): string[] =>
  words(text).filter((word) => !STOPWORDS.has(word));

const subset = (inner: string[], outer: string[]): boolean =>
  inner.length > 0 && inner.every((word) => outer.includes(word));

/** Every string an action carries, so a bare field name can match its option. */
const values = (action: Action): string[] =>
  Object.entries(action)
    .filter(([key, value]) => key !== 'kind' && typeof value === 'string')
    .map(([, value]) => (value as string).toLowerCase());

/**
 * How well one option answers the reply.
 *
 * 3 is "the reply is the option"; 2 is "the reply contains what makes this
 * option distinct"; 1 is "the reply says nothing this option does not".
 * A tie at the top scores nothing, because a reply that names two options is
 * a question back rather than an answer.
 */
/** The reply *is* the option, spelled out. */
const EXACT = 3;

const score = (
  option: ChoiceOption,
  said: string[],
  raw: string,
  distinctive: (word: string) => boolean,
): number => {
  const label = words(option.label);
  const spoken = content(raw);

  if (label.join(' ') === spoken.join(' ')) return EXACT;
  if (values(option.action).includes(raw.trim().toLowerCase())) return EXACT;

  if (subset(label, said)) return 2;
  if (spoken.some((word) => label.includes(word) && distinctive(word)))
    return 2;
  if (subset(spoken, label)) return 1;

  return 0;
};

const bestOption = (
  options: ChoiceOption[],
  utterance: string,
): { option: ChoiceOption; points: number } | undefined => {
  const said = words(utterance);

  // A word that appears in more than one label cannot pick between them.
  const counts = new Map<string, number>();
  for (const option of options) {
    for (const word of new Set(words(option.label))) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  const distinctive = (word: string) =>
    word.length >= 3 && !STOPWORDS.has(word) && counts.get(word) === 1;

  const scored = options.map((option) => ({
    option,
    points: score(option, said, utterance, distinctive),
  }));

  const top = Math.max(...scored.map((entry) => entry.points));
  if (top === 0) return undefined;

  const winners = scored.filter((entry) => entry.points === top);

  return winners.length === 1 ? winners[0] : undefined;
};

/** The option that declines, when exactly one does. */
const declining = (options: ChoiceOption[]): ChoiceOption | undefined => {
  const skips = options.filter(
    (option) =>
      option.action.kind === 'skip_step' ||
      option.action.kind === 'skip_connector',
  );

  return skips.length === 1 ? skips[0] : undefined;
};

/** Whether a reply is a plain "no" rather than a no to something. */
const bareDecline = (utterance: string): boolean =>
  NEGATES.test(utterance.trim()) &&
  content(utterance).every((word) => DECLINE_WORDS.has(word));

const answerToChoice = (
  options: ChoiceOption[],
  utterance: string,
): Action | undefined => {
  const matched = bestOption(options, utterance);

  // An option said in full is that option, whatever else the words look
  // like: "No transformations" is a label, not a negation to be second-
  // guessed. Found by the end-to-end walkthrough, which asked the same
  // question twenty times running.
  if (matched?.points === EXACT) return matched.option.action;

  if (NEGATES.test(utterance.trim()) && !bareDecline(utterance)) {
    return undefined;
  }

  if (matched) return matched.option.action;

  // "No" answers a question that offered a way out, and answers nothing
  // otherwise — a decline the question never offered is not ours to invent.
  return DECLINES.test(utterance.trim())
    ? declining(options)?.action
    : undefined;
};

const answerToConflict = (
  path: string,
  candidates: DataType[],
  utterance: string,
): Action | undefined => {
  const said = words(utterance);
  const named = candidates.filter(
    (dataType) =>
      // `date-time` is two words once tokenised, so the whole reply is searched
      // for the type's own spelling rather than compared token by token.
      said.includes(dataType) || utterance.toLowerCase().includes(dataType),
  );

  if (named.length === 1) {
    return {
      kind: 'resolve_conflict',
      path,
      mode: 'apply',
      dataType: named[0],
    };
  }

  // Only offered candidates are honoured. A type the sample never held would
  // narrow values the user actually has, which is the one thing the conflict
  // question exists to prevent.
  if (named.length > 1) return undefined;

  /**
   * Dismissing is a write — it marks the conflict resolved with whatever type
   * the API already chose — so it takes saying so. A plain "no" is not an
   * answer to "which should it be?", and treating it as one would settle the
   * field's type on the user's behalf.
   */
  return /^(?:keep|leave|dismiss)\b/i.test(utterance.trim()) ||
    /current type|as it is|as is|unchanged/i.test(utterance)
    ? { kind: 'resolve_conflict', path, mode: 'dismiss' }
    : undefined;
};

const answerToName = (utterance: string): Action | undefined => {
  const said = utterance.trim();
  if (!said || said.length > MAX_NAME || said.endsWith('?')) return undefined;
  if (COMMANDS.test(said)) return undefined;

  const name = said.replace(NAME_PREFIX, '').replace(NAME_SUFFIX, '').trim();

  return name ? { kind: 'set_dataset_name', name } : undefined;
};

/**
 * The action a reply means, given the question on the table.
 *
 * Returns nothing when the reply is not an answer — a command, a question
 * back, or an instruction the question did not offer. The caller then falls
 * back to resolving it as a free-standing request, which is what keeps
 * typing anything at any time possible.
 */
export const answerTo = (
  prompt: Prompt | undefined,
  utterance: string,
): Action | undefined => {
  if (!prompt || !utterance?.trim()) return undefined;

  const card = prompt.card;

  if (card?.kind === 'choice') return answerToChoice(card.options, utterance);

  if (card?.kind === 'conflict') {
    return answerToConflict(
      card.path,
      card.candidates
        .map((candidate) => candidate.dataType)
        .filter((dataType): dataType is DataType =>
          (DATA_TYPES as readonly string[]).includes(dataType),
        ),
      utterance,
    );
  }

  if (card?.kind === 'confirm') {
    return AFFIRMS.test(utterance.trim()) ? card.confirmAction : undefined;
  }

  // Questions with no options: only the name asks for a value in prose. A
  // file cannot be typed, and the connector form collects its own values.
  return prompt.step === 'name' ? answerToName(utterance) : undefined;
};
