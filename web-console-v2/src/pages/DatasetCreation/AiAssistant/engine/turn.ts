/**
 * One turn: an utterance or a card click in, a transcript and an outcome out.
 *
 * The executor is injected rather than imported so this can be tested without
 * a server, and so the model tier can later wrap it. Nothing is written to the
 * session here — the caller owns persistence, which keeps this pure enough to
 * reason about.
 */
import { Prompt } from './agenda';
import { Action, sameAction } from './actions';
import { ExecutionOutcome } from './executor';
import {
  answerTo,
  answerToChoice,
  answerToConflictCard,
  isAddressedRequest,
  OfferReply,
  readOffer,
} from './answer';
import { FieldVocabulary } from './fieldVocabulary';
import {
  LEFT_IT_AS_IT_WAS,
  NOTHING_TO_UNDO,
  STOPPED_PART_WAY,
  containModelText,
  describeProposal,
  narrateExplain,
  narrateOutcome,
  narrateOutOfScope,
  narrateResolution,
  narrateUndo,
} from './narrate';
import { countDuplicates, evaluateExpression } from './preflight';
import {
  kindsForUtterance,
  unmetForAction,
  unmetForUtterance,
} from './prerequisites';
import { isAboutDataset } from './topicality';
import { sectionForAction } from './previewFocus';
import { RouterResult } from './router';
import { MessageCard } from '../messages/types';
import { NewMessage } from '../session/sessionStore';
import { Resolution, resolveUtterance } from './ruleResolver';
import { Message } from '../session/types';
import { undoTarget } from './undo';

export interface TurnDeps {
  vocabulary: FieldVocabulary;
  execute: (action: Action) => Promise<ExecutionOutcome>;
  /**
   * The sample the user supplied. Used for local checks only — never sent,
   * and absent when no sample has been given yet.
   */
  sampleRows?: Record<string, unknown>[];
  /** Connectors available to choose from, once the list has been read. */
  connectors?: { id: string; name?: string }[];
  /** True when the list could not be read, as opposed to being empty. */
  connectorsUnavailable?: boolean;
  /** The chosen connector's non-secret property keys. */
  connectorProperties?: string[];
  /** Live master datasets, so a join said in words can name one. */
  masterDatasets?: { dataset_id: string; name?: string }[];
  /**
   * False before `datasets/create` has run, when there is no document to
   * change. Defaults to true, since every turn after the first has one.
   */
  datasetExists?: boolean;
  /** True when a name and a type are chosen but the draft does not exist. */
  draftPending?: boolean;
  /**
   * The question the assistant has on the table, when it has one.
   *
   * Typed text is read as an answer to it first, and an action that answers
   * it is performed rather than proposed. Absent when nothing was asked, in
   * which case every utterance is a free-standing request as before.
   */
  prompt?: Prompt;
  /**
   * Replaces rule resolution when the model is running. Returns the same
   * `Resolution`, so nothing downstream knows which tier answered.
   */
  resolve?: (utterance: string) => Promise<Resolution>;
  /**
   * The transcript so far, which is where an inverse action is recorded.
   *
   * Undo needs it and nothing else does: the inverse of a change is computed
   * before the write and carried on the message, so the transcript is the
   * undo stack. Passing it in keeps this module free of session access.
   */
  history?: Message[];
  /**
   * Classifies the turn before anything else reads it — an answer, a fresh
   * request, a reply to a pending card, the user's own question, or a remark
   * outside the job — and, where the classification calls for one, the
   * action or actions the model already extracted for it.
   *
   * Absent is exactly today's behaviour: everything below this point in the
   * module runs precisely as it always has. Present, it is tried first, and
   * only a reading this function cannot settle on its own falls through to
   * the same pipeline it would have run without one — see `handleRouted`.
   */
  route?: (utterance: string) => Promise<RouterResult>;
}

/** One action that reached the executor, paired with what it reported. */
export interface AppliedAction {
  action: Action;
  outcome: ExecutionOutcome;
}

export interface TurnResult {
  /** What to append to the transcript, in order. */
  messages: NewMessage[];
  /**
   * Every action that reached the executor this turn, in order.
   *
   * A blocked request, an off-topic refusal, a proposal card and "nothing to
   * try again" all run nothing, so they return an empty list. Today's other
   * branches run at most one action; a plan of several — coming in a later
   * commit — fills this the same way `runUndo` already does, one entry per
   * action that reached the executor, including a failing one, so a partial
   * turn is still fully auditable.
   */
  applied: AppliedAction[];
  /** The change this turn undid, for the caller to mark as spent. */
  undoneMessageId?: string;
}

/**
 * Wraps a single action's outcome as the `applied` list most turns produce.
 *
 * Today's branches never run more than one action outside `runUndo`, but the
 * result is still a list — this is the seam a later commit's multi-action
 * plan will fill without changing the shape. An action that never reached
 * the executor (the expression preflight blocked it) has no outcome, and
 * reports as having run nothing.
 */
