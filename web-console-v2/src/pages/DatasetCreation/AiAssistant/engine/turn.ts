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
import { sectionForAction } from './previewFocus';
import { NewMessage } from '../session/sessionStore';
import { resolveUtterance } from './ruleResolver';

export interface TurnDeps {
  vocabulary: FieldVocabulary;
  execute: (action: Action) => Promise<ExecutionOutcome>;
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

const runAction = async (
  action: Action,
  deps: TurnDeps,
): Promise<{ outcome: ExecutionOutcome; message: NewMessage }> => {
  let outcome: ExecutionOutcome;

  try {
    outcome = await deps.execute(action);
  } catch (cause) {
    outcome = threw(cause);
  }

  const narration = narrateOutcome(action, outcome);

  return {
    outcome,
    message: {
      role: 'assistant',
      text: narration.text,
      action,
      ...(narration.card ? { card: narration.card } : {}),
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
  const resolution = resolveUtterance(input, { vocabulary: deps.vocabulary });

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
