/**
 * Call A — the router reading.
 *
 * Everything before this module coerced whatever was typed into an answer to
 * the question on screen, because the grammar handed to the model only had
 * words for an answer: `buildQuestionSchema` sets its `enum` to
 * `ACCEPTS[question] ∪ {clarify, goto_step}`, and constrained decoding makes
 * the rest of the alphabet unreachable. "good morning" at the name question
 * became a dataset named "good morning" for exactly this reason.
 *
 * So the model is asked twice. This file is call A: it reads one message and
 * says what *kind* of message it is — an answer, a request naming a
 * different step, a reply to a pending card, a question of the user's own,
 * or something else — before anything downstream tries to act on it. Call B
 * still uses the existing, narrower schemas in `stepSchema.ts`/`prompt.ts` to
 * extract the action itself, once the kind is known.
 *
 * Call A's grammar, prompt, few-shots and validator all live in one file,
 * deliberately. Unlike `stepSchema.ts`/`prompt.ts`, which grow a different
 * schema per step and per question, this grammar is the same five-way choice
 * at every question and every dataset width — small enough that splitting it
 * across files would only scatter one idea.
 */
import Ajv, { ValidateFunction } from 'ajv';
import { AGENDA_STEPS, AgendaStepId } from '../engine/actions';
import { DatasetFacts } from '../engine/datasetFacts';
import { Message } from '../session/types';
import { extractJson } from './modelResolver';
import { factsLine, turnDigest } from './prompt';

type JsonSchema = Record<string, unknown>;

export type RouterIntent =
  'answer' | 'request' | 'reply_to_card' | 'ask' | 'other';

/**
 * A capability the assistant declines by construction: the model picks one
 * of these four names, and the engine — not the model — owns the sentence
 * that declines it and names the console screen. That split is what makes
 * "publish it" safe to route at all: there is no free-text slot for the
 * model to write "I published it" into.
 */
export type OutOfScope = 'publish' | 'delete' | 'navigate' | 'metrics';

export interface RouterReading {
  intent: RouterIntent;
  step?: AgendaStepId;
  /** Bounded prose, `ask`/`other` only. See `REPLY_MAX_LENGTH`. */
  reply?: string;
  outOfScope?: OutOfScope;
  /** A conversation control, never the document. */
  control?: 'undo' | 'retry';
}

export interface RouterPromptInput {
  utterance: string;
  /** The agenda question on the table, when the assistant asked one. */
  question?: AgendaStepId;
  questionText?: string;
  /** The option labels the question's own card printed, if it is a choice. */
  optionLabels?: string[];
  /** The title of a confirm card still awaiting a reply, if there is one. */
  pendingCardTitle?: string;
  /**
   * The dataset's current values, when the caller has read them.
   *
   * Without this, the `ask`/`other` `reply` this same call produces has
   * nothing to be grounded in — call A used to be handed the question and
   * the words typed at it and nothing else, which is how "what is the
   * dataset id right now?" on a brand-new, empty draft came back with a
   * fabricated id. Threaded through the same way `prompt.ts`'s `buildPrompt`
   * already threads it into call B.
   */
  facts?: DatasetFacts;
  /** Prior turns, most recent last. */
  history?: Message[];
}

/**
 * The hard cap on `reply`. Enforced three ways, one of them load-bearing:
 * an advisory `maxLength` in the grammar handed to the engine (whether the
 * decoder actually compiles that keyword is not something this file can
 * verify), a decode-time token budget the caller applies to the model
 * (`engineClient.ts`), and this file's own rejection of anything over the
 * limit. The last one is the guarantee, because it does not depend on the
 * engine having honoured either of the other two.
 */
export const REPLY_MAX_LENGTH = 160;

/** How many prior turns to show. Matches `prompt.ts`'s own budget. */
const HISTORY_TURNS = 6;

/**
 * The whole of call A's grammar. Built once, used unchanged for every
 * question and every dataset — unlike `buildQuestionSchema`, nothing here
 * varies with the step, the field list or whether a draft exists, which is
 * the point: a router that grew with the dataset would defeat the reason it
 * was split from the action schema in the first place.
 */
export const ROUTER_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['intent'],
  properties: {
    intent: {
      type: 'string',
      enum: ['answer', 'request', 'reply_to_card', 'ask', 'other'],
    },
    /*
     * Deliberately not required. A schema that forced every reading to name
     * a step could not express "this turn is not about any step" — and that
     * is exactly what an `ask` or `other` turn is: a greeting, a question, a
     * request outside this console. Requiring `step` here would reintroduce,
     * one level up, the same forced-decoding failure the whole two-call
     * split exists to remove.
     */
    step: { type: 'string', enum: [...AGENDA_STEPS] },
    reply: { type: 'string', maxLength: REPLY_MAX_LENGTH },
    outOfScope: {
      type: 'string',
      enum: ['publish', 'delete', 'navigate', 'metrics'],
    },
    control: { type: 'string', enum: ['undo', 'retry'] },
  },
};