const ran = (action: Action, outcome?: ExecutionOutcome): AppliedAction[] =>
  outcome ? [{ action, outcome }] : [];

/** Failure shape for an executor that threw rather than returning a failure. */
const threw = (cause: unknown): ExecutionOutcome => ({
  ok: false,
  code: 'TURN_FAILED',
  error:
    cause instanceof Error
      ? cause.message
      : 'Something went wrong applying that change.',
});

/** The expression an action carries, when it carries one. */
const expressionOf = (action: Action): string | undefined =>
  action.kind === 'add_transformation' || action.kind === 'add_derived_field'
    ? action.expression
    : undefined;

/**
 * Checks an expression against the sample before it is sent.
 *
 * Returns the card to show either way: the result when it evaluated, the
 * error when it did not. A missing sample is not a failure — there is simply
 * nothing to check against, so the API stays the judge.
 */
const preflightExpression = async (
  action: Action,
  deps: TurnDeps,
): Promise<
  | { blocked: true; message: NewMessage }
  | { blocked: false; card?: MessageCard }
> => {
  const expression = expressionOf(action);
  if (!expression || !deps.sampleRows?.length) return { blocked: false };

  const checked = await evaluateExpression(expression, deps.sampleRows);

  if (!checked.ok) {
    return {
      blocked: true,
      message: {
        role: 'assistant',
        text: 'That expression does not evaluate against your sample, so I have not sent it.',
        failureCode: 'INVALID_EXPRESSION',
        card: { kind: 'expression_result', expression, error: checked.error },
        ...(sectionForAction(action)
          ? { section: sectionForAction(action) }
          : {}),
      },
    };
  }

  return {
    blocked: false,
    card: {
      kind: 'expression_result',
      expression,
      dataType: checked.dataType,
      results: checked.results,
    },
  };
};

/**
 * What the sample says about a dedup key, when one was just set.
 *
 * The wizard's picker offers keys with no indication of whether they are
 * unique in the data the user supplied, so a key that would silently drop
 * rows looks identical to one that would drop none.
 */
const dedupWarning = (action: Action, deps: TurnDeps): string => {
  if (action.kind !== 'set_dedup' || !action.enabled || !action.key) return '';
  if (!deps.sampleRows?.length) return '';

  const { duplicates, total } = countDuplicates(deps.sampleRows, action.key);
  if (duplicates === 0) return '';

  return ` In your sample, ${duplicates} of ${total} row${
    total === 1 ? '' : 's'
  } would be dropped as duplicates.`;
};

/**
 * What the flow has so far, for deciding whether a request can be honoured.
 *
 * A schema is what makes a field nameable, so its presence is read off the
 * vocabulary rather than tracked separately — the two cannot then disagree.
 */
const stateOf = (deps: TurnDeps) => ({
  hasDataset: deps.datasetExists ?? true,
  hasSchema: deps.vocabulary.paths.length > 0,
  // The sample is what creates the draft, so once a name and a type are in
  // hand it is the sample that is missing — not the name.
  ...(deps.draftPending ? { draftPending: true } : {}),
});

/** The confirm card, as it appears on a message. */
type ConfirmCard = Extract<MessageCard, { kind: 'confirm' }>;

/**
 * The card waiting on a reply, when one is.
 *
 * A proposal is live only while it is the most recent thing the assistant
 * said: once anything else has happened, a reply cannot be about it any
 * more. Reading it from the transcript rather than holding it in state keeps
 * the turn loop free of memory the session would have to persist. Returning
 * the whole card, not just the action it would run, is what lets a reply be
 * read against the words the card itself printed, via `readOffer`.
 */
export const pendingConfirmation = (
  history: Message[] = [],
): ConfirmCard | undefined => {
  const last = [...history]
    .reverse()
    .find((message) => message.role === 'assistant');

  return last?.card?.kind === 'confirm' && !last.action ? last.card : undefined;
};

/** Ways of asking for the last failure to be sent again. */
const RETRIES =
  /^(?:try (?:that |it )?again|retry(?: that| it)?|resend(?: it| that)?|send (?:it|that) again|do it again)\b/i;

/**
 * What to send when the user asks to try again.
 *
 * The diagnosis often knows better than the user does: a store the cluster
 * does not have comes back with a *corrected* action naming the store it
 * does, and re-sending the original would fail identically. So the
 * correction wins where there is one, and the failed action is the fallback
 * for an ordinary transient failure.
 */
const retryTarget = (history: Message[] = []): Action | undefined => {
  const failed = [...history]
    .reverse()
    .find((message) => message.failureCode && (message.action || message.card));

  if (!failed) return undefined;

  const corrected =
    failed.card?.kind === 'api_error'
      ? failed.card.diagnosis.retryAction
      : undefined;

  return corrected ?? failed.action;
};

