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
import { sameAction } from '../engine/actions';
import { DatasetFacts, alreadySatisfied } from '../engine/datasetFacts';
import { FieldVocabulary, resolveField } from '../engine/fieldVocabulary';
import { Resolution, resolveUtterance } from '../engine/ruleResolver';
import { RouterResult, sanitiseRoute } from '../engine/router';
import { WIZARD_STEP_BY_AGENDA_STEP } from '../engine/previewFocus';
import { Message } from '../session/types';
import { reportModelCall } from '../telemetry';
import { ModelEngine } from './engineClient';
import { SYSTEM_PROMPT, buildPrompt } from './prompt';
import {
  ROUTER_SCHEMA,
  ROUTER_SYSTEM_PROMPT,
  buildRouterPrompt,
  readRouterReply,
} from './router';
import {
  STEP_ACTIONS,
  buildQuestionSchema,
  buildStepSchema,
} from './stepSchema';

/** Confidence for a model answer whose field resolved exactly. */
const MODEL_CONFIDENCE = 0.85;

export interface ModelResolveInput {
  utterance: string;
  /**
   * True once the draft exists.
   *
   * No longer consumed by this resolver's own guards: proposing a rename or
   * another sample after the draft exists is a legitimate instruction, not a
   * sign the model had nothing better to offer, and the schema no longer
   * withdraws either action once a draft is in play. Left on the input for
   * callers that still have it to hand.
   */
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
  /**
   * The option labels the question's own card printed, when it is a choice.
   *
   * Threaded through the same as `questionText`: call A (`model/router.ts`)
   * reads a reply against the words the card actually showed, and needs this
   * whether or not a second, question-scoped call follows it.
   */
  optionLabels?: string[];
  /** The title of a confirm card still awaiting a reply, if there is one. */
  pendingCardTitle?: string;
  vocabulary: FieldVocabulary;
  history?: Message[];
  connectors?: { id: string; name?: string }[];
  /** Live master datasets, so the rules can read a join written in words. */
  masterDatasets?: { dataset_id: string; name?: string }[];
  connectorProperties?: string[];
  /**
   * The dataset's current values, when the caller has read them.
   *
   * Lets a resolved action be checked against what already exists, the same
   * way `buildPrompt` reads it into `factsLine` — a rename to the name
   * already on the document is dropped rather than proposed or confirmed.
   * Absent unless a caller supplies one; skipped rather than guessed at.
   */
  facts?: DatasetFacts;
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
   * The model goes first.
   *
   * It used to be the other way round, and the reason was honest at the
   * time: at 0.6B the model was *worse* than the rules on phrasings the
   * rules already handled. But rules are hand-written phrasings, and they
   * only ever cover the sentence someone thought of. "I want create
   * telemetry dataset" was answered by naming a dataset that whole sentence,
   * because the prose reader stripped the prefixes it knew and kept the
   * rest. Widening that list fixes one sentence and not the next.
   *
   * So the model reads the answer against the question, with the question's
   * own action schema as its grammar, and the rules are what answers when it
   * cannot: unavailable, unparseable, or an action this question does not
   * accept. A reading that is not literally what the user typed is proposed
   * rather than performed — see `needsConfirmation`.
   */
  let reply: string;

