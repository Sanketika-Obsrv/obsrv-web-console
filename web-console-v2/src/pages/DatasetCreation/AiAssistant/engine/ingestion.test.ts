import {
  datasetIdFromName,
  isValidDatasetName,
  looksLikeJsonSchema,
  mergeSampleRows,
} from './ingestion';

describe('dataset naming', () => {
  it('derives the id the same way the wizard does', () => {
    expect(datasetIdFromName('Claude Probe Orders')).toBe(
      'claude-probe-orders',
    );
    expect(datasetIdFromName('T1 Regression Orders')).toBe(
      't1-regression-orders',
    );
  });

  it('collapses runs of whitespace into a single hyphen', () => {
    expect(datasetIdFromName('Orders   2024')).toBe('orders-2024');
    expect(datasetIdFromName('Orders\t2024')).toBe('orders-2024');
  });

  it('trims surrounding whitespace without leaving a stray hyphen', () => {
    expect(datasetIdFromName('  Orders 2024  ')).toBe('orders-2024');
    expect(datasetIdFromName('Orders ')).toBe('orders');
  });

  it('keeps dots, hyphens and underscores', () => {
    expect(datasetIdFromName('orders_v2.1-beta')).toBe('orders_v2.1-beta');
  });

  it('accepts names the console accepts', () => {
    expect(isValidDatasetName('Customer Orders 2024')).toBe(true);
    expect(isValidDatasetName('orders_v2.1-beta')).toBe(true);
  });

  it('rejects the special characters the console rejects', () => {
    [
      'Orders!',
      'a@b',
      'a#b',
      'a(b)',
      'a[b]',
      'a{b}',
      'a:b',
      'a<b>',
      'a|b',
    ].forEach((name) => expect(isValidDatasetName(name)).toBe(false));
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(isValidDatasetName('')).toBe(false);
    expect(isValidDatasetName('   ')).toBe(false);
  });
});

describe('looksLikeJsonSchema', () => {
  it('recognises a JSON Schema document', () => {
    expect(
      looksLikeJsonSchema({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { a: { type: 'string' } },
      }),
    ).toBe(true);
  });

  it('recognises a schema without $schema', () => {
    expect(looksLikeJsonSchema({ type: 'object', properties: { a: {} } })).toBe(
      true,
    );
  });

  /**
   * The wizard's `isJsonSchema` treats any object carrying one of a list of
   * schema keywords as a schema, so a plain order record with an `items` array
   * is misread and dropped from `sample_data.mergedEvent`. That is why the
   * draft created through the wizard stored `{ mergedEvent: {} }`.
   */
  it('does not mistake a data record with schema-sounding keys for a schema', () => {
    expect(
      looksLikeJsonSchema({
        order_id: 'ORD-1',
        items: [{ sku: 'SKU-1' }],
        type: 'retail',
        required: true,
        properties: 'n/a',
      }),
    ).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(looksLikeJsonSchema(null)).toBe(false);
    expect(looksLikeJsonSchema('schema')).toBe(false);
    expect(looksLikeJsonSchema([{ type: 'object' }])).toBe(false);
  });
});

describe('mergeSampleRows', () => {
  it('merges every row so optional fields survive', () => {
    expect(
      mergeSampleRows([
        { order_id: 'A', customer: { email: 'a@x.com' } },
        { order_id: 'B', coupon_code: 'SAVE10' },
        { refund: { amount: 1.5 } },
      ]),
    ).toEqual({
      order_id: 'B',
      customer: { email: 'a@x.com' },
      coupon_code: 'SAVE10',
      refund: { amount: 1.5 },
    });
  });

  it('keeps records whose fields merely look like schema keywords', () => {
    const merged = mergeSampleRows([
      { order_id: 'A', items: [{ sku: 'SKU-1' }], type: 'retail' },
    ]);

    expect(merged).toMatchObject({ order_id: 'A', type: 'retail' });
    expect(merged.items).toEqual([{ sku: 'SKU-1' }]);
  });

  it('skips an uploaded JSON Schema document', () => {
    expect(
      mergeSampleRows([
        { $schema: 'x', type: 'object', properties: { a: { type: 'string' } } },
      ]),
    ).toEqual({});
  });

  it('tolerates an empty or malformed sample', () => {
    expect(mergeSampleRows([])).toEqual({});
    expect(mergeSampleRows(undefined)).toEqual({});
    expect(mergeSampleRows([null, 'nope', 42])).toEqual({});
  });
});