/**
 * Re-sends whatever last failed.
 *
 * Factored out so a router reading of `control: 'retry'` can reach exactly
 * this, rather than the phrase match below being the only door in — the
 * words "try again" and the router's own classification of the same intent
 * must end up running the same thing.
 */
const runRetry = async (deps: TurnDeps): Promise<TurnResult> => {
  const target = retryTarget(deps.history);

  if (!target) {
    return {
      messages: [
        {
          role: 'assistant',
          text: 'There is nothing to try again — nothing has failed yet.',
        },
      ],
      applied: [],
    };
  }

  const { outcome, message } = await runAction(target, deps);

  return { messages: [message], applied: ran(target, outcome) };
};

/**
 * Whether the words ask for something other than the answer they matched.
 *
 * A choice is matched on the words it contains, which is what lets "dedupe
 * on order_id" answer the deduplication question. The same leniency read
 * "also pull in the Assistant Customers record on customer_id as
 * customer_details" as an answer to that question and wrote `customer_id` as
 * the deduplication key: a change nobody asked for, applied without a
 * confirmation, because an answer is never proposed. Found in the browser.
 *
 * So when the words name a topic of their own, the action they matched has to
 * belong to it. Declining and moving on are exempt: "no transformations" is a
 * transformation topic answered by skipping the step, and that is an answer.
 */
const asksSomethingElse = (input: string, answered: Action): boolean => {
  if (answered.kind === 'skip_step' || answered.kind === 'goto_step') {
    return false;
  }

  const kinds = kindsForUtterance(input);

  return Boolean(kinds) && !kinds!.includes(answered.kind);
};

const runAction = async (
  action: Action,
  deps: TurnDeps,
): Promise<{
  outcome?: ExecutionOutcome;
  message: NewMessage;
}> => {
  const preflight = await preflightExpression(action, deps);
  if (preflight.blocked) return { message: preflight.message };

  let outcome: ExecutionOutcome;

  try {
    outcome = await deps.execute(action);
  } catch (cause) {
    outcome = threw(cause);
  }

  const narration = narrateOutcome(action, outcome);
  const warning = outcome.ok ? dedupWarning(action, deps) : '';

  // The expression card is only worth showing when the change went through;
  // a failure has its own card explaining why.
  const card = narration.card ?? (outcome.ok ? preflight.card : undefined);

  const undoable =
    outcome.ok && outcome.status === 'applied'
      ? {
          ...(outcome.inverse ? { inverse: outcome.inverse } : {}),
          ...(outcome.undoBlocked ? { undoBlocked: outcome.undoBlocked } : {}),
        }
      : {};

  return {
    outcome,
    message: {
      role: 'assistant',
      text: `${narration.text}${warning}`,
      action,
      ...undoable,
      ...(card ? { card } : {}),
      ...(narration.failureCode ? { failureCode: narration.failureCode } : {}),
      ...(sectionForAction(action)
        ? { section: sectionForAction(action) }
        : {}),
    },
  };
};

/** The confirm card an inferred action becomes, before it is run. */
const proposeAction = (action: Action): NewMessage => ({
  role: 'assistant',
  text: `I think you mean: ${describeProposal(action)}.`,
  card: {
    kind: 'confirm',
    title: describeProposal(action),
    confirmLabel: 'Do it',
    confirmAction: action,
  },
  ...(sectionForAction(action) ? { section: sectionForAction(action) } : {}),
});

/**
 * What `explain` says, without running anything.
 *
 * The narration itself lives in `narrate.ts`, alongside every other sentence
 * the assistant writes. What matters here is only that this stays a
 * `say`-only message: `explain` changes nothing, so it must never reach
 * `deps.execute` or `applied`, whichever tier resolved it.
 */
const explainMessage = (
  action: Extract<Action, { kind: 'explain' }>,
): NewMessage => ({ role: 'assistant', ...narrateExplain(action) });

/**
 * Kinds whose effect cannot be asked for again once it is gone — a deleted
 * field, a removed transformation, a removed join. These always propose,
 * whatever a `confirm` flag says: the router is a reading of the words, not
 * a judge of what is safe to do without a click, and the engine keeps that
 * judgment for itself.
 */
const DESTRUCTIVE_KINDS: ReadonlySet<Action['kind']> = new Set([
  'delete_field',
  'remove_transformation',
  'remove_denorm',
]);

/** What one candidate action produced, and whether a plan behind it should stop. */
interface StepOutcome {
  message: NewMessage;
  applied: AppliedAction[];
  /**
   * True when nothing further in the same plan should run: a blocked
   * prerequisite, a proposal now waiting on a click, and a failed write all
   * stop a plan the same way a failed restoration already stops `runUndo` —
   * only a clean, completed run is safe to follow with the next step.
   */
  stop: boolean;
  /**
   * True only when `stop` is true *because the step actually failed* — a
   * write that reached the executor and came back rejected, or an expression
   * the preflight refused to run. A blocked prerequisite and a proposal
   * waiting on a click also set `stop`, but neither is a failure: nothing
   * was attempted in either case, so there is nothing to apologise for.
   */
  failed?: boolean;
}

