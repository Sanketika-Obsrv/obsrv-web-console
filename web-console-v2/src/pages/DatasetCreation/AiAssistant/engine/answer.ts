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
import { ChoiceOption, MessageCard } from '../messages/types';

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

/**
 * "Right now" and "just now" say *when*, not what.
 *
 * Folded away before a decline is read, so "not right now" is the plain no
 * it plainly is — while "not right", which says the answer is wrong, keeps
 * its subject and is not read as a decline.
 */
const TIME_PHRASE = /\b(?:right|just)\s+now\b/i;

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

/**
 * A request aimed at the assistant, rather than a value for it to use.
 *
 * The name question takes whatever is typed, which is what makes it usable
 * — and what made "write me a poem about ducks" the name of a dataset.
 * Found in the browser. These are the verbs of asking someone to *do*
 * something, which no dataset is called.
 */
const ADDRESSED =
  /^(?:write|tell|show|send|give|find|search|play|fetch|translate|summari[sz]e|draw|calculate|compute|order|book|email|call up|remind)\s+(?:me|us|him|her|them|this|that|it|an?\b|the\b)/i;

/**
 * Whether this is a request aimed at the assistant rather than at the
 * dataset.
 *
 * Exported because the turn loop needs it too: found in the browser, "write
 * me a poem about ducks" at the schema question came back from the model as
 * an answer to that question, and was applied. The model is asked to answer
 * whatever is on the table, so it will always find something — deciding
 * that this is not dataset work has to happen before its answer is trusted.
 */
export const isAddressedRequest = (utterance: string): boolean =>
  ADDRESSED.test(utterance.trim());

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

/**
 * The words a confirm card offers, so a reply is read against exactly what
 * was printed — never a list of ways a user might phrase yes or no.
 * `ConfirmCard.tsx` builds its caption from this same constant, so the two
 * cannot drift apart.
 */
export const CONFIRM_LABELS = { accept: 'yes', decline: 'no' } as const;

export type OfferReply = 'accept' | 'decline';

/**
 * Whether a reply is wholly accounted for by one printed word — either the
 * reply *is* the word, or it says nothing beyond it.
 *
 * The tier where the word merely turns up among other words is deliberately
 * left out. That is the bug `readOffer` exists to fix: "no, change name to
 * telemetry" contains "no", and is not a reply to the card at all.
 */
const isBareLabel = (label: string, utterance: string): boolean => {
  const target = words(label);
  const spoken = content(utterance);

  return target.join(' ') === spoken.join(' ') || subset(spoken, target);
};

/**
 * A reply to a confirmation, read against the words the card itself
 * printed.
 *
 * Anything more than the label is not a reply to the card at all — "NO,
 * change name to telemetry" carries a rename, and reading its leading "no"
 * as a decline discarded that rename silently. Found in the browser.
 */
export const readOffer = (
  card: Extract<MessageCard, { kind: 'confirm' }>,
  utterance: string,
): OfferReply | undefined => {
  if (!card || !utterance?.trim()) return undefined;

  if (isBareLabel(CONFIRM_LABELS.accept, utterance)) return 'accept';
  if (isBareLabel(CONFIRM_LABELS.decline, utterance)) return 'decline';

  return undefined;
};

const answerToChoice = (
  options: ChoiceOption[],
  raw: string,
): Action | undefined => {
  const utterance = raw.replace(TIME_PHRASE, 'now');
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
  return undefined;
};

/**
 * A question that asks for a value in prose.
 *
 * What the value *means* is the question's own business — it supplies
 * `freeText` — so all this does is hand the reply to it. Nothing is written
 * unconfirmed from here any more: the checks that used to sit here — a
 * length cap, a trailing "?", a list of commands, a list of verbs aimed at
 * the assistant — existed only to make an unconfirmed write "safe enough" to
 * skip a yes. They were never safe, only a guess: "good morning" at the name
 * question passed every one of them and was written as the dataset's name.
 * So every prose answer is a proposal now, whatever it says — the cost of a
 * wrong guess is one more word from the user, not a write to find and undo.
 */
const answerToProse = (
  freeText: (value: string) => Action,
  utterance: string,
): AnswerToResult | undefined => {
  const said = utterance.trim();
  if (!said) return undefined;

  return { action: freeText(said), confirm: true };
};

/** What `answerTo` makes of a reply, and whether it needs a yes first. */
export interface AnswerToResult {
  action: Action;
  /** True when this reading is a guess that still needs confirming. */
  confirm?: boolean;
}

/**
 * The action a reply means, given the question on the table, and whether
 * that reading is settled enough to write without asking again.
 *
 * Returns nothing when the reply is not an answer — a question back, or an
 * instruction the question did not offer. The caller then falls back to
 * resolving it as a free-standing request, which is what keeps typing
 * anything at any time possible.
 */
export const answerTo = (
  prompt: Prompt | undefined,
  utterance: string,
): AnswerToResult | undefined => {
  if (!prompt || !utterance?.trim()) return undefined;

  const card = prompt.card;

  if (card?.kind === 'choice') {
    const action = answerToChoice(card.options, utterance);
    return action ? { action } : undefined;
  }

  if (card?.kind === 'conflict') {
    const action = answerToConflict(
      card.path,
      card.candidates
        .map((candidate) => candidate.dataType)
        .filter((dataType): dataType is DataType =>
          (DATA_TYPES as readonly string[]).includes(dataType),
        ),
      utterance,
    );
    return action ? { action } : undefined;
  }

  if (card?.kind === 'confirm') {
    // Already a yes to a card that was on screen, so nothing further needs
    // confirming — a decline, or a reply that is neither, answers nothing.
    return readOffer(card, utterance) === 'accept'
      ? { action: card.confirmAction }
      : undefined;
  }

  // Questions with no options. Two ask for a value in prose and say what to
  // do with it; the rest — the file drop, the connector form — collect their
  // own answers and have nothing to read here.
  return prompt.freeText
    ? answerToProse(prompt.freeText, utterance)
    : undefined;
};
