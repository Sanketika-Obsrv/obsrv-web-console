/**
 * One turn: an utterance or a card click in, a transcript and an outcome out.
 *
 * The executor is injected rather than imported so this can be tested without
 * a server, and so the model tier can later wrap it. Nothing is written to the
 * session here — the caller owns persistence, which keeps this pure enough to
 * reason about.
 */
import { Action } from './actions';
import { ExecutionOutcome } from './executor';
import { FieldVocabulary } from './fieldVocabulary';
import { narrateOutcome, narrateResolution } from './narrate';
import { countDuplicates, evaluateExpression } from './preflight';
import { sectionForAction } from './previewFocus';
import { MessageCard } from '../messages/types';
import { NewMessage } from '../session/sessionStore';
import { Resolution, resolveUtterance } from './ruleResolver';

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
   * Replaces rule resolution when the model is running. Returns the same
   * `Resolution`, so nothing downstream knows which tier answered.
   */
  resolve?: (utterance: string) => Promise<Resolution>;
}

export interface TurnResult {
  /** What to append to the transcript, in order. */
  messages: NewMessage[];
  /** The action that ran, when one did. */
  action?: Action;
  outcome?: ExecutionOutcome;
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

  return {
    outcome,
    message: {
      role: 'assistant',
      text: `${narration.text}${warning}`,
      action,
      ...(card ? { card } : {}),
      ...(narration.failureCode ? { failureCode: narration.failureCode } : {}),
      ...(sectionForAction(action)
        ? { section: sectionForAction(action) }
        : {}),
    },
  };
};

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
    const { outcome, message } = await runAction(input, deps);
    return { messages: [message], action: input, outcome };
  }

  const said: NewMessage = { role: 'user', text: input };

  const resolution = deps.resolve
    ? await deps.resolve(input)
    : resolveUtterance(input, {
        vocabulary: deps.vocabulary,
        connectors: deps.connectors,
        connectorsUnavailable: deps.connectorsUnavailable,
        connectorProperties: deps.connectorProperties,
      });

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
