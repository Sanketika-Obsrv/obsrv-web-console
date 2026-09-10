import { MAX_SAMPLE_BYTES, parseSample, readSampleFile } from './sampleParse';

describe('parsing a sample', () => {
  it('parses a JSON array into rows', () => {
    const parsed = parseSample('[{"order_id":"ORD-1"},{"order_id":"ORD-2"}]');

    expect(parsed).toEqual({
      ok: true,
      rows: [{ order_id: 'ORD-1' }, { order_id: 'ORD-2' }],
    });
  });

  it('treats a single JSON object as one row', () => {
    expect(parseSample('{"order_id":"ORD-1"}')).toEqual({
      ok: true,
      rows: [{ order_id: 'ORD-1' }],
    });
  });

  it('parses JSONL, one object per line', () => {
    const parsed = parseSample('{"a":1}\n{"a":2}\n');

    expect(parsed).toEqual({ ok: true, rows: [{ a: 1 }, { a: 2 }] });
  });

  it('reports text that is not JSON at all', () => {
    expect(parseSample('order_id,total\nORD-1,42').ok).toBe(false);
    expect(parseSample('hello').ok).toBe(false);
    expect(parseSample('').ok).toBe(false);
  });

  /** A JSON scalar is valid JSON and is not a sample of anything. */
  it('refuses a scalar', () => {
    expect(parseSample('42').ok).toBe(false);
    expect(parseSample('"orders"').ok).toBe(false);
  });

  it('keeps the size limit the wizard uses', () => {
    expect(MAX_SAMPLE_BYTES).toBe(1024 * 1024);
  });
});

describe('reading a dropped file', () => {
  const fileOf = (text: string, name = 'orders.json') =>
    new File([text], name, { type: 'application/json' });

  it('parses what the file held', async () => {
    const result = await readSampleFile(fileOf('[{"a":1}]'));

    expect(result).toEqual({ ok: true, rows: [{ a: 1 }] });
  });

  it('refuses a file over the limit without reading it', async () => {
    const big = { ...fileOf('[]'), size: MAX_SAMPLE_BYTES + 1 } as File;
    Object.defineProperty(big, 'size', { value: MAX_SAMPLE_BYTES + 1 });

    const result = await readSampleFile(big);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/too large/i);
  });

  it('reports an empty sample rather than zero rows', async () => {
    const result = await readSampleFile(fileOf('[]'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no records/i);
  });
});
