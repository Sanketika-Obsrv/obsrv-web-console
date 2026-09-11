/**
 * One turn: an utterance or a card click in, a transcript and an outcome out.
 *
 * The executor is injected rather than imported so this can be tested without
 * a server, and so the model tier can later wrap it. Nothing is written to the
 * session here — the caller owns persistence, which keeps this pure enough to
 * reason about.
 */
import { Prompt } from './agenda';
import { Action } from './actions';
import { ExecutionOutcome } from './executor';
import {
  answerTo,
  isAddressedRequest,
  isAffirmative,
  isNegative,
} from './answer';
import { FieldVocabulary } from './fieldVocabulary';
import {
  NOTHING_TO_UNDO,
  describeProposal,
  narrateOutcome,
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
}

export interface TurnResult {
  /** What to append to the transcript, in order. */
  messages: NewMessage[];
  /** The action that ran, when one did. */
  action?: Action;
  outcome?: ExecutionOutcome;
  /** The change this turn undid, for the caller to mark as spent. */
  undoneMessageId?: string;
}

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

/**
 * The proposal waiting on a yes, when one is.
 *
 * A proposal is live only while it is the most recent thing the assistant
 * said: once anything else has happened, "yes" cannot be about it any more.
 * Reading it from the transcript rather than holding it in state keeps the
 * turn loop free of memory the session would have to persist.
 */
const pendingConfirmation = (history: Message[] = []): Action | undefined => {
  const last = [...history]
    .reverse()
    .find((message) => message.role === 'assistant');

  return last?.card?.kind === 'confirm' && !last.action
    ? last.card.confirmAction
    : undefined;
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
    return { messages: [{ role: 'assistant', text: NOTHING_TO_UNDO }] };
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
    };
  }

  const restored: Action[] = [];
  /** Each restoring action's own inverse, which together make a redo. */
  const inverses: Action[][] = [];
  let redoBlocked: string | undefined;
  let last: ExecutionOutcome | undefined;

  for (const action of target.actions) {
    const step = await runAction(action, deps);
    last = step.outcome;

    if (!step.outcome?.ok) {
      // A partial restoration the user is not told about is worse than a
      // failure, so what did land is said first, then why the rest did not.
      const said: NewMessage[] = restored.length
        ? [{ role: 'assistant', text: narrateUndo(restored, true).text }]
        : [];

      return {
        messages: [...said, step.message],
        action,
        outcome: step.outcome,
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
    action: restored[0],
    outcome: last,
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
 * Runs a turn from typed text, or from an action a card already chose.
 *
 * A card click has nothing to resolve and nothing the user typed, so it
 * produces the assistant turn alone.
 */
export const runTurn = async (
  input: string | Action,
  deps: TurnDeps,
): Promise<TurnResult> => {
  if (typeof input !== 'string') {
    if (input.kind === 'undo') return runUndo(deps);

    const { outcome, message } = await runAction(input, deps);
    return { messages: [message], action: input, outcome };
  }

  const said: NewMessage = { role: 'user', text: input };

  /**
   * A proposal is answered in words, since there is nothing to click.
   *
   * It is read before the agenda's own question because a proposal is the
   * more recent thing asked: "yes" right after "shall I deduplicate on
   * order_id?" is about that, whatever question the agenda still holds.
   * Anything that is neither a yes nor a no abandons it and is treated as a
   * fresh request — a proposal nobody answered is not a queue.
   */
  const proposed = pendingConfirmation(deps.history);

  if (proposed && isAffirmative(input)) {
    const { outcome, message } = await runAction(proposed, deps);

    return { messages: [said, message], action: proposed, outcome };
  }

  if (proposed && isNegative(input)) {
    return {
      messages: [said, { role: 'assistant', text: 'Left it as it was.' }],
    };
  }

  /**
   * "Try again" re-sends what failed.
   *
   * The failed action is recorded on the message it failed in, so there is
   * nothing to remember between turns: the transcript is the retry stack in
   * the same way it is the undo stack.
   */
  if (RETRIES.test(input.trim())) {
    const target = retryTarget(deps.history);

    if (!target) {
      return {
        messages: [
          said,
          {
            role: 'assistant',
            text: 'There is nothing to try again — nothing has failed yet.',
          },
        ],
      };
    }

    const { outcome, message } = await runAction(target, deps);

    return { messages: [said, message], action: target, outcome };
  }

  /**
   * An answer to the question is acted on as it stands.
   *
   * It is tried before resolving because the question is better evidence
   * than the words: "no" means nothing on its own and means "keep the
   * duplicates" right after the deduplication question. `answerTo` returns
   * nothing for a command or a request, so those still reach the resolver.
   */
  const answered = answerTo(deps.prompt, input);

  if (answered && !asksSomethingElse(input, answered)) {
    const { outcome, message } = await runAction(answered, deps);

    return { messages: [said, message], action: answered, outcome };
  }

  const resolution = deps.resolve
    ? await deps.resolve(input)
    : resolveUtterance(input, {
        vocabulary: deps.vocabulary,
        connectors: deps.connectors,
        connectorsUnavailable: deps.connectorsUnavailable,
        connectorProperties: deps.connectorProperties,
        masterDatasets: deps.masterDatasets,
      });

  /**
   * A request the flow cannot honour yet is answered with what is missing.
   *
   * The user asked for this: any request at any point, and a reply that
   * says what has to happen first rather than one that refuses. It is
   * checked against the words too, not only against a resolved action —
   * "dedup on order_id" before a sample resolves to nothing, because a
   * dataset with no fields has no `order_id`, and "I did not understand
   * that" would be both unhelpful and untrue.
   */
  const state = stateOf(deps);

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
        said,
        {
          role: 'assistant',
          text: blocked.text,
          failureCode:
            blocked.requirement === 'dataset' ? 'NO_DATASET' : 'NO_SCHEMA',
        },
      ],
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
   * or, with no question on the table, anything not about a dataset. Vague
   * phrasing at a question ("put it in the lake") is a poor answer, not an
   * off-topic one, and gets the proposal below.
   */
  if (
    resolution.status === 'resolved' &&
    resolution.needsConfirmation &&
    (isAddressedRequest(input) ||
      (!deps.prompt && !isAboutDataset(input, deps.vocabulary)))
  ) {
    return {
      messages: [
        said,
        {
          role: 'assistant',
          text: narrateResolution(
            { status: 'unknown', confidence: 0 },
            { onTopic: false },
          ).text,
        },
      ],
    };
  }

  if (
    resolution.status === 'resolved' &&
    resolution.action &&
    resolution.needsConfirmation
  ) {
    const proposed = resolution.action;

    return {
      messages: [
        said,
        {
          role: 'assistant',
          text: `I think you mean: ${describeProposal(proposed)}.`,
          card: {
            kind: 'confirm',
            title: describeProposal(proposed),
            confirmLabel: 'Do it',
            confirmAction: proposed,
          },
          ...(sectionForAction(proposed)
            ? { section: sectionForAction(proposed) }
            : {}),
        },
      ],
    };
  }

  if (resolution.status === 'resolved' && resolution.action?.kind === 'undo') {
    const undone = await runUndo(deps);

    return { ...undone, messages: [said, ...undone.messages] };
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
        said,
        {
          role: 'assistant',
          text: narration.text,
          ...(narration.card ? { card: narration.card } : {}),
        },
      ],
    };
  }

  const { outcome, message } = await runAction(resolution.action, deps);

  return {
    messages: [said, message],
    action: resolution.action,
    outcome,
  };
};
