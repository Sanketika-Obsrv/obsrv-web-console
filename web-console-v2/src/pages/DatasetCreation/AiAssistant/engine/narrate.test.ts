import { ACTION_KINDS, Action } from './actions';
import { ExecutionOutcome } from './executor';
import { describeProposal, narrateOutcome, narrateResolution } from './narrate';

/**
 * Typed as the applied variant, not the whole union, so a test can add
 * `replayed` to it without the union collapsing.
 */
const applied = (changedRefs: string[] = []) =>
  ({
    ok: true,
    status: 'applied',
    dataset: {},
    changedRefs,
  }) satisfies ExecutionOutcome;

const failed = (code: string, error: string): ExecutionOutcome => ({
  ok: false,
  code,
  error,
});

describe('narrating what was done', () => {
  it('says what changed, naming the field', () => {
    const { text } = narrateOutcome(
      { kind: 'set_data_type', path: 'total_amount', dataType: 'double' },
      applied(['properties.total_amount']),
    );

    expect(text).toContain('total_amount');
    expect(text).toContain('double');
  });

  it('reports a dedup key being set', () => {
    const { text } = narrateOutcome(
      { kind: 'set_dedup', enabled: true, key: 'order_id' },
      applied(),
    );

    expect(text).toMatch(/duplicate/i);
    expect(text).toContain('order_id');
  });

  it('reports dedup being turned off without naming a key', () => {
    const { text } = narrateOutcome(
      { kind: 'set_dedup', enabled: false },
      applied(),
    );

    expect(text).toMatch(/duplicate/i);
    expect(text).not.toMatch(/order_id/);
  });

  it('names the stores it enabled', () => {
    const { text } = narrateOutcome(
      { kind: 'set_storage', realtime: true, lakehouse: false },
      applied(),
    );

    expect(text).toContain('Real-time Store');
  });

  it('mentions the draft being created', () => {
    const { text } = narrateOutcome(
      { kind: 'attach_sample', fileName: 'o.json' },
      {
        ok: true,
        status: 'applied',
        dataset: {},
        changedRefs: [],
        datasetId: 'my-orders',
      },
    );

    expect(text).toContain('my-orders');
  });

  it('says a name was held rather than saved when there is no draft yet', () => {
    const { text } = narrateOutcome(
      { kind: 'set_dataset_name', name: 'My Orders' },
      {
        ok: true,
        status: 'pending',
        pending: { name: 'My Orders' },
      },
    );

    expect(text).toContain('My Orders');
    expect(text).toMatch(/sample|not created|once/i);
  });

  /**
   * A replay means someone else edited the dataset and the action was
   * re-applied against their change. Saying so is the difference between
   * trustworthy and merely quiet.
   */
  it('mentions that a concurrent edit was worked around', () => {
    const { text } = narrateOutcome(
      { kind: 'set_dedup', enabled: false },
      { ...applied(), replayed: true },
    );

    expect(text).toMatch(/changed|re-?appl/i);
  });

  it('says nothing happened for a local-only action', () => {
    const { text } = narrateOutcome(
      { kind: 'goto_step', step: 'storage' },
      {
        ok: true,
        status: 'noop',
      },
    );

    expect(text).toMatch(/storage/i);
  });
});

describe('narrating a failure', () => {
  const outcome = failed(
    'DATASET_UNSUPPORTED_STORAGE_TYPE',
    'The storage type "lake_house" is not available. Please use one of the available storage types: realtime_store',
  );

  it('leads with the explanation, not the server text', () => {
    const { text } = narrateOutcome(
      { kind: 'set_storage', lakehouse: true },
      outcome,
    );

    expect(text).toContain('Data Lakehouse (Hudi)');
    expect(text).not.toContain('lake_house');
  });

  it('carries the failure code, so the transcript records it', () => {
    const { failureCode } = narrateOutcome(
      { kind: 'set_storage', lakehouse: true },
      outcome,
    );

    expect(failureCode).toBe('DATASET_UNSUPPORTED_STORAGE_TYPE');
  });

  it('attaches an error card carrying the diagnosis', () => {
    const { card } = narrateOutcome(
      { kind: 'set_storage', lakehouse: true },
      outcome,
    );

    expect(card?.kind).toBe('api_error');
    if (card?.kind !== 'api_error') return;
    expect(card.diagnosis.code).toBe('DATASET_UNSUPPORTED_STORAGE_TYPE');
    expect(card.diagnosis.recovery).toBe('revise');
  });

  it('offers the retry through the card, not the prose', () => {
    const { card } = narrateOutcome(
      { kind: 'set_storage', lakehouse: true },
      outcome,
    );

    expect(card?.kind).toBe('api_error');
    if (card?.kind !== 'api_error') return;
    expect(card.diagnosis.retryAction).toEqual({
      kind: 'set_storage',
      lakehouse: false,
      realtime: true,
    });
  });

  it('passes a local guard message through as written', () => {
    const { text } = narrateOutcome(
      { kind: 'set_description', path: 'x', description: 'y' },
      failed('UNKNOWN_FIELD', 'Unknown field "custmer_id"'),
    );

    expect(text).toBe('Unknown field "custmer_id"');
  });
});

