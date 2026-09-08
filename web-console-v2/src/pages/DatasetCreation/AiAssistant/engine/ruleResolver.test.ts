import { buildFieldVocabulary } from './fieldVocabulary';
import { UTTERANCES } from './ruleResolver.fixtures';
import { resolveUtterance } from './ruleResolver';

/** The vocabulary of the probe dataset used throughout this build. */
const FIELDS = [
  { column: 'order_id', data_type: 'string', arrival_format: 'text' },
  { column: 'total_amount', data_type: 'double', arrival_format: 'number' },
  { column: 'order_ts', data_type: 'date-time', arrival_format: 'text' },
  { column: 'channel', data_type: 'string', arrival_format: 'text' },
  { column: 'coupon_code', data_type: 'string', arrival_format: 'text' },
  {
    column: 'customer',
    data_type: 'object',
    properties: {
      customer_id: { key: 'customer_id', data_type: 'string' },
      email: { key: 'email', data_type: 'string' },
    },
  },
  { column: 'items', data_type: 'array', arrival_format: 'array' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vocabulary = buildFieldVocabulary(FIELDS as any);

const resolve = (utterance: string) =>
  resolveUtterance(utterance, { vocabulary });

describe('the fixture set', () => {
  const results = UTTERANCES.map((fixture) => ({
    fixture,
    resolution: resolve(fixture.utterance),
  }));

  const shouldResolve = results.filter(({ fixture }) => fixture.expected);
  const shouldNot = results.filter(({ fixture }) => !fixture.expected);

  it('covers at least 40 utterances', () => {
    expect(UTTERANCES.length).toBeGreaterThanOrEqual(40);
  });

  /**
   * The acceptance bar. Reported as a list of misses rather than a bare count,
   * so a regression names the utterance it broke.
   */
  it('resolves at least 80% of the utterances that should resolve', () => {
    const missed = shouldResolve
      .filter(({ fixture, resolution }) => {
        if (resolution.status !== 'resolved') return true;
        return (
          JSON.stringify(resolution.action) !== JSON.stringify(fixture.expected)
        );
      })
      .map(({ fixture, resolution }) => ({
        utterance: fixture.utterance,
        expected: fixture.expected,
        got: resolution.action ?? resolution.status,
      }));

    const rate = (shouldResolve.length - missed.length) / shouldResolve.length;

    expect({ rate, missed }).toMatchObject({ missed: [] });
    expect(rate).toBeGreaterThanOrEqual(0.8);
  });

  /**
   * No false positives, with no tolerance: acting on a misread instruction is
   * worse than asking, because the executor would write it to the dataset.
   */
  it('never resolves an utterance that must not resolve', () => {
    const wrongly = shouldNot
      .filter(({ resolution }) => resolution.status === 'resolved')
      .map(({ fixture, resolution }) => ({
        utterance: fixture.utterance,
        got: resolution.action,
      }));

    expect(wrongly).toEqual([]);
  });

  it('offers candidates where the utterance was merely ambiguous', () => {
    const ambiguous = shouldNot.filter(({ fixture }) => fixture.ambiguous);

    ambiguous.forEach(({ fixture, resolution }) => {
      expect({
        utterance: fixture.utterance,
        status: resolution.status,
      }).toMatchObject({ status: 'ambiguous' });
      expect(resolution.clarify?.options?.length ?? 0).toBeGreaterThan(1);
    });
  });
});

describe('confidence', () => {
  it('is highest when the field matched exactly', () => {
    const exact = resolve('make total_amount a double');

    expect(exact.confidence).toBeGreaterThanOrEqual(0.9);
  });

  /**
   * "email" is an exact match, not a fuzzy one: it is the unique leaf name of
   * `customer.email`. A genuinely fuzzy term is one that only *contains* the
   * field's name, like "coupon" for `coupon_code`.
   */
  it('is lower when the field was matched fuzzily', () => {
    const fuzzy = resolve('mask coupon');
    const exact = resolve('mask coupon_code');

    expect(fuzzy.confidence).toBeLessThan(exact.confidence);
  });

  it('is zero when nothing resolved', () => {
    expect(resolve('make the thing better').confidence).toBe(0);
  });
});

describe('asking rather than guessing', () => {
  it('names the candidates when a field is ambiguous', () => {
    const resolution = resolve('set id to string');

    expect(resolution.status).toBe('ambiguous');
    expect(resolution.clarify?.options).toEqual(
      expect.arrayContaining(['order_id', 'customer.customer_id']),
    );
  });

  it('asks about the field, not the instruction, when only the field is unclear', () => {
    expect(resolve('set id to string').clarify?.question).toMatch(/which/i);
  });

  it('declines an unknown field rather than picking the nearest', () => {
    expect(resolve('make sku an integer').status).toBe('unknown');
  });

  it('declines a datatype the API does not accept', () => {
    expect(resolve('make total_amount a widget').status).not.toBe('resolved');
  });

  it('declines an empty utterance', () => {
    expect(resolve('').status).toBe('unknown');
    expect(resolve('   ').status).toBe('unknown');
  });
});

describe('phrasing tolerance', () => {
  it('ignores case', () => {
    expect(resolve('MAKE ORDER_ID REQUIRED').action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('ignores a trailing full stop', () => {
    expect(resolve('save it.').action).toEqual({ kind: 'save' });
  });

  it('accepts a field written with spaces instead of underscores', () => {
    expect(resolve('make order id required').action).toEqual({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });
  });

  it('accepts "dedupe" as well as "dedup"', () => {
    expect(resolve('dedupe on order_id').action).toEqual({
      kind: 'set_dedup',
      enabled: true,
      key: 'order_id',
    });
  });
});

/**
 * Eligibility is the executor's business, but the resolver should not offer a
 * key the picker would refuse — asking is cheaper than a rejected write.
 */
describe('eligibility', () => {
  it('declines a date-time field as a dedup key, as the picker does', () => {
    expect(resolve('dedup on order_ts').status).not.toBe('resolved');
  });

  it('declines a nested field as a dedup key', () => {
    expect(resolve('dedup on customer.email').status).not.toBe('resolved');
  });

  it('accepts a nested field for PII, which the picker allows', () => {
    expect(resolve('mask customer.email').status).toBe('resolved');
  });
});

describe('what a resolution carries', () => {
  it('reports the field it resolved, so the caller can echo it back', () => {
    expect(resolve('encrypt the email').resolvedPath).toBe('customer.email');
  });

  it('reports nothing for an action with no field', () => {
    expect(resolve('save it').resolvedPath).toBeUndefined();
  });
});