/**
 * Turns one candidate action — the router's own, a follow-on carried
 * alongside a reply-to-card decision, or (see the call in `runTurn` below)
 * the no-router resolver's single resolved action — into a message and,
 * when it actually reached the executor, the applied entry that belongs in
 * the transcript.
 *
 * One place for the destructive-kind safety valve, the prerequisite gate and
 * the propose-vs-run fork, so a plan of several actions is not three
 * slightly different copies of the same decision.
 */
const runOneStep = async (
  candidate: { action: Action; confirm?: boolean },
  deps: TurnDeps,
): Promise<StepOutcome> => {
  const { action, confirm } = candidate;

  // Conversation-only: never blocked, never proposed, never executed.
  if (action.kind === 'explain') {
    return { message: explainMessage(action), applied: [], stop: true };
  }

  const blocked = unmetForAction(action, stateOf(deps));

  if (blocked) {
    return {
      message: {
        role: 'assistant',
        text: blocked.text,
        failureCode:
          blocked.requirement === 'dataset' ? 'NO_DATASET' : 'NO_SCHEMA',
      },
      applied: [],
      stop: true,
    };
  }

  if (confirm || DESTRUCTIVE_KINDS.has(action.kind)) {
    return { message: proposeAction(action), applied: [], stop: true };
  }

  const { outcome, message } = await runAction(action, deps);
  const failed = !outcome?.ok;

  return { message, applied: ran(action, outcome), stop: failed, failed };
};

/**
 * Runs a plan of candidate actions in order, stopping at the first one that
 * does not cleanly complete.
 *
 * This is the compound case a reply to a card can carry alongside its
 * decision — "no, change the name to telemetry" is a decline plus a rename —
 * and it is the shape the router's own extracted `actions` already come in,
 * even when there is only one.
 *
 * A plan of more than one candidate is itself evidence the user asked for
 * more than one thing in the same turn. So when one of several fails, the
 * failing step's own message gets `STOPPED_PART_WAY` appended — the failure
 * reason stays exactly as `runOneStep` wrote it, but the reply also says
 * plainly that the rest of what was asked was not attempted, rather than
 * leaving that to be assumed from a message that only explains the one
 * failure. A lone candidate that fails needs no such disclaimer: there was
 * nothing else in the turn to leave undone.
 */
const runPlan = async (
  candidates: { action: Action; confirm?: boolean }[],
  deps: TurnDeps,
): Promise<{ messages: NewMessage[]; applied: AppliedAction[] }> => {
  const messages: NewMessage[] = [];
  const applied: AppliedAction[] = [];

  for (const candidate of candidates) {
    const step = await runOneStep(candidate, deps);
    const partial = step.failed && candidates.length > 1;

    messages.push(
      partial
        ? { ...step.message, text: `${step.message.text} ${STOPPED_PART_WAY}` }
        : step.message,
    );
    applied.push(...step.applied);

    if (step.stop) break;
  }

  return { messages, applied };
};

/** Said for an `ask`/`other` turn with nothing of its own to say. */
const NOT_SURE_FALLBACK = "I'm not sure what you mean.";

/**
 * What a router reading settles on its own, before any of today's no-router
 * pipeline runs — or `undefined`, when it settles nothing and the rest of
 * `runTurn` should read the same `input` exactly as it would with no router
 * at all.
 *
 * That `undefined` case is deliberate, not an omission: a `reply_to_card`
 * with no pending card to answer, or with no `decision` the router committed
 * to, is the router's own uncertainty, and it gets the same non-answer
 * `readOffer` already gives when it cannot read a reply either — falling
 * through, not guessing.
 */
