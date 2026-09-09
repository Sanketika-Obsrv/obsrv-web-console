/**
 * One turn: an utterance or a card click in, a transcript and an outcome out.
 *
 * The executor is injected rather than imported so this can be tested without
 * a server, and so the model tier can later wrap it. Nothing is written to the
 * session here — the caller owns persistence, which keeps this pure enough to
 * reason about.
 */
import { ACCEPTS, Prompt } from './agenda';
import { Action } from './actions';
import { ExecutionOutcome } from './executor';
import { answerTo } from './answer';
import { FieldVocabulary } from './fieldVocabulary';
import {
  NOTHING_TO_UNDO,
  describeProposal,
  narrateOutcome,
  narrateResolution,
  narrateUndo,
} from './narrate';
import { countDuplicates, evaluateExpression } from './preflight';
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
   * An answer to the question is acted on as it stands.
   *
   * It is tried before resolving because the question is better evidence
   * than the words: "no" means nothing on its own and means "keep the
   * duplicates" right after the deduplication question. `answerTo` returns
   * nothing for a command or a request, so those still reach the resolver.
   */
  const answered = answerTo(deps.prompt, input);

  if (answered) {
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
      });

  /**
   * An inferred action is proposed, not performed.
   *
   * Confirming costs one click; a wrong write costs the user a change to
   * their dataset that they then have to find and undo. Measured live, a
   * 0.6B model gets this wrong often enough that the click is the better
   * trade.
   */
  /**
   * An inferred action that answers the current question is not a guess in
   * the same sense: the question already narrowed the field, so being wrong
   * means misreading an answer rather than choosing the wrong subject. Those
   * are performed. Anything else keeps the click.
   */
  const onAgenda = (action: Action): boolean =>
    Boolean(deps.prompt && ACCEPTS[deps.prompt.step].includes(action.kind));

  if (
    resolution.status === 'resolved' &&
    resolution.action &&
    resolution.needsConfirmation &&
    !onAgenda(resolution.action)
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
    const narration = narrateResolution(resolution);

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
