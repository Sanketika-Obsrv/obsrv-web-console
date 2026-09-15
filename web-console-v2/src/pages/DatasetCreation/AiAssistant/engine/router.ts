/**
 * The engine's own contract for a router-backed reading.
 *
 * `model/router.ts` is the model-facing half of call A: it owns the grammar,
 * the prompt and the few-shots that get a reading out of the model. This
 * file is the engine-side shape that reading is turned into once it is
 * trusted — the seam a later piece plugs into `TurnDeps`, once the two-call
 * sequencing that produces one of these actually exists. `model/` already
 * imports from `engine/`, never the reverse, which is why this type lives
 * here rather than alongside the model-facing one.
 *
 * Nothing in this file calls a model. `sanitiseRoute` takes the same
 * untrusted-input posture the rest of the resolution pipeline already takes
 * with a model's reply: a reading that cannot be trusted is narrowed down to
 * one that can, never rejected outright, because rejecting the whole turn
 * over one bad field would throw away a step and a reply that were read
 * correctly.
 */
import {
  Action,
  AGENDA_STEPS,
  AgendaStepId,
  createActionValidator,
} from './actions';

export type TurnIntent =
  'answer' | 'request' | 'reply_to_card' | 'ask' | 'other';

/**
 * A capability the assistant declines by construction: the model picks one
 * of these four names, and the engine — not the model — owns the sentence
 * that declines it and names the console screen.
 */
export type OutOfScope = 'publish' | 'delete' | 'navigate' | 'metrics';

export interface RouterResult {
  intent: TurnIntent;
  step?: AgendaStepId;
  reply?: string;
  decision?: 'accept' | 'decline';
  actions?: { action: Action; confirm?: boolean }[];
  outOfScope?: OutOfScope;
  control?: 'undo' | 'retry';
}

export interface SanitiseRouteOptions {
  /** Restricts `set_connector_field` to a connector's non-secret keys. */
  connectorProperties?: string[];
}

/**
 * Narrows a raw router reading to one the engine can act on.
 *
 * `undefined` in is `undefined` out: a caller with nothing to sanitise has
 * nothing to fall back to either, and that decision belongs to the caller.
 * Everything else always returns a `RouterResult` — individual fields are
 * dropped, never the whole reading.
 */
export const sanitiseRoute = (
  raw: RouterResult | undefined,
  options: SanitiseRouteOptions = {},
): RouterResult | undefined => {
  if (!raw) return undefined;

  const validate = createActionValidator({
    connectorProperties: options.connectorProperties,
  });

  // An `ask` is the user's own question and an `other` is a remark outside
  // the job; neither is an instruction, so whatever actions the raw reading
  // carried for one are not something that kind of turn is allowed to mean.
  const actions =
    raw.intent === 'ask' || raw.intent === 'other'
      ? []
      : (raw.actions ?? []).filter((entry) => validate(entry.action).ok);

  const validStep =
    raw.step !== undefined &&
    (AGENDA_STEPS as readonly string[]).includes(raw.step);

  // `step` is cleared before the spread, since spreading `raw` as-is would
  // otherwise carry an invalid one straight through unless it were
  // explicitly overwritten.
  const rest: RouterResult = { ...raw };
  delete rest.step;

  return {
    ...rest,
    ...(validStep ? { step: raw.step } : {}),
    actions,
  };
};
