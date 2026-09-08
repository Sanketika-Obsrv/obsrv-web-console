/**
 * The action schema the model is actually given, scoped to the current step.
 *
 * Measured before writing this: the full 27-action schema with field paths
 * pinned into its enums costs ~7,262 tokens for a 120-field dataset, which
 * does not fit the model's 4,096-token context at all. Two decisions follow.
 *
 * **Scope to the step.** Storage needs two action kinds, not twenty-seven.
 * The step is known, so offering the rest is pure cost — and a smaller choice
 * is also an easier one for a 0.6B model to get right.
 *
 * **Leave field paths unpinned.** Pinning is what made the schema grow with
 * the dataset's width. A plain string plus `resolveField` is safe because
 * that resolver already maps a name to a path, returns candidates when it is
 * ambiguous, and the executor refuses an unknown field regardless. Pinning
 * was belt-and-braces on top of a guard that already works, and it cost most
 * of the context window.
 *
 * Result: ~437-859 tokens per step, constant however wide the dataset is.
 */
import { ActionKind, WizardStep, buildActionSchema } from '../engine/actions';

type JsonSchema = Record<string, unknown>;

/**
 * Reachable from anywhere.
 *
 * `clarify` is the model's way out of an instruction it cannot map; without
 * it the only alternative to guessing would be silence. `goto_step` keeps the
 * user able to move even if the assistant has misjudged where they are.
 */
const ALWAYS: ActionKind[] = ['clarify', 'goto_step'];

/** What each step can actually do, from the plan's scenario table. */
export const STEP_ACTIONS: Record<WizardStep, ActionKind[]> = {
  connector: [
    ...ALWAYS,
    'select_connector',
    'set_connector_field',
    'request_connector_secrets',
    'skip_connector',
  ],
  ingestion: [
    ...ALWAYS,
    'set_dataset_name',
    'set_dataset_type',
    'attach_sample',
  ],
  schema: [
    ...ALWAYS,
    'set_data_type',
    'set_arrival_format',
    'toggle_required',
    'set_description',
    'add_field',
    'delete_field',
    'resolve_conflict',
  ],
  processing: [
    ...ALWAYS,
    'set_additional_fields',
    'set_pii',
    'add_transformation',
    'add_derived_field',
    'set_dedup',
    'set_denorm',
  ],
  storage: [...ALWAYS, 'set_storage', 'set_keys'],
  // The last step is where the dataset is reviewed and committed.
  preview: [...ALWAYS, 'save', 'undo', 'explain'],
};

export interface StepSchemaOptions {
  /**
   * Accepted and deliberately ignored for the path slots, so callers can pass
   * the vocabulary without silently reintroducing the pinning that broke the
   * context budget. It is still used for connector properties, whose count is
   * bounded by the connector rather than the dataset.
   */
  fieldPaths?: string[];
  connectorProperties?: string[];
}

const kindOf = (variant: unknown): string =>
  (variant as { properties?: { kind?: { const?: string } } })?.properties?.kind
    ?.const ?? '';

/** The action schema for one step, with unpinned field paths. */
export const buildStepSchema = (
  step: WizardStep,
  { connectorProperties }: StepSchemaOptions = {},
): JsonSchema => {
  const allowed = STEP_ACTIONS[step] ?? [];

  // `fieldPaths` is intentionally not forwarded: that is the pinning.
  const full = buildActionSchema({ connectorProperties });
  const variants = (full.oneOf as unknown[]).filter((variant) =>
    allowed.includes(kindOf(variant) as ActionKind),
  );

  return {
    ...full,
    properties: { kind: { type: 'string', enum: allowed } },
    oneOf: variants,
  };
};

/** Rough token count. JSON averages a little over three characters a token. */
export const estimateTokens = (value: unknown): number =>
  Math.round(JSON.stringify(value).length / 3.3);
