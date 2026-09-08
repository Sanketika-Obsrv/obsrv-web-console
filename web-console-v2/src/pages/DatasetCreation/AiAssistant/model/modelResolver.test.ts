import { buildFieldVocabulary } from '../engine/fieldVocabulary';
import { ModelEngine } from './engineClient';
import { extractJson, resolveWithModel } from './modelResolver';

const FIELDS = [
  { column: 'order_id', data_type: 'string' },
  { column: 'total_amount', data_type: 'double' },
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

const engineReplying = (reply: string | (() => never)): ModelEngine => ({
  complete: async () => (typeof reply === 'string' ? reply : reply()),
  unload: async () => undefined,
});

const resolve = (
  utterance: string,
  reply: string | (() => never),
  step: 'schema' | 'storage' = 'schema',
) =>
  resolveWithModel(
    { utterance, step, vocabulary },
    { engine: engineReplying(reply) },
  );

describe('a well-formed model answer', () => {
  it('becomes the action it named', async () => {
    const resolution = await resolve(
      'make order_id a string',
      '{"kind":"set_data_type","path":"order_id","dataType":"string"}',
    );

    expect(resolution.action).toEqual({
      kind: 'set_data_type',
      path: 'order_id',
      dataType: 'string',
    });
  });

  /**
   * Uses a phrasing the rules decline, since the rules now answer first and
   * a rule match would report its own higher confidence.
   */
  it('carries a confidence below an exact rule match', async () => {
    const resolution = await resolve(
      'the amount column ought to be textual',
      '{"kind":"set_data_type","path":"order_id","dataType":"string"}',
    );

    expect(resolution.confidence).toBeGreaterThan(0.5);
    expect(resolution.confidence).toBeLessThan(0.95);
  });

  /** The model gets a hint, not a list, so loose names are expected. */
  it('resolves a loosely named field to its real path', async () => {
    const resolution = await resolve(
      'mask the email',
      '{"kind":"set_data_type","path":"email","dataType":"string"}',
    );

    expect(resolution.action).toMatchObject({ path: 'customer.email' });
  });

  it('reports the path it resolved', async () => {
    const resolution = await resolve(
      'x',
      '{"kind":"set_data_type","path":"email","dataType":"string"}',
    );

    expect(resolution.resolvedPath).toBe('customer.email');
  });

  it('salvages JSON wrapped in prose, as small models produce', async () => {
    const resolution = await resolve(
      'make order_id a string',
      'Sure! Here is the action: {"kind":"set_data_type","path":"order_id","dataType":"string"} Hope that helps.',
    );

    expect(resolution.action).toMatchObject({ kind: 'set_data_type' });
  });
});

/**
 * Everything the model returns is untrusted. Each of these has to become a
 * question or a rule answer, never a write.
 */
describe('a model answer that cannot be trusted', () => {
  it('falls back to the rules when the reply is not JSON', async () => {
    const resolution = await resolve('make order_id required', 'I think so?');

    expect(resolution.action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('falls back when the action fails the schema', async () => {
    const resolution = await resolve(
      'make order_id required',
      '{"kind":"set_data_type","path":"order_id","dataType":"widget"}',
    );

    expect(resolution.action).toMatchObject({ kind: 'toggle_required' });
  });

  it('falls back when the model invents an action kind', async () => {
    const resolution = await resolve(
      'make order_id required',
      '{"kind":"drop_database","path":"order_id"}',
    );

    expect(resolution.action).toMatchObject({ kind: 'toggle_required' });
  });

  /** Constrained decoding is a hint, not a guarantee. */
  it('falls back when the action belongs to another step', async () => {
    const resolution = await resolve(
      'make order_id required',
      '{"kind":"set_storage","realtime":true}',
    );

    expect(resolution.action).toMatchObject({ kind: 'toggle_required' });
  });

  it('asks rather than guessing when the field is ambiguous', async () => {
    const resolution = await resolve(
      'set id to string',
      '{"kind":"set_data_type","path":"id","dataType":"string"}',
    );

    expect(resolution.status).toBe('ambiguous');
    expect(resolution.clarify?.options).toEqual(
      expect.arrayContaining(['order_id', 'customer.customer_id']),
    );
  });

  it('offers each candidate as a complete action', async () => {
    const resolution = await resolve(
      'set id to string',
      '{"kind":"set_data_type","path":"id","dataType":"string"}',
    );

    expect(resolution.candidateActions).toEqual(
      expect.arrayContaining([
        { kind: 'set_data_type', path: 'order_id', dataType: 'string' },
      ]),
    );
  });

  it('declines a field the model invented outright', async () => {
    const resolution = await resolve(
      'x',
      '{"kind":"set_data_type","path":"revenue_forecast","dataType":"double"}',
    );

    expect(resolution.status).toBe('unknown');
    expect(resolution.clarify?.question).toMatch(/could not find/i);
  });

  it('falls back when the engine throws mid-turn', async () => {
    const resolution = await resolve('make order_id required', () => {
      throw new Error('device lost');
    });

    expect(resolution.action).toMatchObject({ kind: 'toggle_required' });
  });

  it('falls back on an empty reply', async () => {
    expect((await resolve('make order_id required', '')).action).toMatchObject({
      kind: 'toggle_required',
    });
  });
});

/** The reserved arrival-time key is not a schema field and must survive. */
describe('the event arrival time key', () => {
  it('passes through without being resolved as a field', async () => {
    const resolution = await resolveWithModel(
      { utterance: 'use arrival time', step: 'storage', vocabulary },
      {
        engine: engineReplying(
          '{"kind":"set_keys","timestamp":"obsrv_meta.syncts"}',
        ),
      },
    );

    expect(resolution.action).toEqual({
      kind: 'set_keys',
      timestamp: 'obsrv_meta.syncts',
    });
  });
});

describe('extractJson', () => {
  it('parses a clean object', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('finds an object inside prose', () => {
    expect(extractJson('here you go {"a":1} done')).toEqual({ a: 1 });
  });

  it('finds an object inside a code fence', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('gives up on nonsense rather than guessing', () => {
    expect(extractJson('no json at all')).toBeUndefined();
    expect(extractJson('{ broken')).toBeUndefined();
    expect(extractJson('')).toBeUndefined();
  });
});

/**
 * Found live, and the most instructive failure of the build. With the step
 * stuck on `ingestion` after the draft existed, the model was offered only
 * ingestion actions — and `set_dataset_name` was the only one that could
 * absorb a free-text instruction, so it invented a name:
 *
 *   "the amount column should hold decimal values"
 *     -> set_dataset_name "amount_dataset_20240525"
 *
 * A path slot is checked against the vocabulary, so an invented field becomes
 * a question. A name is free text, so nothing contradicted it. Free-text
 * slots need corroboration from the utterance in the same way path slots need
 * resolution.
 */
describe('a name the user never asked for', () => {
  const nameReply =
    '{"kind":"set_dataset_name","name":"amount_dataset_20240525"}';

  const atIngestion = (utterance: string, hasDraft = false) =>
    resolveWithModel(
      { utterance, step: 'ingestion', vocabulary, hasDraft },
      { engine: engineReplying(nameReply) },
    );

  it('is refused when the instruction was not about naming', async () => {
    const resolution = await atIngestion(
      'the amount column should hold decimal values',
    );

    expect(resolution.action?.kind).not.toBe('set_dataset_name');
  });

  it('does not invent a name from an instruction about duplicates', async () => {
    const resolution = await atIngestion(
      'I never want to see the same order twice',
    );

    expect(JSON.stringify(resolution)).not.toContain('amount_dataset');
  });

  it('is accepted when the user did ask to name it', async () => {
    const resolution = await atIngestion('call it amount_dataset_20240525');

    expect(resolution.action).toEqual({
      kind: 'set_dataset_name',
      name: 'amount_dataset_20240525',
    });
  });

  it('accepts "rename" as a naming cue too', async () => {
    const resolution = await atIngestion(
      'rename it to amount_dataset_20240525',
    );

    expect(resolution.action?.kind).toBe('set_dataset_name');
  });

  /**
   * The guard stops the *model* using naming as a catch-all; it does not
   * forbid renaming. An explicit rename still works, because the rules
   * resolve it — which is the correct division: the model's proposal is
   * discarded, the user's instruction is not.
   */
  it('discards the model proposal but still honours an explicit rename', async () => {
    const resolution = await atIngestion('call it something else', true);

    expect(resolution.action).toEqual({
      kind: 'set_dataset_name',
      name: 'something else',
    });
    // The model's invented name is gone; the user's words decided it.
    expect(JSON.stringify(resolution)).not.toContain('amount_dataset');
  });

  it('refuses a second sample once the draft exists', async () => {
    const resolution = await resolveWithModel(
      {
        utterance: 'read the file again',
        step: 'ingestion',
        vocabulary,
        hasDraft: true,
      },
      {
        engine: engineReplying(
          '{"kind":"attach_sample","fileName":"other.json"}',
        ),
      },
    );

    expect(resolution.action?.kind).not.toBe('attach_sample');
  });
});

/**
 * Measured live: at 0.6B the model is *worse* than the rules on phrasings the
 * rules already handle. "I never want to see the same order twice" produced
 * `set_arrival_format` on an unrelated field. A rule match is a pattern the
 * words actually fit, so there is nothing for a guess to improve on.
 */
describe('the rules go first', () => {
  it('never asks the model when the rules already match', async () => {
    const complete = jest.fn(async () => '{"kind":"save"}');

    const resolution = await resolveWithModel(
      { utterance: 'make order_id required', step: 'schema', vocabulary },
      { engine: { complete, unload: async () => undefined } },
    );

    expect(complete).not.toHaveBeenCalled();
    expect(resolution.action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('does not ask for confirmation for a rule match', async () => {
    const resolution = await resolveWithModel(
      { utterance: 'make order_id required', step: 'schema', vocabulary },
      { engine: engineReplying('{"kind":"save"}') },
    );

    expect(resolution.needsConfirmation).toBeFalsy();
  });

  it('asks the model only when the rules decline', async () => {
    const complete = jest.fn(
      async () =>
        '{"kind":"set_data_type","path":"total_amount","dataType":"string"}',
    );

    await resolveWithModel(
      {
        utterance: 'the amount column should hold text',
        step: 'schema',
        vocabulary,
      },
      { engine: { complete, unload: async () => undefined } },
    );

    expect(complete).toHaveBeenCalled();
  });

  it('marks a model answer as needing confirmation', async () => {
    const resolution = await resolveWithModel(
      {
        utterance: 'the amount column should hold text',
        step: 'schema',
        vocabulary,
      },
      {
        engine: engineReplying(
          '{"kind":"set_data_type","path":"total_amount","dataType":"string"}',
        ),
      },
    );

    expect(resolution.needsConfirmation).toBe(true);
  });
});

/**
 * Seen live: the model answered with `clarify`, and it was turned into a
 * "Do it / Cancel" confirmation. A question is the answer, not an action to
 * approve.
 */
describe('when the model asks a question', () => {
  const askedBack = (reply: string) =>
    resolveWithModel(
      { utterance: 'do the thing with the stuff', step: 'schema', vocabulary },
      { engine: engineReplying(reply) },
    );

  it('passes the question through to the user', async () => {
    const resolution = await askedBack(
      '{"kind":"clarify","question":"Which field did you mean?"}',
    );

    expect(resolution.clarify?.question).toBe('Which field did you mean?');
  });

  it('proposes no action to confirm', async () => {
    const resolution = await askedBack(
      '{"kind":"clarify","question":"Which field did you mean?"}',
    );

    expect(resolution.action).toBeUndefined();
    expect(resolution.needsConfirmation).toBeFalsy();
  });

  it('offers the options it suggested', async () => {
    const resolution = await askedBack(
      '{"kind":"clarify","question":"Which one?","options":["order_id","channel"]}',
    );

    expect(resolution.clarify?.options).toEqual(['order_id', 'channel']);
  });

  it('does not need confirming for an explain', async () => {
    const resolution = await askedBack(
      '{"kind":"clarify","question":"What about it?"}',
    );

    expect(resolution.needsConfirmation).toBeFalsy();
  });
});
