import { ACTION_KINDS, Action, WIZARD_STEPS, WizardStep } from './actions';
import {
  PREVIEW_SECTIONS,
  highlightColumns,
  pathFromRef,
  sectionForAction,
  sectionForStep,
  stepAfterAction,
} from './previewFocus';

describe('sectionForAction', () => {
  const sectionOf = (action: Action) => sectionForAction(action);

  it('sends naming and schema edits to the ingestion accordion', () => {
    expect(sectionOf({ kind: 'set_dataset_name', name: 'Orders' })).toBe(
      'ingestion',
    );
    expect(sectionOf({ kind: 'attach_sample', fileName: 'o.json' })).toBe(
      'ingestion',
    );
    expect(
      sectionOf({
        kind: 'set_data_type',
        path: 'order_id',
        dataType: 'string',
      }),
    ).toBe('ingestion');
    expect(sectionOf({ kind: 'delete_field', path: 'order_id' })).toBe(
      'ingestion',
    );
  });

  it('sends validation, dedup and transformations to processing', () => {
    expect(sectionOf({ kind: 'set_additional_fields', allow: true })).toBe(
      'processing',
    );
    expect(sectionOf({ kind: 'set_dedup', enabled: false })).toBe('processing');
    expect(
      sectionOf({
        kind: 'set_pii',
        path: 'customer.email',
        action: 'mask',
        skipOnFailure: true,
      }),
    ).toBe('processing');
  });

  it('sends stores and keys to storage', () => {
    expect(sectionOf({ kind: 'set_storage', realtime: true })).toBe('storage');
    expect(sectionOf({ kind: 'set_keys', primary: 'order_id' })).toBe(
      'storage',
    );
  });

  it('sends connector actions to the connector accordion', () => {
    expect(sectionOf({ kind: 'select_connector', connectorId: 'jdbc' })).toBe(
      'connector',
    );
    expect(sectionOf({ kind: 'skip_connector' })).toBe('connector');
  });

  it('follows an explicit goto_step', () => {
    expect(sectionOf({ kind: 'goto_step', step: 'storage' })).toBe('storage');
  });

  /** Conversation-only actions must not yank the preview to another panel. */
  it('leaves the preview alone for actions that change nothing', () => {
    expect(sectionOf({ kind: 'explain', topic: 'dedup' })).toBeUndefined();
    expect(sectionOf({ kind: 'clarify', question: 'which field?' })).toBe(
      undefined,
    );
    expect(sectionOf({ kind: 'undo' })).toBeUndefined();
  });

  /**
   * A new action kind must be classified deliberately, not silently default to
   * one accordion. This test fails when a kind is added without a decision.
   */
  it('classifies every action kind', () => {
    // `goto_step` reads its `step` payload, so a bare `{ kind }` cannot stand
    // in for it here; the dedicated test above covers it.
    const noSectionByDesign = [
      'explain',
      'clarify',
      'undo',
      'save',
      'goto_step',
    ];

    const unclassified = ACTION_KINDS.filter(
      (kind) =>
        sectionForAction({ kind } as Action) === undefined &&
        !noSectionByDesign.includes(kind),
    );

    expect(unclassified).toEqual([]);
  });
});

describe('sectionForStep', () => {
  it('maps the schema step onto the ingestion accordion, which holds it', () => {
    expect(sectionForStep('schema')).toBe('ingestion');
  });

  it('maps the remaining steps onto their own accordion', () => {
    expect(sectionForStep('connector')).toBe('connector');
    expect(sectionForStep('ingestion')).toBe('ingestion');
    expect(sectionForStep('processing')).toBe('processing');
    expect(sectionForStep('storage')).toBe('storage');
  });

  /** `preview` is the whole pane, so it singles out no accordion. */
  it('has no accordion for the preview step', () => {
    expect(sectionForStep('preview')).toBeUndefined();
  });

  it('resolves every wizard step to a section or a deliberate none', () => {
    const sections = WIZARD_STEPS.map((step: WizardStep) =>
      sectionForStep(step),
    );

    expect(sections.filter(Boolean)).toHaveLength(WIZARD_STEPS.length - 1);
    sections.filter(Boolean).forEach((section) => {
      expect(PREVIEW_SECTIONS).toContain(section);
    });
  });
});

