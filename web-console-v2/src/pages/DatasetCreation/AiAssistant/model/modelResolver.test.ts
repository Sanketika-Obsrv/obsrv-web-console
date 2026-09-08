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

  it('carries a confidence below an exact rule match', async () => {
    const resolution = await resolve(
      'make order_id a string',
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
