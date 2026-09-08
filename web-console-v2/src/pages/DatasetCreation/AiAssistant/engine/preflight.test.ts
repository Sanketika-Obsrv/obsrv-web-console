import {
  countDuplicates,
  describeCardinality,
  evaluateExpression,
} from './preflight';

const ROWS = [
  {
    order_id: 'ORD-1',
    channel: 'web',
    total_amount: 10,
    customer: { email: 'a@x.com' },
  },
  {
    order_id: 'ORD-2',
    channel: 'web',
    total_amount: 20,
    customer: { email: 'b@y.com' },
  },
  {
    order_id: 'ORD-1',
    channel: 'app',
    total_amount: 30,
    customer: { email: 'c@z.com' },
  },
];

describe('evaluating an expression against the sample', () => {
  it('shows what it produced for each row', async () => {
    const result = await evaluateExpression(
      "$split(customer.email, '@')[1]",
      ROWS,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.results.map((entry) => entry.output)).toEqual([
      'x.com',
      'y.com',
      'z.com',
    ]);
  });

  it('reports the datatype the API will store', async () => {
    const result = await evaluateExpression('total_amount', ROWS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dataType).toBe('long');
  });

  it('recognises a string result', async () => {
    const result = await evaluateExpression('order_id', ROWS);

    expect(result.ok && result.dataType).toBe('string');
  });

  /**
   * The whole point of preflighting: an expression that will not evaluate is
   * reported here and never reaches the API.
   */
  it('reports a syntax error rather than throwing', async () => {
    const result = await evaluateExpression('$split(', ROWS);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeTruthy();
  });

  it('reports an expression that matches nothing', async () => {
    const result = await evaluateExpression('no_such_field', ROWS);

    expect(result.ok).toBe(false);
  });

  it('declines when there is no sample to evaluate against', async () => {
    const result = await evaluateExpression('order_id', []);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/sample/i);
  });

  it('shows the row it could not evaluate rather than failing silently', async () => {
    const result = await evaluateExpression('customer.email', [
      { customer: { email: 'a@x.com' } },
      { order_id: 'ORD-2' },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.results[1].output).toBeUndefined();
  });

  it('caps how many rows it shows', async () => {
    const many = Array.from({ length: 50 }, (_unused, index) => ({
      order_id: `ORD-${index}`,
    }));

    const result = await evaluateExpression('order_id', many, { maxRows: 5 });

    expect(result.ok && result.results).toHaveLength(5);
  });
});

/**
 * The duplicate count is what makes a dedup key recommendation honest: the
 * wizard offers a key picker with no indication of whether the key is
 * actually unique in the data the user just supplied.
 */
describe('counting duplicates on a candidate key', () => {
  it('counts rows that share a key value', () => {
    expect(countDuplicates(ROWS, 'order_id')).toMatchObject({
      total: 3,
      distinct: 2,
      duplicates: 1,
    });
  });

  it('reports none when the key is unique', () => {
    expect(countDuplicates(ROWS, 'total_amount')).toMatchObject({
      distinct: 3,
      duplicates: 0,
    });
  });

  it('names the values that repeat, so the user can check', () => {
    expect(countDuplicates(ROWS, 'order_id').repeated).toEqual(['ORD-1']);
  });

  it('counts a key that repeats more than twice', () => {
    const rows = [{ a: 1 }, { a: 1 }, { a: 1 }];

    expect(countDuplicates(rows, 'a')).toMatchObject({
      total: 3,
      distinct: 1,
      duplicates: 2,
    });
  });

  it('reads a nested key', () => {
    expect(countDuplicates(ROWS, 'customer.email').duplicates).toBe(0);
  });

  it('treats a missing value as its own group rather than a duplicate', () => {
    const rows = [{ a: 1 }, { b: 2 }, { b: 3 }];

    expect(countDuplicates(rows, 'a')).toMatchObject({
      total: 3,
      // Two rows have no `a` at all; that is one absent value, not a match.
      missing: 2,
      duplicates: 0,
    });
  });

  it('handles an empty sample without dividing by zero', () => {
    expect(countDuplicates([], 'a')).toMatchObject({
      total: 0,
      distinct: 0,
      duplicates: 0,
    });
  });
});

describe('describing how distinct a field is', () => {
  it('reports the distinct count and the total', () => {
    expect(describeCardinality(ROWS, 'channel')).toMatchObject({
      distinct: 2,
      total: 3,
    });
  });

  it('calls a field unique when every value differs', () => {
    expect(describeCardinality(ROWS, 'total_amount').isUnique).toBe(true);
  });

  it('does not call a repeating field unique', () => {
    expect(describeCardinality(ROWS, 'order_id').isUnique).toBe(false);
  });

  it('says so in words, for the assistant to repeat', () => {
    expect(describeCardinality(ROWS, 'channel').summary).toMatch(
      /2 distinct.*3 rows/i,
    );
  });

  it('is honest about an empty sample', () => {
    expect(describeCardinality([], 'a')).toMatchObject({
      distinct: 0,
      total: 0,
      isUnique: false,
    });
  });
});