describe('pathFromRef', () => {
  it('inverts refFromPath', () => {
    expect(pathFromRef('properties.order_id')).toBe('order_id');
    expect(pathFromRef('properties.customer.properties.email')).toBe(
      'customer.email',
    );
  });

  it('ignores a ref that is not a properties chain', () => {
    expect(pathFromRef('')).toBe('');
    expect(pathFromRef('dataset_config')).toBe('dataset_config');
  });
});

/**
 * `generate-fields` flattens nested fields into their own rows with a dotted
 * `column`, confirmed live: a dataset with `customer.email` renders rows for
 * both `customer` and `customer.email`. So a nested ref normally matches a row
 * directly, and the ancestor walk only covers a field with no row of its own.
 */
describe('highlightColumns', () => {
  const columns = ['order_id', 'total_amount', 'customer', 'customer.email'];

  it('highlights a top-level field directly', () => {
    expect(highlightColumns(['properties.order_id'], columns)).toEqual([
      'order_id',
    ]);
  });

  it('highlights a nested field on its own row', () => {
    expect(
      highlightColumns(['properties.customer.properties.email'], columns),
    ).toEqual(['customer.email']);
  });

  it('falls back to the visible ancestor when the field has no row', () => {
    expect(
      highlightColumns(
        ['properties.customer.properties.phone'],
        ['order_id', 'customer'],
      ),
    ).toEqual(['customer']);
  });

  it('accepts dot paths as well as refs', () => {
    expect(highlightColumns(['customer.email'], columns)).toEqual([
      'customer.email',
    ]);
  });

  it('de-duplicates two changes that resolve to the same row', () => {
    expect(
      highlightColumns(
        [
          'properties.customer.properties.email',
          'properties.customer.properties.phone',
        ],
        ['order_id', 'customer'],
      ),
    ).toEqual(['customer']);
  });

  it('drops a change whose field is not on screen', () => {
    expect(highlightColumns(['properties.gone'], columns)).toEqual([]);
  });

  it('returns nothing for no changes', () => {
    expect(highlightColumns([], columns)).toEqual([]);
    expect(highlightColumns(undefined, columns)).toEqual([]);
  });

  it('returns nothing when the table has not loaded', () => {
    expect(highlightColumns(['properties.order_id'], undefined)).toEqual([]);
  });
});

/**
 * The step is not cosmetic: it decides which actions the model is offered.
 * Seen live — with the step stuck on `ingestion` after a draft existed, the
 * only offered action that could absorb a free-text instruction was
 * `set_dataset_name`, so the model invented a dataset name instead of
 * declining.
 */
describe('stepAfterAction', () => {
  it('moves to the schema step once a sample has been read', () => {
    expect(stepAfterAction({ kind: 'attach_sample', fileName: 'o.json' })).toBe(
      'schema',
    );
  });

  it('keeps schema edits on the schema step', () => {
    expect(
      stepAfterAction({
        kind: 'set_data_type',
        path: 'order_id',
        dataType: 'string',
      }),
    ).toBe('schema');
  });

  it('moves to processing for a dedup change', () => {
    expect(stepAfterAction({ kind: 'set_dedup', enabled: false })).toBe(
      'processing',
    );
  });

  it('moves to storage for a store change', () => {
    expect(stepAfterAction({ kind: 'set_storage', realtime: true })).toBe(
      'storage',
    );
  });

  it('follows an explicit goto_step', () => {
    expect(stepAfterAction({ kind: 'goto_step', step: 'preview' })).toBe(
      'preview',
    );
  });

  it('leaves the step alone for a conversation-only action', () => {
    expect(
      stepAfterAction({ kind: 'explain', topic: 'dedup' }),
    ).toBeUndefined();
    expect(stepAfterAction({ kind: 'undo' })).toBeUndefined();
  });

  it('assigns a step to every action that changes the dataset', () => {
    const changing = ACTION_KINDS.filter(
      (kind) => !['explain', 'clarify', 'undo', 'goto_step'].includes(kind),
    );

    const unassigned = changing.filter(
      (kind) => stepAfterAction({ kind } as Action) === undefined,
    );

    expect(unassigned).toEqual([]);
  });
});
