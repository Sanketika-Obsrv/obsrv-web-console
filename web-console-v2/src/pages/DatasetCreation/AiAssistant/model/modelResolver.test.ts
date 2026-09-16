jest.mock('../telemetry', () => ({
  reportModelCall: jest.fn(),
}));

import { DatasetFacts } from '../engine/datasetFacts';
import { buildFieldVocabulary } from '../engine/fieldVocabulary';
import { ModelEngine } from './engineClient';
import { Resolution } from '../engine/ruleResolver';
import { reportModelCall } from '../telemetry';
import { extractJson, resolveTurn, resolveWithModel } from './modelResolver';

const reported = reportModelCall as jest.MockedFunction<typeof reportModelCall>;

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

beforeEach(() => reported.mockClear());

/** A fallback that declines, so only the model's answer is under test. */
const unresolved: Resolution = { status: 'unknown', confidence: 0 };

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
 * Naming used to be gated by a hand-written cue-word regex — "call",
 * "name", "rename", "title" — because an ungated model reading invented a
 * name from whatever free text it was given:
 *
 *   "the amount column should hold decimal values"
 *     -> set_dataset_name "amount_dataset_20240525"
 *
 * That regex is gone: a fixed word list only ever covers the sentence
 * someone thought of, which is the same objection every hand-written rule
 * answers for. A model's naming proposal is no longer rejected for lacking
 * one of those words — it is proposed like any other model guess, and
 * `needsConfirmation` is what stands between a wrong reading and the
 * dataset.
 */
describe('a model-proposed name', () => {
  const nameReply =
    '{"kind":"set_dataset_name","name":"amount_dataset_20240525"}';

  const atIngestion = (utterance: string, hasDraft = false) =>
    resolveWithModel(
      { utterance, step: 'ingestion', vocabulary, hasDraft },
      { engine: engineReplying(nameReply) },
    );

  it('is proposed, not rejected, when the utterance has no naming cue', async () => {
    const resolution = await atIngestion(
      'the amount column should hold decimal values',
    );

    expect(resolution.action).toEqual({
      kind: 'set_dataset_name',
      name: 'amount_dataset_20240525',
    });
    expect(resolution.needsConfirmation).toBe(true);
  });

  it('is proposed for an instruction about duplicates too', async () => {
    const resolution = await atIngestion(
      'I never want to see the same order twice',
    );

    expect(resolution.action).toMatchObject({ kind: 'set_dataset_name' });
    expect(resolution.needsConfirmation).toBe(true);
  });

  it('is accepted when the user did ask to name it', async () => {
    const resolution = await atIngestion('call it amount_dataset_20240525');

    expect(resolution.action).toEqual({
      kind: 'set_dataset_name',
      name: 'amount_dataset_20240525',
    });
  });

  /**
   * The withdrawal-once-a-draft-exists guard is gone too: renaming after the
   * draft exists is meant to work, since the server PATCHes the name and
   * only the derived id stays fixed.
   */
  it('is no longer withdrawn once the draft exists', async () => {
    const resolution = await atIngestion('call it something else', true);

    expect(resolution.action?.kind).toBe('set_dataset_name');
  });

  it('accepts a second sample once the draft exists too', async () => {
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

    expect(resolution.action?.kind).toBe('attach_sample');
  });
});

/**
 * The order used to be the other way round, and the reason was honest at the
 * time: at 0.6B the model was worse than the rules on phrasings the rules
 * already handled. But the rules are hand-written phrasings, and they only
 * cover the sentences someone thought of — "I want create telemetry dataset"
 * became a dataset called that. The model reads the words now; the rules are
 * what answers when it cannot.
 */
