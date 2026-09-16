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
import {
  ActionKind,
  AgendaStepId,
  WizardStep,
  buildActionSchema,
} from '../engine/actions';
import { ACCEPTS } from '../engine/agenda';

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
    'set_operations_config',
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
    'export_schema',
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

/**
 * The step that can do these actions.
 *
 * Scoping the model's grammar to the current step is what stops it answering
 * with a plausible wrong action — but it also means an action belonging to
 * another step cannot be expressed at all. Found in the browser: at the
 * storage question, "denormalise assistant-customers on customer_id as
 * customer_details" came back unresolved, because `set_denorm` is on the
 * processing step's menu and nothing else's. The request was perfectly
 * clear; the grammar had no word for it.
 *
 * So when the words name a topic of their own, the *topic's* step supplies
 * the grammar. Actions reachable from anywhere are ignored here, since they
 * are on every menu and would match the first step every time.
 */
export const stepForKinds = (kinds: ActionKind[]): WizardStep | undefined =>
  (Object.keys(STEP_ACTIONS) as WizardStep[]).find((step) =>
    STEP_ACTIONS[step].some(
      (kind) => kinds.includes(kind) && !ALWAYS.includes(kind),
    ),
  );

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

/**
 * The action schema for one *question*, which is narrower still.
 *
 * A wizard page holds several questions — processing alone holds masking,
 * validation, transformations, denormalisation and de-duplication — so
 * scoping to the page still offers six ways to be wrong about a yes-or-no
 * question. `ACCEPTS` is the agenda's own list of what answers each
 * question, so this cannot drift from what the assistant will act on: an
 * action outside it would be refused downstream anyway.
 */
export const buildQuestionSchema = (
  question: AgendaStepId,
  { connectorProperties }: StepSchemaOptions = {},
): JsonSchema => {
  const allowed = [...new Set([...ACCEPTS[question], ...ALWAYS])];

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
