import { WizardStep } from '../engine/actions';
import { STEP_ACTIONS, buildStepSchema, estimateTokens } from './stepSchema';

/** The model's context window, from `prebuiltAppConfig`. */
const CONTEXT = 4096;

/** Leave room for the system prompt, the vocabulary hint and the exchange. */
const SCHEMA_BUDGET = 1200;

const kindsIn = (schema: Record<string, unknown>) =>
  (schema.oneOf as { properties: { kind: { const: string } } }[]).map(
    (variant) => variant.properties.kind.const,
  );

describe('scoping the action schema to a step', () => {
  it('offers only the storage actions at the storage step', () => {
    expect(kindsIn(buildStepSchema('storage')).sort()).toEqual([
      'clarify',
      'goto_step',
      'set_keys',
      'set_storage',
    ]);
  });

  it('offers the schema-editing actions at the schema step', () => {
    expect(kindsIn(buildStepSchema('schema'))).toEqual(
      expect.arrayContaining([
        'set_data_type',
        'set_arrival_format',
        'toggle_required',
        'resolve_conflict',
      ]),
    );
  });

  it('does not offer storage actions at the schema step', () => {
    expect(kindsIn(buildStepSchema('schema'))).not.toContain('set_storage');
  });

  /**
   * `clarify` has to be reachable everywhere: asking is the model's way out
   * of an instruction it cannot map, and removing it would push it to guess.
   */
  it('always offers clarify', () => {
    (
      [
        'connector',
        'ingestion',
        'schema',
        'processing',
        'storage',
        'preview',
      ] as WizardStep[]
    ).forEach((step) => {
      expect(kindsIn(buildStepSchema(step))).toContain('clarify');
    });
  });

  it('always offers a way to move between steps', () => {
    (['ingestion', 'schema', 'processing', 'storage'] as WizardStep[]).forEach(
      (step) => {
        expect(kindsIn(buildStepSchema(step))).toContain('goto_step');
      },
    );
  });

  it('offers save only where saving makes sense', () => {
    expect(kindsIn(buildStepSchema('preview'))).toContain('save');
    expect(kindsIn(buildStepSchema('schema'))).not.toContain('save');
  });

  it('names every step, so a new step cannot silently offer nothing', () => {
    (
      [
        'connector',
        'ingestion',
        'schema',
        'processing',
        'storage',
        'preview',
      ] as WizardStep[]
    ).forEach((step) => {
      expect(STEP_ACTIONS[step].length).toBeGreaterThan(0);
    });
  });
});

/**
 * The measurements that drove this design. A 120-field dataset with paths
 * pinned into the enums produced ~7,262 tokens — more than the whole context.
 */
describe('fitting the context window', () => {
  const wideVocabulary = Array.from(
    { length: 120 },
    (_unused, index) => `field_${index}`,
  );

  it('stays inside the budget at every step, however wide the dataset', () => {
    const oversized = (
      [
        'connector',
        'ingestion',
        'schema',
        'processing',
        'storage',
        'preview',
      ] as WizardStep[]
    )
      .map((step) => ({
        step,
        tokens: estimateTokens(
          buildStepSchema(step, { fieldPaths: wideVocabulary }),
        ),
      }))
      .filter((entry) => entry.tokens > SCHEMA_BUDGET);

    expect(oversized).toEqual([]);
  });

  /** The point of the change: width must not affect the schema at all. */
  it('costs the same for a wide dataset as a narrow one', () => {
    const narrow = estimateTokens(
      buildStepSchema('schema', { fieldPaths: ['order_id'] }),
    );
    const wide = estimateTokens(
      buildStepSchema('schema', { fieldPaths: wideVocabulary }),
    );

    expect(wide).toBe(narrow);
  });

  it('leaves most of the context for the prompt and the conversation', () => {
    const largest = Math.max(
      ...(
        [
          'connector',
          'ingestion',
          'schema',
          'processing',
          'storage',
          'preview',
        ] as WizardStep[]
      ).map((step) => estimateTokens(buildStepSchema(step))),
    );

    expect(CONTEXT - largest).toBeGreaterThan(CONTEXT * 0.6);
  });
});

describe('estimateTokens', () => {
  it('grows with the document', () => {
    expect(estimateTokens({ a: 'x'.repeat(330) })).toBeGreaterThan(
      estimateTokens({ a: 'x' }),
    );
  });

  it('reports something for a small document', () => {
    expect(estimateTokens({ a: 1 })).toBeGreaterThan(0);
  });
});

/**
 * Scoping to a step means a wrong step yields a plausible wrong action rather
 * than a refusal, so what is on offer has to shrink as work is completed.
 */
describe('withdrawing actions that are already done', () => {
  it('offers naming and sampling before the draft exists', () => {
    const kinds = kindsIn(buildStepSchema('ingestion'));

    expect(kinds).toContain('set_dataset_name');
    expect(kinds).toContain('attach_sample');
  });

  it('withdraws both once the draft exists', () => {
    const kinds = kindsIn(buildStepSchema('ingestion', { hasDraft: true }));

    expect(kinds).not.toContain('set_dataset_name');
    expect(kinds).not.toContain('attach_sample');
  });

  it('still leaves a way to ask and to move on', () => {
    const kinds = kindsIn(buildStepSchema('ingestion', { hasDraft: true }));

    expect(kinds).toContain('clarify');
    expect(kinds).toContain('goto_step');
  });

  it('does not disturb the other steps', () => {
    expect(
      kindsIn(buildStepSchema('schema', { hasDraft: true })).sort(),
    ).toEqual(kindsIn(buildStepSchema('schema')).sort());
  });
});
