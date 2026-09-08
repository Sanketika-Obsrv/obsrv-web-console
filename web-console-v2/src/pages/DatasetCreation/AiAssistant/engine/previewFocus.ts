/**
 * Decides what the preview pane should show after an action.
 *
 * Two questions, both pure: which accordion to open, and which schema rows to
 * flash. Keeping them out of the component means the mapping is tested
 * directly and a new action kind cannot quietly default to the wrong panel.
 */
import { Action, ActionKind, WizardStep } from './actions';

/** The accordions `AllConfigurations` renders, in the order it renders them. */
export const PREVIEW_SECTIONS = [
  'connector',
  'ingestion',
  'processing',
  'storage',
] as const;

export type PreviewSection = (typeof PREVIEW_SECTIONS)[number];

/**
 * Which accordion each action's change lands in.
 *
 * The schema actions map to `ingestion` because the ingestion accordion is
 * where `AllConfigurations` renders the data schema — there is no separate
 * schema panel, even though the wizard has a separate schema *step*.
 */
const SECTION_BY_KIND: Partial<Record<ActionKind, PreviewSection>> = {
  set_dataset_name: 'ingestion',
  set_dataset_type: 'ingestion',
  attach_sample: 'ingestion',
  set_data_type: 'ingestion',
  set_arrival_format: 'ingestion',
  toggle_required: 'ingestion',
  set_description: 'ingestion',
  add_field: 'ingestion',
  delete_field: 'ingestion',
  resolve_conflict: 'ingestion',

  set_additional_fields: 'processing',
  set_pii: 'processing',
  add_transformation: 'processing',
  add_derived_field: 'processing',
  set_dedup: 'processing',
  set_denorm: 'processing',

  set_storage: 'storage',
  set_keys: 'storage',

  select_connector: 'connector',
  set_connector_field: 'connector',
  request_connector_secrets: 'connector',
  skip_connector: 'connector',
};

const SECTION_BY_STEP: Partial<Record<WizardStep, PreviewSection>> = {
  connector: 'connector',
  ingestion: 'ingestion',
  // The schema step's content lives in the ingestion accordion.
  schema: 'ingestion',
  processing: 'processing',
  storage: 'storage',
};

export const sectionForStep = (step: WizardStep): PreviewSection | undefined =>
  SECTION_BY_STEP[step];

export const sectionForAction = (
  action: Action,
): PreviewSection | undefined => {
  if (action.kind === 'goto_step') return sectionForStep(action.step);

  return SECTION_BY_KIND[action.kind];
};

/** Inverse of `refFromPath`: `properties.customer.properties.email` → `customer.email`. */
export const pathFromRef = (ref: string): string =>
  ref
    .split('.')
    .filter((segment) => segment !== 'properties')
    .join('.');

/**
 * The rows to flash, given the refs an action changed.
 *
 * `generate-fields` already flattens nested fields into their own rows with a
 * dotted `column` (`customer.email`), so a nested ref usually matches a row
 * directly. The ancestor walk is the fallback for a field that has no row of
 * its own — an array element, or a field the projection did not return.
 */
export const highlightColumns = (
  changedRefs: string[] | undefined,
  columns: string[] | undefined,
): string[] => {
  if (!changedRefs?.length || !columns?.length) return [];

  const visible = new Set(columns);
  const matched = changedRefs.map((ref) => {
    const path = pathFromRef(ref);

    if (visible.has(path)) return path;

    // Walk up to the nearest rendered ancestor.
    const segments = path.split('.');
    for (let end = segments.length - 1; end > 0; end -= 1) {
      const ancestor = segments.slice(0, end).join('.');
      if (visible.has(ancestor)) return ancestor;
    }

    return undefined;
  });

  return [...new Set(matched.filter((column): column is string => !!column))];
};
