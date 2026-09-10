/**
 * Resolves an utterance with the model, falling back to the rules.
 *
 * Returns the same `Resolution` the rule resolver returns, so the turn loop
 * cannot tell which tier answered. That is the point: the model is an
 * upgrade to one step of the pipeline, not a different pipeline.
 *
 * Everything the model produces is treated as untrusted input:
 *
 * 1. The reply must parse as JSON.
 * 2. It must validate against the step's action schema.
 * 3. Any field path it names is resolved by `resolveField`, so an invented
 *    name becomes a clarifying question rather than a write.
 *
 * If any of that fails, the rules answer instead. A 0.6B model that produces
 * nothing useful should be invisible, not fatal.
 */
import {
  Action,
  AgendaStepId,
  WizardStep,
  createActionValidator,
} from '../engine/actions';
import { ACCEPTS } from '../engine/agenda';
import { FieldVocabulary, resolveField } from '../engine/fieldVocabulary';
import { Resolution, resolveUtterance } from '../engine/ruleResolver';
import { Message } from '../session/types';
import { ModelEngine } from './engineClient';
import { SYSTEM_PROMPT, buildPrompt } from './prompt';
import {
  STEP_ACTIONS,
  buildQuestionSchema,
  buildStepSchema,
} from './stepSchema';

/** Confidence for a model answer whose field resolved exactly. */
const MODEL_CONFIDENCE = 0.85;

export interface ModelResolveInput {
  utterance: string;
  /** True once the draft exists; narrows what the model may propose. */
  hasDraft?: boolean;
  step: WizardStep;
  /**
   * The agenda question on the table, when there is one.
   *
   * Narrows both halves of the request: the model is shown the question and
   * worked answers to it, and is held to the actions that answer it. The
   * wizard step remains the fallback for a turn with nothing asked.
   */
  question?: AgendaStepId;
  questionText?: string;
  vocabulary: FieldVocabulary;
  history?: Message[];
  connectors?: { id: string; name?: string }[];
  connectorProperties?: string[];
}

export interface ModelResolveDeps {
  engine: ModelEngine;
  /** Injected in tests; defaults to the rule resolver. */
  fallback?: (input: ModelResolveInput) => Resolution;
}

/** Pulls the first JSON object out of a reply that may carry stray prose. */
export const extractJson = (reply: string): unknown => {
  const trimmed = reply.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Small models like to wrap JSON in prose or fences. One salvage attempt
    // is worth it; anything more elaborate is guessing at intent.
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');

    if (start === -1 || end <= start) return undefined;

    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return undefined;
    }
  }
};

/**
 * Cues that an instruction was actually about naming the dataset.
 *
 * A path slot is checked against the vocabulary, so an invented field becomes
 * a question. A *name* is free text, so nothing contradicts it — which is how
 * "the amount column should hold decimal values" became a dataset called
 * `amount_dataset_20240525`. Free-text slots need corroboration from the
 * utterance in the same way path slots need resolution.
 */
const NAMING_CUE = /\b(call|name|rename|title)\b/i;

/** The slots that hold a field path, per action kind. */
const PATH_SLOTS = [
  'path',
  'key',
  'primary',
  'partition',
  'timestamp',
] as const;

/**
 * Replaces each named field with the path it actually refers to.
 *
 * The model is given a hint rather than an enumeration, so it will sometimes
 * name a field loosely. `resolveField` is the same resolver the rules use,
 * which means the same ambiguity handling and the same refusals.
 */
const resolvePaths = (
  action: Action,
  vocabulary: FieldVocabulary,
): Resolution => {
  const draft = { ...action } as Record<string, unknown>;
  let resolvedPath: string | undefined;

  for (const slot of PATH_SLOTS) {
    const named = draft[slot];
    if (typeof named !== 'string' || !named) continue;

    // The reserved event-arrival key is not a schema field.
    if (named === 'obsrv_meta.syncts') continue;

    const found = resolveField(vocabulary, named);

    if (found.status === 'ambiguous') {
      return {
        status: 'ambiguous',
        confidence: 0,
        clarify: {
          question: `Which field did you mean by "${named}"?`,
          options: found.candidates,
        },
        candidateActions: found.candidates.map(
          (candidate) => ({ ...draft, [slot]: candidate }) as Action,
        ),
      };
    }

    if (found.status === 'unknown') {
      return {
        status: 'unknown',
        confidence: 0,
        clarify: { question: `I could not find a field called "${named}".` },
      };
    }

    draft[slot] = found.path;
    resolvedPath = found.path;
  }

  return {
    status: 'resolved',
    action: draft as Action,
    confidence: MODEL_CONFIDENCE,
    // A model guess is confirmed before it is written; a rule match is not.
    needsConfirmation: true,
    ...(resolvedPath ? { resolvedPath } : {}),
  };
};