  try {
    /*
      The field names have to be passed explicitly. `buildPrompt` takes
      `fieldPaths`, `ModelResolveInput` carries a whole `vocabulary`, and
      because the field is optional nothing complained — so the hint the
      prompt is built around was empty on every call, and the model was
      naming fields it had never been shown.
    */
    const prompt = buildPrompt({
      ...input,
      fieldPaths: input.vocabulary.paths,
    });

    reply = await engine.complete(`${SYSTEM_PROMPT}\n\n${prompt}`, {
      type: 'json_object',
      schema: JSON.stringify(
        input.question
          ? buildQuestionSchema(input.question, {
              connectorProperties: input.connectorProperties,
            })
          : buildStepSchema(input.step, {
              connectorProperties: input.connectorProperties,
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

  const reading = resolvePaths(checked.action, input.vocabulary);

  /**
   * The rules read it too, and what happens next depends on whether they
   * agree.
   *
   * Agreement is the evidence a confirmation would have asked for: "make
   * order_id required" is not a guess when two readers arrive at it
   * independently, so it is performed. Without this, moving the model to the
   * front would have put a yes in front of every instruction.
   *
   * Disagreement no longer substitutes the rule's action for the model's.
   * Measured live: "mark mid as required" came back from the 1.7B as a
   * change of arrival format, and the rule's own reading used to be swapped
   * in silently — which meant a user could see a change they never typed,
   * with nothing to say it was not the change they asked for. A confirmation
   * card costs one click; discovering and undoing an unannounced substitution
   * costs a great deal more. So where the two disagree, the model's own
   * reading stands, marked for confirmation like any other model guess. What
   * the rules found is evidence of agreement or disagreement now, never an
   * alternative answer.
   */
  const settled = (() => {
    if (reading.status !== 'resolved' || !reading.action) return reading;

    const byRules = fallBackToRules();
    const agrees =
      byRules.status === 'resolved' &&
      !!byRules.action &&
      sameAction(byRules.action, reading.action);

    return { ...reading, needsConfirmation: !agrees };
  })();

  /**
   * A resolved action that would change nothing the document does not
   * already say is dropped rather than run or confirmed — a rename to the
   * name already on the document is not a decision to ask about.
   *
   * Skipped entirely when `facts` is absent, rather than assuming a default:
   * a caller that has not supplied a snapshot has not claimed to know the
   * dataset's current values, and guessing would risk dropping an action
   * that is not actually a no-op.
   */
  if (input.facts && settled.status === 'resolved' && settled.action) {
    if (alreadySatisfied(settled.action, input.facts)) {
      return { status: 'unknown', confidence: 0 };
    }
  }

  return settled;
};

const defaultFallback = (input: ModelResolveInput): Resolution =>
  resolveUtterance(input.utterance, {
    vocabulary: input.vocabulary,
    connectors: input.connectors,
    connectorProperties: input.connectorProperties,
    masterDatasets: input.masterDatasets,
  });

/**
 * Classifies the turn first, then extracts an action only when the
 * classification asks for one — an `ask`/`other` reading costs one call,
 * not two, since there is nothing to extract.
 *
 * Purely additive: nothing in `engine/turn.ts` calls this yet. A later
 * commit is what points `TurnDeps.route` here; until then this exists
 * beside `resolveWithModel`, which callers keep using unchanged.
 */
export const resolveTurn = async (
  input: ModelResolveInput,
  deps: ModelResolveDeps,
): Promise<RouterResult> => {
  let raw: string;
  const routeStartedAt = Date.now();

  try {
    const routerPrompt = buildRouterPrompt({
      utterance: input.utterance,
      question: input.question,
      questionText: input.questionText,
      optionLabels: input.optionLabels,
      pendingCardTitle: input.pendingCardTitle,
      history: input.history,
    });

    raw = await deps.engine.complete(
      `${ROUTER_SYSTEM_PROMPT}\n\n${routerPrompt}`,
      { type: 'json_object', schema: JSON.stringify(ROUTER_SCHEMA) },
    );

    reportModelCall({
      call: 'route',
      ms: Date.now() - routeStartedAt,
      ok: true,
    });
  } catch {
    reportModelCall({
      call: 'route',
      ms: Date.now() - routeStartedAt,
      ok: false,
    });

    // Mirrors `resolveWithModel`'s own posture towards a model that errors
    // mid-turn: the turn must not be lost. But there is no rule-based
    // reading of "what kind of message was this", the way there is a
    // rule-based reading of an instruction — so there is nothing honest to
    // fall back to except the same answer a rejected reading gets below.
    return { intent: 'other' };
  }

  const reading = readRouterReply(raw);

  /**
   * Unparseable, invalid, or absent: nothing classified this turn, so
   * nothing is assumed about it. Falling back to the rules here would be
   * guessing at a classification the model failed to produce — exactly the
   * guess the project already refuses to make from phrase-matching alone.
   */
  if (!reading) return { intent: 'other' };

  const routed = sanitiseRoute(reading);
  if (!routed) return { intent: 'other' };

  // Nothing to extract for the user's own question, a remark outside the
  // job, or a capability the engine declines by construction — this is the
  // latency win the whole split exists for.
  if (
    routed.intent === 'ask' ||
    routed.intent === 'other' ||
    routed.outOfScope
  ) {
    return routed;
  }

  /**
   * Which question the second, extracting call is scoped to: the one
   * already on the table for an answer, or the one the router named for a
   * request — or for a reply to a card that carries a follow-on request
   * alongside its decision. `reply_to_card` with no named step is the
   * accept/decline case, which the turn loop settles on its own; there is
   * nothing here to extract.
   */
  const targetStep = routed.intent === 'answer' ? input.question : routed.step;
  if (!targetStep) return routed;

  /**
   * Reused unchanged when the target is the question already asked, since
   * `input` is already scoped correctly for it. Rebuilt when the router
   * named a different step: `questionText` is dropped rather than carried
   * over, because it is the *other* question's own wording, and showing it
   * here would claim a question was asked that never was. The narrower
   * schema and the permitted-kinds check downstream both key off `question`
   * alone, so extraction is still correctly scoped without it — only the
   * prompt's few-shot framing is what is lost, which is the honest trade.
   */
  const scoped: ModelResolveInput =
    targetStep === input.question
      ? input
      : {
          ...input,
          question: targetStep,
          questionText: undefined,
          step: WIZARD_STEP_BY_AGENDA_STEP[targetStep] ?? input.step,
        };

  const extractStartedAt = Date.now();
  const resolution = await resolveWithModel(scoped, deps);

  // `resolveWithModel` already swallows its own engine failure and falls
  // back to the rules rather than throwing, so there is nothing to catch
  // here — `ok` reports whether extraction actually named an action, which
  // is the meaningful success for this call.
  reportModelCall({
    call: 'extract',
    ms: Date.now() - extractStartedAt,
    ok: resolution.status === 'resolved',
  });

  if (resolution.status !== 'resolved' || !resolution.action) {
    // Nothing extracted — a clarify, an unknown field, an ambiguity. The
    // caller's own fallback narration handles that; inventing a placeholder
    // action here would be the same guess this function exists to avoid.
    return routed;
  }

  return {
    ...routed,
    actions: [
      {
        action: resolution.action,
        confirm: Boolean(resolution.needsConfirmation),
      },
    ],
  };
};
