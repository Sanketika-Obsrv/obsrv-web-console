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

const turn = (
  text: string,
  execute: (action: Action) => Promise<ExecutionOutcome> = async () => applied,
) => runTurn(text, { vocabulary, execute });

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
