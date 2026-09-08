import { Action } from './actions';
import { buildFieldVocabulary } from './fieldVocabulary';
import { ExecutionOutcome } from './executor';
import { runTurn } from './turn';

const FIELDS = [
  { column: 'order_id', data_type: 'string', arrival_format: 'text' },
  { column: 'total_amount', data_type: 'double', arrival_format: 'number' },
  {
    column: 'customer',
    data_type: 'object',
    properties: {
      customer_id: { key: 'customer_id', data_type: 'string' },
      email: { key: 'email', data_type: 'string' },
    },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vocabulary = buildFieldVocabulary(FIELDS as any);

const applied: ExecutionOutcome = {
  ok: true,
  status: 'applied',
  dataset: {},
  changedRefs: ['properties.order_id'],
};

const SAMPLE = [
  { order_id: 'ORD-1', channel: 'web', customer: { email: 'a@x.com' } },
  { order_id: 'ORD-2', channel: 'web', customer: { email: 'b@y.com' } },
  { order_id: 'ORD-1', channel: 'app', customer: { email: 'c@z.com' } },
];

const turn = (
  text: string,
  execute: (action: Action) => Promise<ExecutionOutcome> = async () => applied,
) => runTurn(text, { vocabulary, execute, sampleRows: SAMPLE });

describe('a turn that resolves', () => {
  it('records what the user said', async () => {
    const result = await turn('make order_id required');

    expect(result.messages[0]).toMatchObject({
      role: 'user',
      text: 'make order_id required',
    });
  });

  it('executes the resolved action', async () => {
    const execute = jest.fn(async () => applied);

    await turn('make order_id required', execute);

    expect(execute).toHaveBeenCalledWith({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('answers with what it did', async () => {
    const result = await turn('make order_id required');

    expect(result.messages[1]).toMatchObject({ role: 'assistant' });
    expect(result.messages[1].text).toMatch(/order_id/);
  });

  it('records the action on the assistant turn, as an audit trail', async () => {
    const result = await turn('make order_id required');

    expect(result.messages[1].action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('reports the outcome so the preview can follow', async () => {
    const result = await turn('make order_id required');

    expect(result.action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
    expect(result.outcome).toBe(applied);
  });

  it('tags the turn with the section it touched', async () => {
    const result = await turn('make order_id required');

    expect(result.messages[1].section).toBe('ingestion');
  });
});

describe('a turn whose action was rejected', () => {
  const rejected: ExecutionOutcome = {
    ok: false,
    code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
    error:
      'The storage type "lake_house" is not available. Please use one of the available storage types: realtime_store',
  };

  it('still records both turns', async () => {
    const result = await turn('enable the lakehouse', async () => rejected);

    expect(result.messages).toHaveLength(2);
  });

  it('marks the assistant turn as failed', async () => {
    const result = await turn('enable the lakehouse', async () => rejected);

    expect(result.messages[1].failureCode).toBe(
      'DATASET_UNSUPPORTED_STORAGE_TYPE',
    );
  });

  it('attaches the error card with its retry', async () => {
    const result = await turn('enable the lakehouse', async () => rejected);
    const { card } = result.messages[1];

    expect(card?.kind).toBe('api_error');
    if (card?.kind !== 'api_error') return;
    expect(card.diagnosis.retryAction).toBeDefined();
  });

  it('explains rather than echoing the server text', async () => {
    const result = await turn('enable the lakehouse', async () => rejected);

    expect(result.messages[1].text).not.toContain('lake_house');
  });
});

describe('a turn that could not be resolved', () => {
  it('does not execute anything', async () => {
    const execute = jest.fn(async () => applied);

    await turn('make the thing better', execute);

    expect(execute).not.toHaveBeenCalled();
  });

  it('says it did not understand', async () => {
    const result = await turn('make the thing better');

    expect(result.messages[1].text).toMatch(/did not understand/i);
  });

  it('reports no action, so the preview stays put', async () => {
    const result = await turn('make the thing better');

    expect(result.action).toBeUndefined();
    expect(result.outcome).toBeUndefined();
  });
});

describe('a turn that was ambiguous', () => {
  it('asks which field, without executing', async () => {
    const execute = jest.fn(async () => applied);

    const result = await turn('set id to string', execute);

    expect(execute).not.toHaveBeenCalled();
    expect(result.messages[1].text).toMatch(/which field/i);
  });

  it('offers the candidates as buttons that re-run the instruction', async () => {
    const result = await turn('set id to string');
    const { card } = result.messages[1];

    expect(card?.kind).toBe('choice');
    if (card?.kind !== 'choice') return;

    // Order is match-quality ranking from the field index, not this module's
    // concern, so the assertion is on the set rather than the sequence.
    expect(card.options.map((option) => option.action)).toEqual(
      expect.arrayContaining([
        { kind: 'set_data_type', path: 'order_id', dataType: 'string' },
        {
          kind: 'set_data_type',
          path: 'customer.customer_id',
          dataType: 'string',
        },
      ]),
    );
    expect(card.options).toHaveLength(2);
  });
});

/**
 * A card click has already chosen the action, so there is nothing to resolve.
 * It must still produce a transcript and reach the executor.
 */
describe('dispatching an action directly, from a card', () => {
  it('executes it without resolving anything', async () => {
    const execute = jest.fn(async () => applied);
    const action: Action = { kind: 'save' };

    await runTurn(action, { vocabulary, execute });

    expect(execute).toHaveBeenCalledWith(action);
  });

  it('records only the assistant turn, since the user typed nothing', async () => {
    const result = await runTurn(
      { kind: 'save' },
      {
        vocabulary,
        execute: async () => applied,
      },
    );

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('assistant');
  });

  it('reports the action and the outcome', async () => {
    const result = await runTurn(
      { kind: 'save' },
      {
        vocabulary,
        execute: async () => applied,
      },
    );

    expect(result.action).toEqual({ kind: 'save' });
    expect(result.outcome).toBe(applied);
  });
});

describe('an executor that throws', () => {
  it('reports it as a failure rather than losing the turn', async () => {
    const result = await turn('make order_id required', async () => {
      throw new Error('boom');
    });

    expect(result.messages).toHaveLength(2);
    expect(result.messages[1].failureCode).toBeDefined();
  });

  it('does not claim the change was applied', async () => {
    const result = await turn('make order_id required', async () => {
      throw new Error('boom');
    });

    expect(result.messages[1].text).not.toMatch(/^Done/);
  });
});

/**
 * An expression that will not evaluate must never reach the API, and the user
 * must see why. This is the check the wizard cannot make until it has already
 * sent the request.
 */
describe('preflighting an expression', () => {
  it('does not execute an expression that will not evaluate', async () => {
    const execute = jest.fn(async () => applied);

    await runTurn(
      {
        kind: 'add_derived_field',
        name: 'email_domain',
        expression: '$split(',
        skipOnFailure: true,
      },
      { vocabulary, execute, sampleRows: SAMPLE },
    );

    expect(execute).not.toHaveBeenCalled();
  });

  it('shows the error on the expression card', async () => {
    const result = await runTurn(
      {
        kind: 'add_derived_field',
        name: 'email_domain',
        expression: '$split(',
        skipOnFailure: true,
      },
      { vocabulary, execute: async () => applied, sampleRows: SAMPLE },
    );

    const { card } = result.messages[0];
    expect(card?.kind).toBe('expression_result');
    if (card?.kind !== 'expression_result') return;
    expect(card.error).toBeTruthy();
  });

  it('executes an expression that does evaluate', async () => {
    const execute = jest.fn(async () => applied);

    await runTurn(
      {
        kind: 'add_derived_field',
        name: 'email_domain',
        expression: "$split(customer.email, '@')[1]",
        skipOnFailure: true,
      },
      { vocabulary, execute, sampleRows: SAMPLE },
    );

    expect(execute).toHaveBeenCalled();
  });

  it('shows what the expression produced', async () => {
    const result = await runTurn(
      {
        kind: 'add_derived_field',
        name: 'email_domain',
        expression: "$split(customer.email, '@')[1]",
        skipOnFailure: true,
      },
      { vocabulary, execute: async () => applied, sampleRows: SAMPLE },
    );

    const { card } = result.messages[0];
    expect(card?.kind).toBe('expression_result');
    if (card?.kind !== 'expression_result') return;
    expect(card.results?.map((entry) => entry.output)).toEqual([
      'x.com',
      'y.com',
      'z.com',
    ]);
  });

  it('preflights a transformation the same way', async () => {
    const execute = jest.fn(async () => applied);

    await runTurn(
      {
        kind: 'add_transformation',
        path: 'order_id',
        expression: '$notAFunction(',
        skipOnFailure: true,
      },
      { vocabulary, execute, sampleRows: SAMPLE },
    );

    expect(execute).not.toHaveBeenCalled();
  });

  /** With no sample there is nothing to check against, so it must not block. */
  it('lets the expression through when there is no sample', async () => {
    const execute = jest.fn(async () => applied);

    await runTurn(
      {
        kind: 'add_derived_field',
        name: 'x',
        expression: 'order_id',
        skipOnFailure: true,
      },
      { vocabulary, execute, sampleRows: [] },
    );

    expect(execute).toHaveBeenCalled();
  });
});

/**
 * The wizard's dedup picker says nothing about whether the chosen key is
 * actually unique in the data the user just supplied. Counting it locally is
 * free and changes the advice.
 */
describe('warning about a dedup key that is not unique', () => {
  it('still applies the key the user asked for', async () => {
    const execute = jest.fn(async () => applied);

    await turn('dedup on order_id', execute);

    expect(execute).toHaveBeenCalledWith({
      kind: 'set_dedup',
      enabled: true,
      key: 'order_id',
    });
  });

  it('says how many rows would be dropped', async () => {
    const result = await turn('dedup on order_id');

    expect(result.messages[1].text).toMatch(/1 of 3|1 row/i);
  });

  it('stays quiet when the key is unique in the sample', async () => {
    const result = await runTurn(
      { kind: 'set_dedup', enabled: true, key: 'channel' },
      {
        vocabulary,
        execute: async () => applied,
        sampleRows: [{ channel: 'web' }, { channel: 'app' }],
      },
    );

    expect(result.messages[0].text).not.toMatch(/would be dropped/i);
  });

  it('says nothing about duplicates when dedup is turned off', async () => {
    const result = await runTurn(
      { kind: 'set_dedup', enabled: false },
      { vocabulary, execute: async () => applied, sampleRows: SAMPLE },
    );

    expect(result.messages[0].text).not.toMatch(/would be dropped/i);
  });
});

/**
 * Measured live with Qwen3-0.6B: "I never want to see the same order twice"
 * produced `set_arrival_format` on an unrelated field, and it was applied.
 * An inferred action is now proposed rather than performed — confirming costs
 * a click, a wrong write costs the user a change they have to find and undo.
 */
describe('an inferred action is proposed, not performed', () => {
  const inferred = async (execute: (a: Action) => Promise<ExecutionOutcome>) =>
    runTurn('something only a model would parse', {
      vocabulary,
      execute,
      resolve: async () => ({
        status: 'resolved',
        confidence: 0.85,
        needsConfirmation: true,
        action: {
          kind: 'set_data_type',
          path: 'total_amount',
          dataType: 'string',
        },
      }),
    });

  it('does not execute it', async () => {
    const execute = jest.fn(async () => applied);

    await inferred(execute);

    expect(execute).not.toHaveBeenCalled();
  });

  it('offers it as a confirmation', async () => {
    const result = await inferred(async () => applied);
    const { card } = result.messages[1];

    expect(card?.kind).toBe('confirm');
    if (card?.kind !== 'confirm') return;
    expect(card.confirmAction).toEqual({
      kind: 'set_data_type',
      path: 'total_amount',
      dataType: 'string',
    });
  });

  it('says what it would do, in the present tense', async () => {
    const result = await inferred(async () => applied);

    expect(result.messages[1].text).toMatch(/set total_amount to string/i);
    expect(result.messages[1].text).not.toMatch(/^Done/);
  });

  it('reports no outcome, so the preview does not move', async () => {
    const result = await inferred(async () => applied);

    expect(result.outcome).toBeUndefined();
  });

  /** Confirming dispatches the action directly, which does execute. */
  it('executes once the proposal is confirmed', async () => {
    const execute = jest.fn(async () => applied);
    const action: Action = {
      kind: 'set_data_type',
      path: 'total_amount',
      dataType: 'string',
    };

    await runTurn(action, { vocabulary, execute });

    expect(execute).toHaveBeenCalledWith(action);
  });

  /** A rule match is a pattern the words fit, so it needs no confirmation. */
  it('performs a rule match without asking', async () => {
    const execute = jest.fn(async () => applied);

    await turn('make order_id required', execute);

    expect(execute).toHaveBeenCalled();
  });
});