export const ROUTER_SYSTEM_PROMPT = [
  'You read one message and decide what kind of message it is, before anyone answers it.',
  'Reply with a single JSON object and nothing else.',
  '"answer" answers the question just asked; "request" names a different step; "reply_to_card" replies to a card the assistant is waiting on; "ask" is the user\'s own question; "other" is anything else, including greetings and things this console cannot do.',
  'A "reply" is at most one sentence, only for "ask" or "other".',
  'Never say anything has been changed, saved, published or deleted — producing this reply changes nothing.',
  'Only "Now:" is known, nothing else.',
].join(' ');

/**
 * One fixed few-shot list, unlike `prompt.ts`'s `EXAMPLES`.
 *
 * `EXAMPLES` is keyed by question because a bare answer means something
 * different at each one — "no" is fourteen different actions there. The five
 * classes here mean the same thing everywhere: an "answer" is an answer
 * whether the question on the table is the name or the storage choice, so
 * one list serves every turn.
 */
export const ROUTER_EXAMPLES: string[] = [
  '"call it My Orders" -> {"intent":"answer"}',
  '"good morning" -> {"intent":"other","reply":"Good morning."}',
  '"No, keep the name as telemetry" -> {"intent":"request","step":"name"}',
  '"rename it to orders_v2" -> {"intent":"request","step":"name"}',
  '"yes" -> {"intent":"reply_to_card"}',
  '"yes, and also drop duplicates on order_id" -> {"intent":"reply_to_card","step":"dedup"}',
  '"what is a master dataset?" -> {"intent":"ask","reply":"A master dataset is reference data other datasets join to."}',
  '"publish it" -> {"intent":"other","outOfScope":"publish"}',
  // Nothing known yet (no Now: line) — the reply says so rather than
  // inventing a value. Reported live: "what is the dataset id right now?"
  // on a brand-new, empty draft came back "The dataset ID is currently 42."
  '"what is the dataset id right now?" -> {"intent":"ask","reply":"There is no dataset yet — name it and add a sample first."}',
];

/** The user-side prompt: what is on the table, what was said, nothing else. */
export const buildRouterPrompt = ({
  utterance,
  question,
  questionText,
  optionLabels = [],
  pendingCardTitle,
  facts,
  history = [],
}: RouterPromptInput): string => {
  const parts: string[] = [];

  if (question && questionText) {
    parts.push(`The assistant asked: ${questionText}`);
  }

  // Read against the words the card itself printed — "the second one" is
  // only readable if those words are here to compare it with.
  if (optionLabels.length > 0) {
    parts.push(`Offered: ${optionLabels.join(', ')}.`);
  }

  if (pendingCardTitle) {
    parts.push(`Awaiting a reply to: ${pendingCardTitle}`);
  }

  /**
   * Mirrors `prompt.ts`'s `buildPrompt`, which pushes `factsLine(facts)` the
   * same way — except here, a caller that passed `facts` at all gets an
   * explicit line even when every clause `factsLine` renders is empty.
   *
   * That distinction matters only to this call: `engine/turn.ts` already
   * treats `deps.masterDatasets` being `undefined` ("not read yet")
   * differently from `[]` ("read, and genuinely empty"), and the same split
   * applies here. Silently omitting the line for a fresh, checked, empty
   * draft would look identical to a caller that never checked at all — which
   * is exactly the gap that let the router invent a fact instead of saying
   * it did not have one.
   */
  if (facts) {
    parts.push(
      factsLine(facts) ?? 'Now: nothing yet — this is a brand-new draft.',
    );
  }

  const recent = history.slice(-HISTORY_TURNS);

  if (recent.length > 0) {
    parts.push(['Recent turns:', ...recent.map(turnDigest)].join('\n'));
  }

  parts.push(['Kinds of reply:', ...ROUTER_EXAMPLES].join('\n'));
  parts.push(`Message: ${utterance}`);

  return parts.join('\n\n');
};

const ajv = new Ajv({ allErrors: true, strict: false });
const validateRouterReading: ValidateFunction = ajv.compile(ROUTER_SCHEMA);

/**
 * Turns call A's raw reply into a `RouterReading`, or `undefined` if it
 * cannot be trusted.
 *
 * Everything the model produces here is untrusted input, the same posture
 * `resolveWithModel` takes with call B: it must parse as JSON, it must
 * validate against `ROUTER_SCHEMA`, and a `reply` over `REPLY_MAX_LENGTH` is
 * discarded outright rather than cut down to size — there is a standing rule
 * against slicing user-facing text, and a truncated sentence can change what
 * it claims.
 */
export const readRouterReply = (raw: string): RouterReading | undefined => {
  const parsed = extractJson(raw);
  if (!parsed) return undefined;

  if (!validateRouterReading(parsed)) return undefined;

  const reading = parsed as RouterReading;

  // Belt-and-braces: `maxLength` above is already checked by ajv, but the
  // guarantee this file makes does not want to depend on the schema having
  // been written correctly — the length is re-checked directly.
  if (
    typeof reading.reply === 'string' &&
    reading.reply.length > REPLY_MAX_LENGTH
  ) {
    return undefined;
  }

  // Belt-and-braces again: the schema's own `enum` already restricts `step`
  // to `AGENDA_STEPS`, but this does not rely on the schema staying in sync
  // with the enum it was built from.
  if (
    reading.step !== undefined &&
    !(AGENDA_STEPS as readonly string[]).includes(reading.step)
  ) {
    return undefined;
  }

  return reading;
};