describe('narrating a resolution that could not be acted on', () => {
  it('asks the clarifying question', () => {
    const { text } = narrateResolution({
      status: 'ambiguous',
      confidence: 0,
      clarify: {
        question: 'Which field did you mean by "id"?',
        options: ['order_id', 'customer.customer_id'],
      },
    });

    expect(text).toBe('Which field did you mean by "id"?');
  });

  it('offers the candidates as a choice card', () => {
    const { card } = narrateResolution({
      status: 'ambiguous',
      confidence: 0,
      clarify: {
        question: 'Which field did you mean by "id"?',
        options: ['order_id', 'customer.customer_id'],
      },
      candidateActions: [
        { kind: 'set_data_type', path: 'order_id', dataType: 'string' },
        {
          kind: 'set_data_type',
          path: 'customer.customer_id',
          dataType: 'string',
        },
      ],
    });

    expect(card?.kind).toBe('choice');
    if (card?.kind !== 'choice') return;
    expect(card.options.map((option) => option.label)).toEqual([
      'order_id',
      'customer.customer_id',
    ]);
  });

  /**
   * The candidates have to come back as something the user can click, not as
   * prose they must retype — that is the whole point of the rule-only tier.
   * The resolver builds one complete action per candidate, so nothing here has
   * to know which slot of which action holds a field path.
   */
  it('makes each candidate re-runnable with the original instruction', () => {
    const candidateActions: Action[] = [
      { kind: 'set_data_type', path: 'order_id', dataType: 'string' },
      {
        kind: 'set_data_type',
        path: 'customer.customer_id',
        dataType: 'string',
      },
    ];

    const { card } = narrateResolution({
      status: 'ambiguous',
      confidence: 0,
      clarify: {
        question: 'Which field?',
        options: ['order_id', 'customer.customer_id'],
      },
      candidateActions,
    });

    if (card?.kind !== 'choice') throw new Error('expected a choice card');
    expect(card.options.map((option) => option.action)).toEqual(
      candidateActions,
    );
  });

  it('offers plain labels when the resolver could not build candidates', () => {
    const { card } = narrateResolution({
      status: 'ambiguous',
      confidence: 0,
      clarify: { question: 'Which field?', options: ['order_id'] },
    });

    expect(card).toBeUndefined();
  });

  it('says it did not understand when there is nothing to ask about', () => {
    const { text } = narrateResolution({ status: 'unknown', confidence: 0 });

    expect(text).toMatch(/did not understand|not sure/i);
  });

  it('attaches no card when there are no candidates', () => {
    const { card } = narrateResolution({ status: 'unknown', confidence: 0 });

    expect(card).toBeUndefined();
  });
});

/**
 * `describeProposal` is the label on a confirmation prompt, so it must never
 * be vague. Seen live: a model `clarify` became a "Do it / Cancel" card
 * labelled "applied that change", asking the user to approve something
 * unnamed.
 */
describe('describeProposal', () => {
  it('names every action kind', () => {
    const vague = ACTION_KINDS.filter((kind) =>
      /applied that change/.test(describeProposal({ kind } as Action)),
    );

    expect(vague).toEqual([]);
  });

  it('reads as something not yet done', () => {
    expect(
      describeProposal({
        kind: 'toggle_required',
        path: 'order_id',
        required: true,
      }),
    ).toMatch(/^make /);
  });

  it('describes a type change in the present tense', () => {
    expect(
      describeProposal({
        kind: 'set_data_type',
        path: 'total_amount',
        dataType: 'double',
      }),
    ).toBe('set total_amount to double');
  });

  it('falls back to naming the kind rather than saying nothing useful', () => {
    expect(describeProposal({ kind: 'undo' })).toMatch(/undo/);
  });
});