const handleRouted = async (
  routed: RouterResult,
  deps: TurnDeps,
): Promise<TurnResult | undefined> => {
  if (routed.control === 'undo') return runUndo(deps);
  if (routed.control === 'retry') return runRetry(deps);

  // A capability the engine declines by construction gets the engine's own
  // fixed, per-capability sentence — never the model's wording outright, so
  // the assistant can never be talked into claiming it published or deleted
  // something it did not.
  if (routed.outOfScope) {
    return {
      messages: [
        {
          role: 'assistant',
          ...narrateOutOfScope(routed.outOfScope, routed.reply),
        },
      ],
      applied: [],
    };
  }

  // Nothing to write for the user's own question or a remark outside the
  // job. `routed.reply` is the model's own free text — never trusted as-is,
  // even though `model/router.ts` already bounds it before it gets here, in
  // case a future caller of `deps.route` does not. See `containModelText`'s
  // own doc for why this, not a fixed sentence, is the containment for this
  // case.
  if (routed.intent === 'ask' || routed.intent === 'other') {
    return {
      messages: [
        {
          role: 'assistant',
          text: containModelText(routed.reply) ?? NOT_SURE_FALLBACK,
        },
      ],
      applied: [],
    };
  }

  if (routed.intent === 'reply_to_card') {
    const pendingCard = pendingConfirmation(deps.history);
    if (!pendingCard) return undefined;

    if (routed.decision === 'decline') {
      const plan = await runPlan(routed.actions ?? [], deps);

      return {
        messages: [
          { role: 'assistant', text: LEFT_IT_AS_IT_WAS },
          ...plan.messages,
        ],
        applied: plan.applied,
      };
    }

    if (routed.decision === 'accept') {
      const { outcome, message } = await runAction(
        pendingCard.confirmAction,
        deps,
      );
      const cardApplied = ran(pendingCard.confirmAction, outcome);

      if (!outcome?.ok) return { messages: [message], applied: cardApplied };

      const plan = await runPlan(routed.actions ?? [], deps);

      return {
        messages: [message, ...plan.messages],
        applied: [...cardApplied, ...plan.applied],
      };
    }

    // No decision named: an inconclusive router reading, not a coin flip.
    return undefined;
  }

  if (routed.intent === 'answer' || routed.intent === 'request') {
    // Nothing extracted — a clarify, an ambiguity, a field that did not
    // resolve. The no-router narration below already knows how to say that
    // honestly; inventing a placeholder here would only repeat its job.
    if (!routed.actions?.length) return undefined;

    const plan = await runPlan(routed.actions, deps);

    return { messages: plan.messages, applied: plan.applied };
  }

  return undefined;
};

/**
 * Puts the most recent change back.
 *
 * The inverse actions were computed before the write and recorded on the
 * message, so undo is an ordinary turn: the same executor, the same
 * narration, the same audit trail. It re-PATCHes rather than restoring a
 * cached document, which means a concurrent edit is reported by the same
 * `version_key` check as everything else.
 *
 * Several actions can be needed to put one change back — a deleted field is
 * re-added, then made required, then described — and they are sent in order,
 * stopping at the first failure and saying what did land.
 */
const runUndo = async (deps: TurnDeps): Promise<TurnResult> => {
  const target = undoTarget(deps.history ?? []);

  if (target.status === 'none') {
    return {
      messages: [{ role: 'assistant', text: NOTHING_TO_UNDO }],
      applied: [],
    };
  }

  if (target.status === 'blocked') {
    return {
      messages: [
        {
          role: 'assistant',
          text: target.reason,
          failureCode: 'NOT_UNDOABLE',
        },
      ],
      applied: [],
    };
  }

  const restored: Action[] = [];
  /** Each restoring action's own inverse, which together make a redo. */
  const inverses: Action[][] = [];
  let redoBlocked: string | undefined;
  /**
   * Every action that reached the executor this turn, in order.
   *
   * Built up as each restoring action runs, so a failure part way through
   * still reports everything that was attempted — the failing action
   * included — rather than only the one that broke.
   */
  const applied: AppliedAction[] = [];

  for (const action of target.actions) {
    const step = await runAction(action, deps);

    if (step.outcome) applied.push({ action, outcome: step.outcome });

    if (!step.outcome?.ok) {
      // A partial restoration the user is not told about is worse than a
      // failure, so what did land is said first, then why the rest did not.
      const said: NewMessage[] = restored.length
        ? [{ role: 'assistant', text: narrateUndo(restored, true).text }]
        : [];

      return {
        messages: [...said, step.message],
        applied,
      };
    }

    restored.push(action);

    if (step.outcome.status === 'applied') {
      if (step.outcome.inverse) inverses.push(step.outcome.inverse);
      if (step.outcome.undoBlocked) redoBlocked = step.outcome.undoBlocked;
    }
  }

  // Undoing a sequence is undone by inverting it back to front.
  const redo = inverses.reverse().flat();
  const section = sectionForAction(restored[0]);

  return {
    messages: [
      {
        role: 'assistant',
        text: narrateUndo(restored).text,
        action: restored[0],
        ...(redo.length && !redoBlocked ? { inverse: redo } : {}),
        ...(redoBlocked ? { undoBlocked: redoBlocked } : {}),
        ...(section ? { section } : {}),
      },
    ],
    applied,
    undoneMessageId: target.message.id,
  };
};

/**
 * Cards the assistant is *waiting on*, as opposed to cards that only inform.
 *
 * The distinction decides whether a second question may follow in the same
 * turn. A `confirm` or a `conflict` is a thing to click, so asking something
 * else alongside it gives the user two prompts and no way to tell which the
 * assistant wants. An `api_error` or an `expression_result` is a statement
 * about what just happened, and following it with the next question is
 * exactly right — that is how a refused name gets asked again instead of
 * ending the turn.
 */
const AWAITING_CARDS = [
  'confirm',
  'choice',
  'conflict',
  'file_drop',
  'secret_form',
];

