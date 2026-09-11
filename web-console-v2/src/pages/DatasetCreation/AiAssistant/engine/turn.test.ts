import { Action } from './actions';
import { diagnose } from './errorMap';
import { Prompt } from './agenda';
import { buildFieldVocabulary } from './fieldVocabulary';
import { ExecutionOutcome } from './executor';
import { awaitingInput, runTurn } from './turn';
import { MessageCard } from '../messages/types';
import { Message } from '../session/types';

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
 * An inferred action is proposed rather than performed — confirming costs one
 * word, a wrong write costs the user a change they have to find and undo.
 *
 * The utterance here names a field, so it is dataset work by any reading:
 * off-topic input is refused outright rather than proposed, however
 * confidently the model answers it.
 */
describe('an inferred action is proposed, not performed', () => {
  const inferred = async (execute: (a: Action) => Promise<ExecutionOutcome>) =>
    // Names a field, so it is dataset work by any reading: with no question
    // on the table, input that is about nothing is refused rather than
    // proposed.
    runTurn('keep total_amount as words instead', {
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

describe('undo', () => {
  const change = (overrides: Partial<Message> = {}): Message => ({
    id: 'm1',
    role: 'assistant',
    text: 'Done — set order_id to double.',
    createdAt: 1,
    action: { kind: 'set_data_type', path: 'order_id', dataType: 'double' },
    inverse: [{ kind: 'set_data_type', path: 'order_id', dataType: 'string' }],
    ...overrides,
  });

  const undo = (
    history: Message[],
    execute: (action: Action) => Promise<ExecutionOutcome> = async () =>
      applied,
  ) => runTurn('undo that', { vocabulary, execute, history });

  it('says there is nothing to undo when nothing has changed', async () => {
    const result = await undo([]);

    expect(result.messages[1].text).toMatch(/nothing to undo/i);
    expect(result.action).toBeUndefined();
  });

  it('re-PATCHes the recorded inverse through the executor', async () => {
    const execute = jest.fn(async () => applied);

    await undo([change()], execute);

    expect(execute).toHaveBeenCalledWith({
      kind: 'set_data_type',
      path: 'order_id',
      dataType: 'string',
    });
  });

  it('says what it put back', async () => {
    const result = await undo([change()]);

    expect(result.messages[1].text).toBe('Undone. I set order_id to string.');
  });

  it('names the change it spent, so it cannot be undone twice', async () => {
    const result = await undo([change({ id: 'm7' })]);

    expect(result.undoneMessageId).toBe('m7');
  });

  /**
   * The restoring write computes its own inverse, so undoing an undo is a
   * redo — no separate mechanism, and no third state to keep in step.
   */
  it('carries an inverse of its own, which makes the next undo a redo', async () => {
    const result = await undo([change()], async () => ({
      ...applied,
      inverse: [
        { kind: 'set_data_type', path: 'order_id', dataType: 'double' },
      ],
    }));

    expect(result.messages[1].inverse).toEqual([
      { kind: 'set_data_type', path: 'order_id', dataType: 'double' },
    ]);
  });

  it('explains why a change cannot be undone instead of skipping it', async () => {
    const blocked = change({
      id: 'm2',
      inverse: undefined,
      undoBlocked: 'I cannot take back the sample.',
    });
    const execute = jest.fn(async () => applied);

    const result = await undo([change(), blocked], execute);

    expect(result.messages[1]).toMatchObject({
      text: 'I cannot take back the sample.',
      failureCode: 'NOT_UNDOABLE',
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('sends every action a multi-step restoration needs, in order', async () => {
    // Typed, so `mock.calls` is a tuple the assertion below can index.
    const execute = jest.fn<Promise<ExecutionOutcome>, [Action]>(
      async () => applied,
    );
    const deleted = change({
      action: { kind: 'delete_field', path: 'customer.email' },
      inverse: [
        {
          kind: 'add_field',
          name: 'email',
          parentPath: 'customer',
          arrivalFormat: 'text',
          dataType: 'string',
        },
        {
          kind: 'toggle_required',
          path: 'customer.email',
          required: true,
        },
      ],
    });

    const result = await undo([deleted], execute);

    expect(execute.mock.calls.map(([action]) => action.kind)).toEqual([
      'add_field',
      'toggle_required',
    ]);
    expect(result.messages[1].text).toBe(
      'Undone. I added customer.email and made customer.email required.',
    );
  });

  /**
   * A restoration that stops half way has still changed the dataset, so what
   * landed is reported before the failure. Silence here would leave the user
   * believing nothing happened.
   */
  it('reports what landed before a failure part way through', async () => {
    const deleted = change({
      inverse: [
        {
          kind: 'add_field',
          name: 'email',
          parentPath: 'customer',
          arrivalFormat: 'text',
          dataType: 'string',
        },
        { kind: 'toggle_required', path: 'customer.email', required: true },
      ],
    });

    const execute = jest
      .fn<Promise<ExecutionOutcome>, [Action]>()
      .mockResolvedValueOnce(applied)
      .mockResolvedValueOnce({
        ok: false,
        code: 'PATCH_FAILED',
        error: 'The dataset is outdated.',
      });

    const result = await undo([deleted], execute);

    expect(result.messages[1].text).toMatch(/put part of that back/i);
    expect(result.messages[1].text).toContain('added customer.email');
    expect(result.messages[2].failureCode).toBe('PATCH_FAILED');
    expect(result.undoneMessageId).toBeUndefined();
  });

  it('undoes from a card as well as from typed text', async () => {
    const execute = jest.fn(async () => applied);

    await runTurn(
      { kind: 'undo' },
      { vocabulary, execute, history: [change()] },
    );

    expect(execute).toHaveBeenCalledWith({
      kind: 'set_data_type',
      path: 'order_id',
      dataType: 'string',
    });
  });
});

describe('awaitingInput', () => {
  /**
   * The predicate that decides whether the caller may follow this turn with
   * the agenda's next question. A card the assistant is waiting on means no:
   * two prompts in one turn give the user two things to click and no way to
   * tell which is wanted.
   */
  const carrying = (kind: string) =>
    awaitingInput([
      { role: 'assistant', text: 'x', card: { kind } as MessageCard },
    ]);

  it('is true for a card the assistant is waiting on', () => {
    ['confirm', 'choice', 'conflict', 'file_drop', 'secret_form'].forEach(
      (kind) =>
        expect({ kind, awaiting: carrying(kind) }).toEqual({
          kind,
          awaiting: true,
        }),
    );
  });

  it('is false for a card that only reports what happened', () => {
    // A rejected action must still be followed by the question, or a refused
    // name is a dead end rather than a re-ask.
    ['api_error', 'expression_result', 'field_table', 'sample_preview'].forEach(
      (kind) =>
        expect({ kind, awaiting: carrying(kind) }).toEqual({
          kind,
          awaiting: false,
        }),
    );
  });

  it('is false for a turn that produced no card at all', () => {
    expect(awaitingInput([{ role: 'assistant', text: 'done' }])).toBe(false);
  });

  it('is false for an empty turn', () => {
    expect(awaitingInput([])).toBe(false);
  });
});

/**
 * The assistant does one job, and says so.
 *
 * "Ignore anything not related to dataset creation as can't be done" was
 * the ask: an off-topic instruction is refused plainly rather than reported
 * as a dataset instruction that could not be parsed.
 */
describe('something that is not dataset work', () => {
  it('says it cannot be done here', async () => {
    const execute = jest.fn(async () => applied);

    const result = await runTurn('what is the weather in Bangalore', {
      vocabulary,
      execute,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.messages[1].text).toMatch(/only work on this dataset/i);
  });

  it('still asks about a dataset instruction it could not parse', async () => {
    const result = await runTurn('the amount column ought to be textual', {
      vocabulary,
      execute: async () => applied,
    });

    expect(result.messages[1].text).not.toMatch(/only work on this dataset/i);
  });

  /** An example has to come from the dataset in hand, not from a fixture. */
  it('names a real field when it gives an example', async () => {
    const theirs = buildFieldVocabulary([
      { column: 'sensor_id', data_type: 'string', arrival_format: 'text' },
      { column: 'reading', data_type: 'double', arrival_format: 'number' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    const result = await runTurn('hmm', {
      vocabulary: theirs,
      execute: async () => applied,
    });

    expect(result.messages[1].text).toMatch(/sensor_id/);
    expect(result.messages[1].text).not.toMatch(/order_id/);
  });

  it('points at the question rather than at examples', async () => {
    const result = await runTurn('hmm', {
      vocabulary,
      execute: async () => applied,
      prompt: {
        step: 'keys',
        text: 'Which field is the timestamp?',
        card: { kind: 'choice', options: [] },
      },
    });

    expect(result.messages[1].text).toContain('Which field is the timestamp?');
  });
});

describe('answering the question on the table', () => {
  const STORAGE: Prompt = {
    step: 'storage',
    text: 'Where should this data be stored?',
    card: {
      kind: 'choice',
      options: [
        {
          label: 'Real-time store',
          action: { kind: 'set_storage', realtime: true },
        },
        {
          label: 'Lakehouse',
          action: { kind: 'set_storage', lakehouse: true },
        },
      ],
    },
  };

  const NAME: Prompt = {
    step: 'name',
    text: 'What would you like to call this dataset?',
    freeText: (name) => ({ kind: 'set_dataset_name', name }),
  };

  const asked = (
    prompt: Prompt,
    text: string,
    execute: (action: Action) => Promise<ExecutionOutcome> = async () =>
      applied,
  ) => runTurn(text, { vocabulary, execute, prompt });

  it('performs an answer without asking for it twice', async () => {
    const execute = jest.fn(async () => applied);

    const result = await asked(STORAGE, 'lakehouse please', execute);

    expect(execute).toHaveBeenCalledWith({
      kind: 'set_storage',
      lakehouse: true,
    });
    expect(result.messages[1].card?.kind).not.toBe('confirm');
  });

  it('takes prose as the answer where the question asked for prose', async () => {
    const execute = jest.fn(async () => applied);

    await asked(NAME, 'My Orders', execute);

    expect(execute).toHaveBeenCalledWith({
      kind: 'set_dataset_name',
      name: 'My Orders',
    });
  });

  /**
   * The agenda drives, but it does not trap: a command at a question that
   * takes prose still reaches the resolver rather than becoming a value.
   */
  it('still hears a command at the name question', async () => {
    const execute = jest.fn(async () => applied);

    const result = await runTurn('undo', {
      vocabulary,
      execute,
      prompt: NAME,
      history: [],
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.messages[1].text).toMatch(/nothing/i);
  });

  it('resolves anything the question did not offer as a request', async () => {
    const execute = jest.fn(async () => applied);

    await asked(STORAGE, 'make order_id required', execute);

    expect(execute).toHaveBeenCalledWith({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  /**
   * An inferred action that answers the current question needs no confirming
   * — the question narrowed the possibilities to the point where a wrong
   * reading is a wrong reading of a yes or no.
   */
  /**
   * A guess is confirmed even when it answers the question.
   *
   * On-agenda guesses used to be performed outright, on the grounds that the
   * question had already narrowed the field. Found in the browser: at the
   * schema question, "write me a poem about ducks" was turned into "left the
   * schema as it is", and at the validation question "bump the dedup thing
   * on the second one" became "allowed fields that are not in the schema".
   * Both were silent writes from noise. A yes costs one word.
   */
  it('proposes an inferred action even when it answers the question', async () => {
    const execute = jest.fn(async () => applied);

    const result = await runTurn('put it in the lake', {
      vocabulary,
      execute,
      prompt: STORAGE,
      resolve: async () => ({
        status: 'resolved',
        confidence: 0.8,
        needsConfirmation: true,
        action: { kind: 'set_storage', lakehouse: true },
      }),
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.messages[1].card).toMatchObject({ kind: 'confirm' });
  });

  /** A rule match is a pattern the words fit, so it still acts directly. */
  it('still performs what the rules matched outright', async () => {
    const execute = jest.fn(async () => applied);

    await runTurn('lakehouse', {
      vocabulary,
      execute,
      prompt: STORAGE,
      resolve: async () => ({
        status: 'resolved',
        confidence: 0.95,
        action: { kind: 'set_storage', lakehouse: true },
      }),
    });

    expect(execute).toHaveBeenCalledWith({
      kind: 'set_storage',
      lakehouse: true,
    });
  });

  /**
   * Found in the browser at the schema question: the model answered a
   * request aimed at the assistant as though it were an answer, and it was
   * applied. A request like this is refused whatever the model made of it.
   */
  it('refuses a request aimed at it, even when the model answered the question', async () => {
    const execute = jest.fn(async () => applied);

    const result = await runTurn('write me a poem about ducks', {
      vocabulary,
      execute,
      prompt: STORAGE,
      resolve: async () => ({
        status: 'resolved',
        confidence: 0.8,
        needsConfirmation: true,
        action: { kind: 'skip_step', step: 'storage' },
      }),
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.messages[1].text).toMatch(/only work on this dataset/i);
    expect(result.messages[1].card).toBeUndefined();
  });

  it('still confirms an inferred action about something else', async () => {
    const execute = jest.fn(async () => applied);

    const result = await runTurn('something only a model would parse', {
      vocabulary,
      execute,
      prompt: STORAGE,
      resolve: async () => ({
        status: 'resolved',
        confidence: 0.8,
        needsConfirmation: true,
        action: { kind: 'delete_field', path: 'order_id' },
      }),
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.messages[1].card?.kind).toBe('confirm');
  });
});

/**
 * Asked for by the user: the flow should take a request at any point, and
 * say what is missing when it cannot be done yet, rather than refusing it as
 * gibberish. "dedup on order_id" before a sample resolves to nothing at all,
 * because a dataset with no fields has no `order_id` to key on.
 */
describe('a request that cannot be done yet', () => {
  const empty = buildFieldVocabulary([]);

  it('explains what is missing instead of saying it did not understand', async () => {
    const execute = jest.fn(async () => applied);

    const result = await runTurn('dedup on order_id', {
      vocabulary: empty,
      execute,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.messages[1].text).toMatch(/sample/i);
    expect(result.messages[1].text).not.toMatch(/did not understand/i);
  });

  it('names the thing that was asked for, so it reads as an answer', async () => {
    const result = await runTurn('mask the email address', {
      vocabulary: empty,
      execute: async () => applied,
    });

    expect(result.messages[1].text).toMatch(/mask/i);
  });

  it('holds back an action it did resolve but cannot yet send', async () => {
    const execute = jest.fn(async () => applied);

    const result = await runTurn('enable the real-time store', {
      vocabulary: empty,
      execute,
      datasetExists: false,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.action).toBeUndefined();
    expect(result.messages[1].text).toMatch(/name/i);
  });

  /** Nothing to click: the way forward is the sample, not a confirmation. */
  it('offers no confirmation for something it will not do', async () => {
    const result = await runTurn('enable the real-time store', {
      vocabulary: empty,
      execute: async () => applied,
      datasetExists: false,
    });

    expect(result.messages[1].card).toBeUndefined();
  });

  /**
   * Found in the browser: "dedup on sensor_id" before a sample came back as
   * "A connector needs a dataset first". With no schema the rules decline,
   * the model is asked, and it guessed a connector action — which the
   * prerequisite reply then described. A guess is worse evidence than the
   * words the user actually typed.
   */
  it('answers about what was asked, not about what was guessed', async () => {
    const execute = jest.fn(async () => applied);

    const result = await runTurn('dedup on sensor_id', {
      vocabulary: empty,
      execute,
      resolve: async () => ({
        status: 'resolved',
        confidence: 0.85,
        needsConfirmation: true,
        action: { kind: 'select_connector', connectorId: 'kafka' },
      }),
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.messages[1].text).toMatch(/duplicat/i);
    expect(result.messages[1].text).not.toMatch(/connector/i);
  });

  /** A guess is still the only evidence when the words carry no topic. */
  it('falls back to the guess when the words say nothing', async () => {
    const result = await runTurn('do that thing', {
      vocabulary: empty,
      execute: async () => applied,
      datasetExists: false,
      resolve: async () => ({
        status: 'resolved',
        confidence: 0.85,
        needsConfirmation: true,
        action: { kind: 'set_storage', realtime: true },
      }),
    });

    expect(result.messages[1].text).toMatch(/storage/i);
  });

  it('still refuses what is not dataset work at all', async () => {
    const result = await runTurn('write me a poem about ducks', {
      vocabulary: empty,
      execute: async () => applied,
    });

    expect(result.messages[1].text).toMatch(/only work on this dataset/i);
  });

  it('does what was asked once the prerequisite is there', async () => {
    const execute = jest.fn(async () => applied);

    await runTurn('dedup on order_id', {
      vocabulary,
      execute,
      sampleRows: SAMPLE,
    });

    expect(execute).toHaveBeenCalledWith({
      kind: 'set_dedup',
      enabled: true,
      key: 'order_id',
    });
  });
});

/**
 * With nothing to click, a proposal has to be answerable in words. The
 * proposal is the last assistant turn, so it is the question on the table
 * until something else happens.
 */
describe('confirming a proposal by typing', () => {
  const proposal: Message[] = [
    {
      id: 'u1',
      role: 'user',
      text: 'never show me the same order twice',
      createdAt: 0,
    },
    {
      id: 'a1',
      role: 'assistant',
      createdAt: 0,
      text: 'I think you mean: deduplicate on order_id.',
      card: {
        kind: 'confirm',
        title: 'Deduplicate on order_id',
        confirmAction: { kind: 'set_dedup', enabled: true, key: 'order_id' },
      },
    },
  ];

  const answer = (
    said: string,
    execute: (action: Action) => Promise<ExecutionOutcome> = async () =>
      applied,
  ) =>
    runTurn(said, {
      vocabulary,
      execute,
      sampleRows: SAMPLE,
      history: proposal,
    });

  it('does what was proposed on a yes', async () => {
    const execute = jest.fn(async () => applied);

    await answer('yes', execute);

    expect(execute).toHaveBeenCalledWith({
      kind: 'set_dedup',
      enabled: true,
      key: 'order_id',
    });
  });

  it('takes the other ways people say yes', async () => {
    for (const said of ['do it', 'go ahead', 'yes please', 'sure']) {
      const execute = jest.fn(async () => applied);
      await answer(said, execute);

      expect({ said, called: execute.mock.calls.length }).toEqual({
        said,
        called: 1,
      });
    }
  });

  it('drops it on a no, without writing anything', async () => {
    const execute = jest.fn(async () => applied);

    const result = await answer('no', execute);

    expect(execute).not.toHaveBeenCalled();
    expect(result.messages[1].text).toMatch(/left it|not do/i);
  });

  it('takes the other ways people decline', async () => {
    for (const said of ['cancel', 'no thanks', 'not that']) {
      const execute = jest.fn(async () => applied);
      await answer(said, execute);

      expect({ said, called: execute.mock.calls.length }).toEqual({
        said,
        called: 0,
      });
    }
  });

  /** Saying something else abandons the proposal rather than queueing it. */
  it('treats anything else as a fresh request', async () => {
    const execute = jest.fn(async () => applied);

    await answer('make order_id required', execute);

    expect(execute).toHaveBeenCalledWith({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('does not answer a proposal that something has already happened to', async () => {
    const execute = jest.fn(async () => applied);
    const settled: Message[] = [
      ...proposal,
      {
        id: 'a2',
        role: 'assistant',
        createdAt: 0,
        text: 'Deduplication is on, keyed on order_id.',
        action: { kind: 'set_dedup', enabled: true, key: 'order_id' },
      },
    ];

    await runTurn('yes', { vocabulary, execute, history: settled });

    expect(execute).not.toHaveBeenCalled();
  });
});

/**
 * The retry used to be a button on the error card. The failed action is
 * recorded on the message it failed in, so re-sending it is a matter of
 * finding that message.
 */
describe('retrying by typing', () => {
  const failed: Message[] = [
    {
      id: 'u1',
      role: 'user',
      text: 'enable the real-time store',
      createdAt: 0,
    },
    {
      id: 'a1',
      role: 'assistant',
      createdAt: 0,
      text: 'The server did not answer in time.',
      failureCode: 'TIMEOUT',
      action: { kind: 'set_storage', realtime: true },
    },
  ];

  it('re-sends exactly what failed', async () => {
    const execute = jest.fn(async () => applied);

    await runTurn('try again', { vocabulary, execute, history: failed });

    expect(execute).toHaveBeenCalledWith({
      kind: 'set_storage',
      realtime: true,
    });
  });

  it('takes the other ways people ask for it', async () => {
    for (const said of [
      'retry',
      'resend it',
      'do it again',
      'try that again',
    ]) {
      const execute = jest.fn(async () => applied);
      await runTurn(said, { vocabulary, execute, history: failed });

      expect({ said, called: execute.mock.calls.length }).toEqual({
        said,
        called: 1,
      });
    }
  });

  it('says there is nothing to retry when nothing failed', async () => {
    const execute = jest.fn(async () => applied);

    const result = await runTurn('try again', {
      vocabulary,
      execute,
      history: [{ id: 'u1', role: 'user', text: 'hello', createdAt: 0 }],
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.messages[1].text).toMatch(/nothing to (try again|retry)/i);
  });

  /**
   * The diagnosis often knows better than the user: a store the cluster does
   * not have comes back with a corrected action naming the store it does, so
   * re-sending the original would fail in exactly the same way.
   */
  it('sends the correction the diagnosis derived, not the original', async () => {
    const execute = jest.fn(async () => applied);
    const refused: Message[] = [
      { id: 'u1', role: 'user', text: 'enable the lakehouse', createdAt: 0 },
      {
        id: 'a1',
        role: 'assistant',
        createdAt: 0,
        text: 'This cluster does not have Data Lakehouse (Hudi).',
        failureCode: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
        action: { kind: 'set_storage', lakehouse: true },
        card: {
          kind: 'api_error',
          diagnosis: diagnose({
            code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
            error:
              'The storage type "lake_house" is not available. Please use one of the available storage types: realtime_store',
          }),
        },
      },
    ];

    await runTurn('try again', { vocabulary, execute, history: refused });

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'set_storage', lakehouse: false }),
    );
  });

  /** A failure that has since been put right is not the thing to re-send. */
  it('retries the most recent failure, not an older one', async () => {
    const execute = jest.fn(async () => applied);
    const twice: Message[] = [
      ...failed,
      {
        id: 'a2',
        role: 'assistant',
        createdAt: 0,
        text: 'That name is taken.',
        failureCode: 'DATASET_ID_TAKEN',
        action: { kind: 'set_dataset_name', name: 'My Orders' },
      },
    ];

    await runTurn('try again', { vocabulary, execute, history: twice });

    expect(execute).toHaveBeenCalledWith({
      kind: 'set_dataset_name',
      name: 'My Orders',
    });
  });
});

/**
 * The question on the table is good evidence, but it is not a licence.
 *
 * A choice is matched on the words a reply contains, which is what lets
 * "dedupe on order_id" answer the deduplication question. Said in the
 * browser at that same question, "also pull in the Assistant Customers
 * record on customer_id as customer_details" matched its `customer_id`
 * option and was written as the deduplication key — a change nobody asked
 * for, and one that skipped confirmation entirely, because an answer is
 * performed rather than proposed.
 */
describe('a request said while a different question is waiting', () => {
  const DEDUP: Prompt = {
    step: 'dedup',
    text: 'Shall I drop duplicate records?',
    card: {
      kind: 'choice',
      options: [
        {
          label: 'order_id',
          action: { kind: 'set_dedup', enabled: true, key: 'order_id' },
        },
        {
          label: 'customer.customer_id',
          action: {
            kind: 'set_dedup',
            enabled: true,
            key: 'customer.customer_id',
          },
        },
        {
          label: 'Keep duplicates',
          action: { kind: 'skip_step', step: 'dedup' },
        },
      ],
    },
  };

  const TRANSFORMS: Prompt = {
    step: 'transform',
    text: 'Do you want to transform any field on the way in?',
    card: {
      kind: 'choice',
      options: [
        {
          label: 'No transformations',
          action: { kind: 'skip_step', step: 'transform' },
        },
      ],
    },
  };

  it('is not written as an answer to that question', async () => {
    const execute = jest.fn(async () => applied);

    await runTurn(
      'also pull in the customers record on customer.customer_id as customer_details',
      { vocabulary, execute, prompt: DEDUP },
    );

    expect(execute).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'set_dedup' }),
    );
  });

  /** An answer that happens to name the topic is still an answer. */
  it('still takes an answer about the question itself', async () => {
    const execute = jest.fn(async () => applied);

    await runTurn('dedupe on order_id', {
      vocabulary,
      execute,
      prompt: DEDUP,
    });

    expect(execute).toHaveBeenCalledWith({
      kind: 'set_dedup',
      enabled: true,
      key: 'order_id',
    });
  });

  /**
   * Declining names the topic and answers it by skipping, which is why
   * skipping and moving between stages are exempt.
   */
  it('still takes a decline that names the topic', async () => {
    const execute = jest.fn(async () => applied);

    await runTurn('no transformations', {
      vocabulary,
      execute,
      prompt: TRANSFORMS,
    });

    expect(execute).toHaveBeenCalledWith({
      kind: 'skip_step',
      step: 'transform',
    });
  });
});