describe('the model goes first', () => {
  it('asks the model even when a rule would match', async () => {
    const complete = jest.fn(
      async () =>
        '{"kind":"toggle_required","path":"order_id","required":true}',
    );

    const resolution = await resolveWithModel(
      { utterance: 'make order_id required', step: 'schema', vocabulary },
      { engine: { complete, unload: async () => undefined } },
    );

    expect(complete).toHaveBeenCalled();
    expect(resolution.action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('falls back to the rules when the model returns nothing usable', async () => {
    const resolution = await resolveWithModel(
      { utterance: 'make order_id required', step: 'schema', vocabulary },
      { engine: engineReplying('not json at all') },
    );

    expect(resolution.action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('falls back to the rules when the model throws', async () => {
    const resolution = await resolveWithModel(
      { utterance: 'make order_id required', step: 'schema', vocabulary },
      {
        engine: {
          complete: async () => {
            throw new Error('no webgpu');
          },
          unload: async () => undefined,
        },
      },
    );

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

/**
 * With a question on the table the model is given the question, not the
 * wizard page — and is held to the actions that answer it.
 */
describe('answering the question the assistant asked', () => {
  const asking = {
    utterance: 'no',
    step: 'processing' as const,
    question: 'dedup' as const,
    questionText: 'Shall I drop duplicate records?',
    hasDraft: true,
    vocabulary,
  };

  it('gives the model the question and its examples', async () => {
    const seen: string[] = [];
    const engine = {
      complete: async (prompt: string) => {
        seen.push(prompt);
        return '{"kind":"skip_step","step":"dedup"}';
      },
      unload: async () => undefined,
    };

    await resolveWithModel(asking, { engine, fallback: () => unresolved });

    expect(seen[0]).toContain('Shall I drop duplicate records?');
    expect(seen[0]).toContain('set_dedup');
  });

  it('constrains the reply to the actions that answer it', async () => {
    const schemas: string[] = [];
    const engine = {
      complete: async (_prompt: string, format?: unknown) => {
        schemas.push((format as { schema: string }).schema);
        return '{"kind":"skip_step","step":"dedup"}';
      },
      unload: async () => undefined,
    };

    await resolveWithModel(asking, { engine, fallback: () => unresolved });

    expect(schemas[0]).toContain('set_dedup');
    // `set_pii` shares the processing page and answers a different question.
    expect(schemas[0]).not.toContain('set_pii');
  });

  it('refuses an action that does not answer the question', async () => {
    const engine = {
      complete: async () =>
        '{"kind":"set_pii","path":"order_id","action":"mask","skipOnFailure":true}',
      unload: async () => undefined,
    };

    const resolution = await resolveWithModel(asking, {
      engine,
      fallback: () => unresolved,
    });

    expect(resolution.status).not.toBe('resolved');
  });

  it('accepts one that does', async () => {
    const engine = {
      complete: async () => '{"kind":"skip_step","step":"dedup"}',
      unload: async () => undefined,
    };

    const resolution = await resolveWithModel(asking, {
      engine,
      fallback: () => unresolved,
    });

    expect(resolution.action).toEqual({ kind: 'skip_step', step: 'dedup' });
  });
});

/**
 * Moving the model to the front must not put a confirmation in front of every
 * instruction. Where the rules read the same action independently, the two
 * readings agreeing is the evidence a confirmation would have asked for —
 * and where they disagree, the model's own reading is what is confirmed, not
 * a substitution of the rule's.
 */
describe('when the model and the rules agree', () => {
  it('performs rather than proposes', async () => {
    const resolution = await resolveWithModel(
      { utterance: 'make order_id required', step: 'schema', vocabulary },
      {
        engine: engineReplying(
          '{"kind":"toggle_required","path":"order_id","required":true}',
        ),
      },
    );

    expect(resolution.needsConfirmation).toBeFalsy();
    expect(resolution.action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('still confirms when only the model read it', async () => {
    const resolution = await resolveWithModel(
      {
        utterance: 'that column should be a whole number',
        step: 'schema',
        vocabulary,
      },
      {
        engine: engineReplying(
          '{"kind":"set_data_type","path":"total_amount","dataType":"integer"}',
        ),
      },
    );

    expect(resolution.needsConfirmation).toBe(true);
  });

  /**
   * Measured in the browser: "mark mid as required" came back from the 1.7B
   * as a change of arrival format. That reading is no longer swapped out for
   * the rule's own — the model's proposal stands, marked for confirmation,
   * so the user sees exactly what was read rather than a substitution they
   * never asked for.
   */
  it('keeps the model reading where the two disagree, marked for confirmation', async () => {
    const resolution = await resolveWithModel(
      { utterance: 'make order_id required', step: 'schema', vocabulary },
      {
        engine: engineReplying(
          '{"kind":"set_arrival_format","path":"order_id","arrivalFormat":"text"}',
        ),
      },
    );

    expect(resolution.action).toEqual({
      kind: 'set_arrival_format',
      path: 'order_id',
      arrivalFormat: 'text',
    });
    expect(resolution.needsConfirmation).toBe(true);
  });
});

/** A `DatasetFacts` with nothing decided, for tests that only care about `name`. */
const emptyFacts: DatasetFacts = {
  stores: { realtime: false, lakehouse: false, cache: false },
  keys: {},
  fieldCount: 0,
  hasDraft: true,
};

/**
 * `alreadySatisfied` (`engine/datasetFacts.ts`) is wired in as a last guard:
 * a resolved action that would only repeat what the document already says
 * is dropped rather than run or confirmed.
 */
describe('a resolved action already true of the dataset', () => {
  it('is dropped when it matches the supplied facts', async () => {
    const resolution = await resolveWithModel(
      {
        utterance: 'call it telemetry',
        step: 'ingestion',
        vocabulary,
        facts: { ...emptyFacts, name: 'telemetry' },
      },
      {
        engine: engineReplying(
          '{"kind":"set_dataset_name","name":"telemetry"}',
        ),
      },
    );

    expect(resolution.action).toBeUndefined();
    expect(resolution.status).toBe('unknown');
  });

  it('leaves behaviour unchanged when no facts are supplied', async () => {
    const resolution = await resolveWithModel(
      { utterance: 'call it telemetry', step: 'ingestion', vocabulary },
      {
        engine: engineReplying(
          '{"kind":"set_dataset_name","name":"telemetry"}',
        ),
      },
    );

    expect(resolution.action).toEqual({
      kind: 'set_dataset_name',
      name: 'telemetry',
    });
  });
});

/**
 * `resolveTurn` — call A (the router) first, call B (`resolveWithModel`,
 * unchanged) only where call A says there is something to extract.
 *
 * The fake engine below tells the two calls apart the only way a real one
 * could: by which grammar it was handed. The router's grammar is the fixed,
 * five-way `ROUTER_SCHEMA`, whose properties include `intent`; every
 * question-scoped extraction schema `buildQuestionSchema` builds keys on
 * `kind` and has no `intent` property at all.
 */
describe('resolveTurn — the router first, the extractor only when it is needed', () => {
  interface RecordedCall {
    format?: { type: string; schema: string };
  }

  /** Replies with `routerReply` to call A and `extractionReply` to call B. */
  const scriptedEngine = (
    routerReply: string,
    extractionReply?: string,
  ): { engine: ModelEngine; calls: RecordedCall[] } => {
    const calls: RecordedCall[] = [];
    const engine: ModelEngine = {
      complete: async (_prompt, responseFormat) => {
        const format = responseFormat as RecordedCall['format'];
        calls.push({ format });

        return format?.schema.includes('"intent"')
          ? routerReply
          : (extractionReply ?? '{}');
      },
      unload: async () => undefined,
    };

    return { engine, calls };
  };

  it('makes exactly one call for an ask reading, and extracts nothing', async () => {
    const { engine, calls } = scriptedEngine(
      JSON.stringify({
        intent: 'ask',
        reply: 'A master dataset is reference data.',
      }),
    );

    const result = await resolveTurn(
      {
        utterance: 'what is a master dataset?',
        step: 'processing',
        question: 'dedup',
        questionText: 'Shall I drop duplicate records?',
        vocabulary,
      },
      { engine },
    );

    expect(calls.length).toBe(1);
    expect(result.intent).toBe('ask');
    expect(result.actions ?? []).toEqual([]);
  });

  it('makes exactly one call for an other reading', async () => {
    const { engine, calls } = scriptedEngine(
      JSON.stringify({ intent: 'other', reply: 'Good morning.' }),
    );

    const result = await resolveTurn(
      { utterance: 'good morning', step: 'processing', vocabulary },
      { engine },
    );

    expect(calls.length).toBe(1);
    expect(result.intent).toBe('other');
    expect(result.actions ?? []).toEqual([]);
  });

  it('runs a second call for an answer, agreeing with the rules, and does not ask for confirmation', async () => {
    const { engine, calls } = scriptedEngine(
      JSON.stringify({ intent: 'answer' }),
      '{"kind":"toggle_required","path":"order_id","required":true}',
    );
    const agreeingRules = (): Resolution => ({
      status: 'resolved',
      confidence: 1,
      action: { kind: 'toggle_required', path: 'order_id', required: true },
    });

    const result = await resolveTurn(
      {
        utterance: 'make order_id required',
        step: 'schema',
        question: 'schema',
        questionText: 'Anything else to change?',
        vocabulary,
      },
      { engine, fallback: agreeingRules },
    );

    expect(calls.length).toBe(2);
    expect(calls[1].format?.schema).toContain('toggle_required');
    expect(result.actions).toEqual([
      {
        action: { kind: 'toggle_required', path: 'order_id', required: true },
        confirm: false,
      },
    ]);
  });

  it('marks confirm true for an answer the rules read differently', async () => {
    const { engine } = scriptedEngine(
      JSON.stringify({ intent: 'answer' }),
      '{"kind":"set_arrival_format","path":"order_id","arrivalFormat":"text"}',
    );
    const disagreeingRules = (): Resolution => ({
      status: 'resolved',
      confidence: 1,
      action: { kind: 'toggle_required', path: 'order_id', required: true },
    });

    const result = await resolveTurn(
      {
        utterance: 'make order_id required',
        step: 'schema',
        question: 'schema',
        questionText: 'Anything else to change?',
        vocabulary,
      },
      { engine, fallback: disagreeingRules },
    );

    expect(result.actions).toEqual([
      {
        action: {
          kind: 'set_arrival_format',
          path: 'order_id',
          arrivalFormat: 'text',
        },
        confirm: true,
      },
    ]);
  });

  it('scopes the second call to the step a request names, not the question on the table', async () => {
    const { engine, calls } = scriptedEngine(
      JSON.stringify({ intent: 'request', step: 'name' }),
      '{"kind":"set_dataset_name","name":"orders_v2"}',
    );

    const result = await resolveTurn(
      {
        utterance: 'actually, call it orders_v2',
        step: 'processing',
        question: 'dedup',
        questionText: 'Shall I drop duplicate records?',
        vocabulary,
      },
      { engine, fallback: () => unresolved },
    );

    expect(calls.length).toBe(2);
    expect(calls[1].format?.schema).toContain('set_dataset_name');
    expect(calls[1].format?.schema).not.toContain('set_dedup');
    expect(result.actions).toEqual([
      {
        action: { kind: 'set_dataset_name', name: 'orders_v2' },
        confirm: true,
      },
    ]);
  });

  it('runs the second call for a reply_to_card that also names a step', async () => {
    const { engine, calls } = scriptedEngine(
      JSON.stringify({ intent: 'reply_to_card', step: 'dedup' }),
      '{"kind":"set_dedup","enabled":true,"key":"order_id"}',
    );

    const result = await resolveTurn(
      {
        utterance: 'yes, and also drop duplicates on order_id',
        step: 'processing',
        vocabulary,
      },
      { engine, fallback: () => unresolved },
    );

    expect(calls.length).toBe(2);
    expect(result.actions).toEqual([
      {
        action: { kind: 'set_dedup', enabled: true, key: 'order_id' },
        confirm: true,
      },
    ]);
  });

  it('makes exactly one call for a reply_to_card naming no step, leaving the accept/decline to the turn loop', async () => {
    const { engine, calls } = scriptedEngine(
      JSON.stringify({ intent: 'reply_to_card' }),
    );

    const result = await resolveTurn(
      { utterance: 'yes', step: 'processing', vocabulary },
      { engine },
    );

    expect(calls.length).toBe(1);
    expect(result.actions ?? []).toEqual([]);
  });

  it('returns {intent:"other"} without a second call when the router call itself throws', async () => {
    const fallback = jest.fn(() => unresolved);
    const engine: ModelEngine = {
      complete: async () => {
        throw new Error('no webgpu');
      },
      unload: async () => undefined,
    };

    const result = await resolveTurn(
      { utterance: 'anything', step: 'schema', vocabulary },
      { engine, fallback },
    );

    expect(result).toEqual({ intent: 'other' });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('returns {intent:"other"} on an unparseable router reply, without falling back to the rules', async () => {
    const fallback = jest.fn(() => unresolved);
    const { engine, calls } = scriptedEngine('not json at all');

    const result = await resolveTurn(
      { utterance: 'anything', step: 'schema', vocabulary },
      { engine, fallback },
    );

    expect(calls.length).toBe(1);
    expect(result).toEqual({ intent: 'other' });
    expect(fallback).not.toHaveBeenCalled();
  });
});

/**
 * `resolveTurn` is where the two model calls a turn can make actually happen,
 * so it is where their timing is reported — one call for `ask`/`other`,
 * where there is nothing to extract, and two for an `answer`/`request` that
 * names a step to extract from.
 */
describe('resolveTurn reports the timing of each model call it makes', () => {
  const scriptedEngine = (
    routerReply: string,
    extractionReply?: string,
  ): ModelEngine => ({
    complete: async (_prompt, responseFormat) => {
      const format = responseFormat as { schema?: string } | undefined;

      return format?.schema?.includes('"intent"')
        ? routerReply
        : (extractionReply ?? '{}');
    },
    unload: async () => undefined,
  });

  it('reports exactly one call, the route, for an "ask"', async () => {
    const engine = scriptedEngine(
      JSON.stringify({ intent: 'ask', reply: 'Because it is.' }),
    );

    await resolveTurn(
      { utterance: 'why', step: 'processing', vocabulary },
      { engine },
    );

    expect(reported).toHaveBeenCalledTimes(1);
    expect(reported.mock.calls[0][0]).toMatchObject({ call: 'route' });
  });

  it('reports exactly one call, the route, for an "other"', async () => {
    const engine = scriptedEngine(
      JSON.stringify({ intent: 'other', reply: 'Good morning.' }),
    );

    await resolveTurn(
      { utterance: 'good morning', step: 'processing', vocabulary },
      { engine },
    );

    expect(reported).toHaveBeenCalledTimes(1);
    expect(reported.mock.calls[0][0]).toMatchObject({ call: 'route' });
  });

  it('reports both calls, route then extract, for an answer that names a step', async () => {
    const engine = scriptedEngine(
      JSON.stringify({ intent: 'answer' }),
      '{"kind":"toggle_required","path":"order_id","required":true}',
    );

    await resolveTurn(
      {
        utterance: 'make order_id required',
        step: 'schema',
        question: 'schema',
        questionText: 'Anything else to change?',
        vocabulary,
      },
      { engine, fallback: () => unresolved },
    );

    expect(reported).toHaveBeenCalledTimes(2);
    expect(reported.mock.calls[0][0]).toMatchObject({ call: 'route' });
    expect(reported.mock.calls[1][0]).toMatchObject({ call: 'extract' });
  });

  it('reports both calls for a request that names a step, too', async () => {
    const engine = scriptedEngine(
      JSON.stringify({ intent: 'request', step: 'name' }),
      '{"kind":"set_dataset_name","name":"orders_v2"}',
    );

    await resolveTurn(
      { utterance: 'call it orders_v2', step: 'processing', vocabulary },
      { engine, fallback: () => unresolved },
    );

    expect(reported).toHaveBeenCalledTimes(2);
    expect(reported.mock.calls.map(([report]) => report.call)).toEqual([
      'route',
      'extract',
    ]);
  });

  it('reports the route call as failed when the engine throws', async () => {
    const engine: ModelEngine = {
      complete: async () => {
        throw new Error('no webgpu');
      },
      unload: async () => undefined,
    };

    await resolveTurn(
      { utterance: 'anything', step: 'schema', vocabulary },
      { engine },
    );

    expect(reported).toHaveBeenCalledTimes(1);
    expect(reported.mock.calls[0][0]).toMatchObject({
      call: 'route',
      ok: false,
    });
  });
});