/**
 * Whether this turn is already waiting for the user.
 *
 * The caller asks the agenda's next question only when this is false. It
 * lives here, next to the code that builds the cards, so the rule and the
 * cards cannot drift — but the *asking* happens in the caller, after the
 * session has recorded what this turn did. Asking from inside the turn read
 * the session as it was before the turn, and a freshly named dataset was
 * asked its name again.
 */
export const awaitingInput = (messages: NewMessage[]): boolean =>
  messages.some(
    (message) => message.card && AWAITING_CARDS.includes(message.card.kind),
  );

/**
 * A reading the matcher settled on outright, run or proposed exactly the
 * way any other action is — the prerequisite gate first, then the executor.
 *
 * Shared by the pre-router short-circuit below and the no-router fallback's
 * own literal check further down, so an exact match is treated identically
 * whichever one finds it — one gate, not two copies of it.
 */
const runLiteralAnswer = async (
  action: Action,
  input: string,
  deps: TurnDeps,
): Promise<TurnResult> => {
  const state = stateOf(deps);
  const literalBlocked =
    unmetForAction(action, state) ?? unmetForUtterance(input, state);

  if (literalBlocked) {
    return {
      messages: [
        {
          role: 'assistant',
          text: literalBlocked.text,
          failureCode:
            literalBlocked.requirement === 'dataset'
              ? 'NO_DATASET'
              : 'NO_SCHEMA',
        },
      ],
      applied: [],
    };
  }

  const { outcome, message } = await runAction(action, deps);
  return { messages: [message], applied: ran(action, outcome) };
};

/**
 * A definite match for the question already on the table — a choice matched
 * by its own label, or a conflict matched by its own candidate — read
 * straight off the words, with nothing left to corroborate.
 *
 * `asksSomethingElse` still applies: a reply that names a topic of its own
 * alongside the match it happens to score is not a definite answer to
 * *this* question, whatever it scored. A confirm card is not read here —
 * `pendingConfirmation` and `readOffer` already cover it, see `runTurn`.
 */
const definiteCardAnswer = (
  prompt: Prompt | undefined,
  input: string,
): Action | undefined => {
  const card = prompt?.card;

  const action =
    card?.kind === 'choice'
      ? answerToChoice(card.options, input)
      : card?.kind === 'conflict'
        ? answerToConflictCard(card, input)
        : undefined;

  return action && !asksSomethingElse(input, action) ? action : undefined;
};

/**
 * A definite "yes" or "no" to the card waiting on a reply — the one
 * `pendingConfirmation` found, read by `readOffer` against its own printed
 * words. Shared so the pre-router check and the (otherwise unreachable,
 * once that check runs first) reading further down apply the one decision
 * the same way.
 */
const runPendingOffer = async (
  offer: OfferReply,
  card: ConfirmCard,
  deps: TurnDeps,
): Promise<TurnResult> => {
  if (offer === 'decline') {
    return {
      messages: [{ role: 'assistant', text: LEFT_IT_AS_IT_WAS }],
      applied: [],
    };
  }

  const { outcome, message } = await runAction(card.confirmAction, deps);
  return { messages: [message], applied: ran(card.confirmAction, outcome) };
};

/**
 * Runs a turn from typed text, or from an action a card already chose.
 *
 * A card click has nothing to resolve and nothing the user typed, so it
 * produces the assistant turn alone.
 *
 * This never echoes the user's own words back in `messages`. It used to —
 * building the echo here meant the caller could only write it to the
 * transcript once this whole turn, inference and every server round trip
 * included, had resolved, so what was typed sat in limbo for as long as a
 * turn took. The caller now appends it itself before calling this, which is
 * also why `deps.history` matters: it has to be read before that append, so
 * what a turn reasons over — the last thing proposed, the last thing that
 * failed — is the transcript as it stood when the user typed, not one that
 * already contains their own words.
 */