export const resolveWithModel = async (
  input: ModelResolveInput,
  { engine, fallback }: ModelResolveDeps,
): Promise<Resolution> => {
  const fallBackToRules = () => (fallback ?? defaultFallback)(input);

  /**
   * The rules go first.
   *
   * Measured live: at 0.6B the model is *worse* than the rules on phrasings
   * the rules already handle — it produced `set_arrival_format` for an
   * instruction about duplicates. A rule match is a pattern the words
   * actually fit, so there is nothing for a guess to improve on. The model
   * earns its place only on utterances the rules decline.
   */
  const byRules = fallBackToRules();
  if (byRules.status === 'resolved') return byRules;

  let reply: string;

  try {
    reply = await engine.complete(`${SYSTEM_PROMPT}\n\n${buildPrompt(input)}`, {
      type: 'json_object',
      schema: JSON.stringify(
        input.question
          ? buildQuestionSchema(input.question, {
              connectorProperties: input.connectorProperties,
              hasDraft: input.hasDraft,
            })
          : buildStepSchema(input.step, {
              connectorProperties: input.connectorProperties,
              hasDraft: input.hasDraft,
            }),
      ),
    });
  } catch {
    // A model that errors mid-turn must not cost the user their instruction.
    return fallBackToRules();
  }

  const parsed = extractJson(reply);
  if (!parsed) return fallBackToRules();

  const validate = createActionValidator({
    connectorProperties: input.connectorProperties,
  });
  const checked = validate(parsed);

  if (!checked.ok) return fallBackToRules();

  /**
   * Constrained decoding is a hint, not a guarantee: the schema is passed to
   * the engine, but a model can still emit an action for another step — or,
   * with a question on the table, for another question. Checked against the
   * same list the schema was built from.
   */
  const permitted = input.question
    ? [...ACCEPTS[input.question], 'clarify', 'goto_step']
    : STEP_ACTIONS[input.step];

  if (!permitted.includes(checked.action.kind)) {
    return fallBackToRules();
  }

  // A name the user never asked for is worse than no answer.
  if (
    checked.action.kind === 'set_dataset_name' &&
    !NAMING_CUE.test(input.utterance)
  ) {
    return fallBackToRules();
  }

  // Both are done once the draft exists; proposing them again is a sign the
  // model had nothing better to offer.
  if (
    input.hasDraft &&
    (checked.action.kind === 'attach_sample' ||
      checked.action.kind === 'set_dataset_name')
  ) {
    return fallBackToRules();
  }

  /**
   * A `clarify` is the model asking a question, not an action to perform.
   *
   * Seen live: it was wrapped in a "Do it / Cancel" confirmation whose label
   * read "applied that change", so the user was asked to approve something
   * unnamed. The question is the answer here — it goes straight to the user.
   */
  if (checked.action.kind === 'clarify') {
    const { question, options } = checked.action;

    return {
      status: 'unknown',
      confidence: 0,
      clarify: { question, ...(options?.length ? { options } : {}) },
    };
  }

  // Conversation-only actions change nothing, so there is nothing to confirm.
  if (checked.action.kind === 'explain') {
    return {
      status: 'resolved',
      action: checked.action,
      confidence: MODEL_CONFIDENCE,
    };
  }

  return resolvePaths(checked.action, input.vocabulary);
};

const defaultFallback = (input: ModelResolveInput): Resolution =>
  resolveUtterance(input.utterance, {
    vocabulary: input.vocabulary,
    connectors: input.connectors,
    connectorProperties: input.connectorProperties,
  });
