import { looksLikeData, summariseSample } from './pastedData';

/**
 * Data pasted into the box has to be recognised before the resolver sees it,
 * or a JSON array becomes an unparseable instruction. The test of a good
 * guard is what it *refuses*: an instruction must never be swallowed as data.
 */
describe('recognising pasted data', () => {
  it('takes a JSON array of objects', () => {
    expect(looksLikeData('[{"order_id":"ORD-1"},{"order_id":"ORD-2"}]')).toBe(
      true,
    );
  });

  it('takes a single JSON object', () => {
    expect(looksLikeData('{"order_id":"ORD-1","total":42}')).toBe(true);
  });

  it('takes JSONL', () => {
    expect(looksLikeData('{"a":1}\n{"a":2}\n{"a":3}')).toBe(true);
  });

  it('ignores the whitespace people paste with', () => {
    expect(looksLikeData('\n  [{"a":1}]  \n')).toBe(true);
  });

  it('leaves instructions alone', () => {
    for (const said of [
      'make order_id required',
      'call it My Orders',
      'yes',
      'dedup on {order_id}',
      'what is a dataset',
      '',
      'the value is {"a":1} but I mean the field',
    ]) {
      expect({ said, data: looksLikeData(said) }).toEqual({
        said,
        data: false,
      });
    }
  });

  /** A scalar is valid JSON and is not a sample of anything. */
  it('leaves a bare number or string alone', () => {
    expect(looksLikeData('42')).toBe(false);
    expect(looksLikeData('"orders"')).toBe(false);
  });
});

describe('describing what was pasted', () => {
  it('counts the rows and names the fields', () => {
    const said = summariseSample([
      { order_id: 'ORD-1', total: 42, channel: 'web' },
      { order_id: 'ORD-2', total: 18, channel: 'app' },
    ]);

    expect(said).toMatch(/2 rows/);
    expect(said).toMatch(/3 fields/);
    expect(said).toMatch(/order_id/);
  });

  it('counts a field that only some rows carry', () => {
    expect(summariseSample([{ a: 1 }, { b: 2 }])).toMatch(/2 fields/);
  });

  it('says one row without pluralising it', () => {
    expect(summariseSample([{ a: 1 }])).toMatch(/1 row\b/);
  });

  /** Naming forty fields in a sentence is not a summary. */
  it('names only the first few fields', () => {
    const wide = Object.fromEntries(
      Array.from({ length: 40 }, (_, index) => [`field_${index}`, index]),
    );

    const said = summariseSample([wide]);

    expect(said).toMatch(/40 fields/);
    expect(said).not.toMatch(/field_39/);
    expect(said).toMatch(/…|\.\.\./);
  });
});