export const runTurn = async (
  input: string | Action,
  deps: TurnDeps,
): Promise<TurnResult> => {
  if (typeof input !== 'string') {
    if (input.kind === 'undo') return runUndo(deps);

    const { outcome, message } = await runAction(input, deps);
    return { messages: [message], applied: ran(input, outcome) };
  }

  /**
   * A definite answer, read straight off what the engine already knows,
   * settles the turn before any model — the router included — ever sees it.
   *
   * Live testing found the router unreliable exactly here: typing the exact
   * text of a printed choice option, or the exact printed word a pending
   * confirm card is waiting on, sometimes got misclassified as an unrelated
   * remark, producing a wrong or hallucinated reply where the answer was
   * already certain. `readOffer` and `answerToChoice`/`answerToConflictCard`
   * are exactly the matchers that already ran, today, further down this same
   * function once the router had first crack at the turn and missed — moving
   * them ahead of `deps.route` does not change what they consider a match,
   * only how early a genuine one is allowed to settle the turn. Anything
   * short of a definite match — a near-miss, a paraphrase — comes back
   * `undefined` from these, exactly as it always has, and falls through to
   * the router below unchanged.
   *
   * A proposal is checked first because it is the more recent thing asked:
   * "yes" right after "shall I deduplicate on order_id?" is about that,
   * whatever question the agenda still holds. The reply has to be read
   * against the card's own words, not merely start with them — see
   * `readOffer`'s own doc for why "no, change name to telemetry" is neither
   * an accept nor a decline.
   */
  const pendingCard = pendingConfirmation(deps.history);
  const offer = pendingCard && readOffer(pendingCard, input);

  if (pendingCard && offer) {
    return runPendingOffer(offer, pendingCard, deps);
  }

  const definiteAnswer = definiteCardAnswer(deps.prompt, input);
  if (definiteAnswer) {
    return runLiteralAnswer(definiteAnswer, input, deps);
  }

  /**
   * The router, when there is one, goes before anything else left — the
   * confirm-card gate above already had its turn, and found no definite
   * match. It is tried next because it is the more complete reading: it has
   * already told an answer from a fresh request from a reply to a card from
   * a remark outside the job, which is exactly the set of distinctions the
   * code below has to work out for itself, one branch at a time, from the
   * same few signals.
   *
   * `undefined` from `handleRouted` means the router settled nothing this
   * turn was worth acting on directly — a `reply_to_card` with no pending
   * card, or with no decision it committed to, most often — and the rest of
   * this function runs exactly as it would with no router at all.
   */
  if (deps.route) {
    const routed = await deps.route(input);
    const handled = await handleRouted(routed, deps);

    if (handled) return handled;
  }

  /**
   * "Try again" re-sends what failed.
   *
   * The failed action is recorded on the message it failed in, so there is
   * nothing to remember between turns: the transcript is the retry stack in
   * the same way it is the undo stack.
   */
  if (RETRIES.test(input.trim())) {
    return runRetry(deps);
  }

  /**
   * Reading the reply comes first, and the model does the reading.
   *
   * It used to be the other way round: the question's own matcher ran first
   * and won outright, and for a question that takes prose that meant
   * whatever was typed became the value. "I want create telemetry dataset"
   * named a dataset exactly that. The matcher compares a reply against
   * options the assistant itself wrote, which is sound for a choice and
   * hopeless for a sentence.
   *
   * So the resolver reads the answer against the question — with the
   * question's own action schema as the model's grammar — and the matcher
   * is what answers when it cannot.
   */
  const read = deps.resolve
    ? await deps.resolve(input)
    : resolveUtterance(input, {
        vocabulary: deps.vocabulary,
        connectors: deps.connectors,
        connectorsUnavailable: deps.connectorsUnavailable,
        connectorProperties: deps.connectorProperties,
        masterDatasets: deps.masterDatasets,
      });

  /** What the question's own matcher makes of the reply, if anything. */
  const matched = answerTo(deps.prompt, input);
  const matchedAction = matched?.action;
  const literal =
    matchedAction && !asksSomethingElse(input, matchedAction)
      ? matchedAction
      : undefined;

  /**
   * A request the flow cannot honour yet is answered with what is missing.
   *
   * The user asked for this: any request at any point, and a reply that
   * says what has to happen first rather than one that refuses. It is
   * checked against the words too, not only against a resolved action —
   * "dedup on order_id" before a sample resolves to nothing, because a
   * dataset with no fields has no `order_id`, and "I did not understand
   * that" would be both unhelpful and untrue.
   *
   * Computed here, before anything runs, so it gates the matcher's own
   * direct answer below too — that answer used to run first and be checked
   * against this only if it fell through to a fresh instruction, which let
   * "dedup on order_id" typed as a choice-question answer write the key
   * before there was a schema to hold it.
   */
  const state = stateOf(deps);

  /**
   * A reading the matcher settled on outright — a choice matched by its own
   * label, or a confirm card already said yes to — runs directly, exactly as
   * before. A prose reading never lands here: `answerTo` always marks it
   * `confirm`, so it takes the same fork as any other guess, below, rather
   * than a path of its own.
   */
  if (read.status !== 'resolved' && literal && !matched?.confirm) {
    return runLiteralAnswer(literal, input, deps);
  }

  /**
   * A prose answer the model did not also reach is still an answer — it is
   * just never one to write outright. Folding it in here, rather than
   * running it from a path of its own, means it takes the same fork every
   * other guess takes below: refused if it turns out not to be dataset
   * work, proposed otherwise.
   */
  const asAnswered: Resolution | undefined =
    read.status !== 'resolved' && matched?.confirm && matchedAction
      ? {
          status: 'resolved',
          action: matchedAction,
          confidence: 0,
          needsConfirmation: true,
        }
      : undefined;

  /**
   * Two readings that agree need no confirming.
   *
   * Every model reading arrives as a proposal, which is right for an
   * inference and wrong for an answer — confirming "Event" at the type
   * question is asking the user to say the same thing twice. But an offered
   * option is not enough on its own to skip the confirmation: "write me a
   * poem about ducks" was once read as "leave the schema as it is", which
   * is an offered option, and performed. What makes it an answer is that
   * the *matcher* reaches it too, from the words as typed. When both
   * readings agree, there is nothing left to check.
   */
  const resolution =
    read.status === 'resolved' &&
    read.action &&
    read.needsConfirmation &&
    literal &&
    sameAction(literal, read.action)
      ? { ...read, needsConfirmation: false }
      : (asAnswered ?? read);

  /*
    An *inferred* action is worse evidence than the words it was inferred
    from. Found in the browser: "dedup on sensor_id" before a sample was
    guessed — by the model, since the rules decline a field that cannot
    exist yet — as a connector action, and the reply explained the
    connector's prerequisite instead of deduplication's. So a guess is only
    consulted when the words themselves say nothing.
  */
  const guessed = Boolean(resolution.needsConfirmation);
  const fromAction =
    resolution.status === 'resolved' && resolution.action
      ? unmetForAction(resolution.action, state)
      : undefined;

  const blocked = guessed
    ? (unmetForUtterance(input, state) ?? fromAction)
    : (fromAction ?? unmetForUtterance(input, state));

  if (blocked) {
    return {
      messages: [
        {
          role: 'assistant',
          text: blocked.text,
          failureCode:
            blocked.requirement === 'dataset' ? 'NO_DATASET' : 'NO_SCHEMA',
        },
      ],
      applied: [],
    };
  }

  /**
   * An inferred action is proposed, not performed.
   *
   * Confirming costs one click; a wrong write costs the user a change to
   * their dataset that they then have to find and undo. Measured live, a
   * 0.6B model gets this wrong often enough that the click is the better
   * trade.
   */
  /**
   * A guess at something that was never dataset work is refused, not
   * proposed.
   *
   * Found in the browser: at the schema question, "write me a poem about
   * ducks" came back from the model as an answer to it, and was applied. The
   * model is asked to answer whatever question is on the table, so it will
   * always find *something*.
   *
   * The test is deliberately narrow — a request addressed to the assistant,
   * or, with a question that has a closed set of answers (or none at all),
   * anything not about a dataset. This used to skip the "not about a
   * dataset" half of the test entirely whenever any question was on the
   * table, which let a guess at something like "what is the weather in
   * Bangalore" through as a proposal as long as some question — any
   * question — happened to be pending. A question that takes prose is still
   * exempted: there is no closed vocabulary to fail, and a name like
   * "Telemetry Events" would fail this test as readily as the weather would.
   */
  if (
    resolution.status === 'resolved' &&
    resolution.needsConfirmation &&
    (isAddressedRequest(input) ||
      (!deps.prompt?.freeText && !isAboutDataset(input, deps.vocabulary)))
  ) {
    return {
      messages: [
        {
          role: 'assistant',
          text: narrateResolution(
            { status: 'unknown', confidence: 0 },
            { onTopic: false },
          ).text,
        },
      ],
      applied: [],
    };
  }

  /**
   * A destructive kind always proposes here too, not only when it reaches
   * `runOneStep` by way of a router — `DESTRUCTIVE_KINDS` is the engine's
   * own safety valve, and an exact rule match is confident evidence of what
   * the words meant, not of whether undoing the result is worth a click.
   */
  if (
    resolution.status === 'resolved' &&
    resolution.action &&
    (resolution.needsConfirmation ||
      DESTRUCTIVE_KINDS.has(resolution.action.kind))
  ) {
    return { messages: [proposeAction(resolution.action)], applied: [] };
  }

  if (resolution.status === 'resolved' && resolution.action?.kind === 'undo') {
    return runUndo(deps);
  }

  // Conversation-only, here exactly as it is from the router: `explain`
  // writes nothing, so it must never reach `deps.execute` below, whichever
  // tier — the rules or the model — is the one that resolved it.
  if (
    resolution.status === 'resolved' &&
    resolution.action?.kind === 'explain'
  ) {
    return { messages: [explainMessage(resolution.action)], applied: [] };
  }

  if (resolution.status !== 'resolved' || !resolution.action) {
    /**
     * Nothing could be done with it, so the reply has to be honest about
     * *why*. An instruction about the weather is refused as outside the job;
     * an instruction about the dataset that could not be parsed is asked
     * about, pointing at the question on the table rather than at examples
     * naming fields this dataset may not have.
     */
    const narration = narrateResolution(resolution, {
      said: input,
      onTopic: isAboutDataset(input, deps.vocabulary),
      fieldPaths: deps.vocabulary.entries
        .filter((entry) => entry.isLeaf)
        .map((entry) => entry.path),
      ...(deps.prompt ? { asked: deps.prompt.text } : {}),
    });

    return {
      messages: [
        {
          role: 'assistant',
          text: narration.text,
          ...(narration.card ? { card: narration.card } : {}),
        },
      ],
      applied: [],
    };
  }

  const { outcome, message } = await runAction(resolution.action, deps);

  return {
    messages: [message],
    applied: ran(resolution.action, outcome),
  };
};
