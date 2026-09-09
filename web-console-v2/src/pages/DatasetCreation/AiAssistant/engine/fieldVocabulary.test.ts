import { SchemaField } from 'services/datasetApi';
import {
  buildFieldVocabulary,
  refFromPath,
  dateTimePaths,
  dedupEligiblePaths,
  piiEligiblePaths,
  resolveField,
  storageKeyEligiblePaths,
} from './fieldVocabulary';

/**
 * Mirrors the shape `GET /api/web-console/generate-fields/:id` actually
 * returns: top-level entries carry `column`/`ref`, while nested fields hang off
 * `properties` with only a `key`, so dot paths have to be derived.
 */
const generateFieldsResponse = [
  {
    column: 'order_id',
    key: 'order_id',
    ref: 'properties.order_id',
    type: 'string',
    arrival_format: 'text',
    data_type: 'string',
  },
  {
    column: 'order_ts',
    key: 'order_ts',
    ref: 'properties.order_ts',
    type: 'string',
    arrival_format: 'text',
    data_type: 'date-time',
  },
  {
    column: 'status',
    key: 'status',
    ref: 'properties.status',
    type: 'string',
    arrival_format: 'text',
    data_type: 'string',
  },
  {
    column: 'is_gift',
    key: 'is_gift',
    ref: 'properties.is_gift',
    type: 'boolean',
    arrival_format: 'boolean',
    data_type: 'boolean',
  },
  {
    column: 'total_amount',
    key: 'total_amount',
    ref: 'properties.total_amount',
    type: 'string',
    arrival_format: 'text',
    data_type: 'string',
  },
  {
    column: 'customer',
    key: 'customer',
    ref: 'properties.customer',
    type: 'object',
    arrival_format: 'object',
    data_type: 'object',
    properties: {
      customer_id: {
        key: 'customer_id',
        type: 'string',
        arrival_format: 'text',
        data_type: 'string',
      },
      email: {
        key: 'email',
        type: 'string',
        arrival_format: 'text',
        data_type: 'string',
      },
      address: {
        key: 'address',
        type: 'object',
        arrival_format: 'object',
        data_type: 'object',
        properties: {
          city: {
            key: 'city',
            type: 'string',
            arrival_format: 'text',
            data_type: 'string',
          },
          geo: {
            key: 'geo',
            type: 'object',
            arrival_format: 'object',
            data_type: 'object',
            properties: {
              lat: {
                key: 'lat',
                type: 'number',
                arrival_format: 'number',
                data_type: 'double',
              },
            },
          },
        },
      },
    },
  },
  {
    column: 'items',
    key: 'items',
    ref: 'properties.items',
    type: 'array',
    arrival_format: 'array',
    data_type: 'array',
  },
  {
    column: 'refund',
    key: 'refund',
    ref: 'properties.refund',
    type: 'object',
    arrival_format: 'object',
    data_type: 'object',
    properties: {
      amount: {
        key: 'amount',
        type: 'number',
        arrival_format: 'number',
        data_type: 'double',
      },
      refunded_at: {
        key: 'refunded_at',
        type: 'string',
        arrival_format: 'text',
        data_type: 'date-time',
      },
    },
  },
] as unknown as SchemaField[];

const vocab = buildFieldVocabulary(generateFieldsResponse);

describe('buildFieldVocabulary', () => {
  it('flattens nested objects into dot paths', () => {
    expect(vocab.paths).toEqual([
      'order_id',
      'order_ts',
      'status',
      'is_gift',
      'total_amount',
      'customer',
      'customer.customer_id',
      'customer.email',
      'customer.address',
      'customer.address.city',
      'customer.address.geo',
      'customer.address.geo.lat',
      'items',
      'refund',
      'refund.amount',
      'refund.refunded_at',
    ]);
  });

  it('derives the JSON Schema ref for nested fields', () => {
    expect(vocab.byPath['customer.address.geo.lat'].ref).toBe(
      'properties.customer.properties.address.properties.geo.properties.lat',
    );
  });

  it('records depth, leaf status and types', () => {
    expect(vocab.byPath['customer.email']).toMatchObject({
      path: 'customer.email',
      dataType: 'string',
      arrivalFormat: 'text',
      isLeaf: true,
      depth: 2,
    });
    expect(vocab.byPath.customer).toMatchObject({
      isLeaf: false,
      depth: 1,
    });
  });

  it('keeps arrays opaque, matching every picker in the wizard', () => {
    expect(vocab.byPath.items).toMatchObject({
      dataType: 'array',
      isLeaf: true,
    });
    expect(vocab.paths.filter((p) => p.startsWith('items.'))).toEqual([]);
  });

  it('tolerates an empty or malformed response', () => {
    expect(buildFieldVocabulary([]).paths).toEqual([]);
    expect(
      buildFieldVocabulary(undefined as unknown as SchemaField[]).paths,
    ).toEqual([]);
  });
});

describe('refFromPath', () => {
  it('matches the ref the vocabulary derives from the API response', () => {
    vocab.entries.forEach((entry) => {
      expect(refFromPath(entry.path)).toBe(entry.ref);
    });
  });

  it('handles a single segment and tolerates stray dots', () => {
    expect(refFromPath('order_id')).toBe('properties.order_id');
    expect(refFromPath('customer..email')).toBe(
      'properties.customer.properties.email',
    );
    expect(refFromPath('')).toBe('');
  });
});

describe('resolveField', () => {
  it('matches an exact path', () => {
    expect(resolveField(vocab, 'order_id')).toEqual({
      status: 'exact',
      path: 'order_id',
    });
  });

  it('ignores case, spaces and separators', () => {
    expect(resolveField(vocab, 'Order ID')).toMatchObject({
      status: 'exact',
      path: 'order_id',
    });
    expect(resolveField(vocab, 'totalAmount')).toMatchObject({
      status: 'exact',
      path: 'total_amount',
    });
    expect(resolveField(vocab, '  customer.email  ')).toMatchObject({
      status: 'exact',
      path: 'customer.email',
    });
  });

  it('resolves a unique leaf name to its full path', () => {
    expect(resolveField(vocab, 'email')).toEqual({
      status: 'exact',
      path: 'customer.email',
    });
    expect(resolveField(vocab, 'city')).toEqual({
      status: 'exact',
      path: 'customer.address.city',
    });
    expect(resolveField(vocab, 'lat')).toEqual({
      status: 'exact',
      path: 'customer.address.geo.lat',
    });
  });

  it('prefers a unique exact leaf name over looser matches', () => {
    // `amount` names exactly one leaf, so it wins over `total_amount`, which
    // merely contains the word.
    expect(resolveField(vocab, 'amount')).toEqual({
      status: 'exact',
      path: 'refund.amount',
    });
  });

  it('reports ambiguity instead of guessing', () => {
    const result = resolveField(vocab, 'id');

    expect(result.status).toBe('ambiguous');
    if (result.status === 'ambiguous') {
      expect(result.candidates).toEqual(
        expect.arrayContaining(['order_id', 'customer.customer_id']),
      );
    }
  });

  it('falls back to a fuzzy match when it is unambiguous', () => {
    expect(resolveField(vocab, 'gift')).toEqual({
      status: 'fuzzy',
      path: 'is_gift',
    });
    expect(resolveField(vocab, 'total')).toEqual({
      status: 'fuzzy',
      path: 'total_amount',
    });
  });

  it('returns unknown for a field that does not exist', () => {
    expect(resolveField(vocab, 'shipping_weight')).toEqual({
      status: 'unknown',
    });
  });

  it('returns unknown for fields hidden inside arrays', () => {
    expect(resolveField(vocab, 'sku')).toEqual({ status: 'unknown' });
  });

  it('returns unknown for an empty term', () => {
    expect(resolveField(vocab, '')).toEqual({ status: 'unknown' });
    expect(resolveField(vocab, '   ')).toEqual({ status: 'unknown' });
  });
});

describe('eligibility rules observed in the wizard', () => {
  it('offers only top-level, non-object, non-date-time fields as dedup keys', () => {
    expect(dedupEligiblePaths(vocab)).toEqual([
      'order_id',
      'status',
      'is_gift',
      'total_amount',
      'items',
    ]);
  });

  it('uses the same rule for primary and partition keys', () => {
    expect(storageKeyEligiblePaths(vocab)).toEqual(dedupEligiblePaths(vocab));
  });

  it('offers every leaf path, nested included, for PII marking', () => {
    expect(piiEligiblePaths(vocab)).toEqual([
      'order_id',
      'order_ts',
      'status',
      'is_gift',
      'total_amount',
      'customer.customer_id',
      'customer.email',
      'customer.address.city',
      'customer.address.geo.lat',
      'items',
      'refund.amount',
      'refund.refunded_at',
    ]);
  });

  it('lists date-time fields at any depth', () => {
    expect(dateTimePaths(vocab)).toEqual(['order_ts', 'refund.refunded_at']);
  });
});

/**
 * `generate-fields` returns nested fields **both** ways: hanging off a
 * parent's `properties`, and as their own top-level row whose `column` is
 * already the dotted path. Confirmed live in T11, where the schema table
 * rendered rows for both `customer` and `customer.email`.
 *
 * Taking only the last segment of a dotted column turned `customer.email`
 * into `email`, which then matched nothing in `data_schema` — `mask the
 * email` failed with `Unknown field "email"`. Found by the end-to-end test;
 * the preview never showed it, because the preview renders `column` directly.
 */
describe('nested fields arriving as flat dotted rows', () => {
  const flat = buildFieldVocabulary([
    { column: 'order_id', data_type: 'string' },
    { column: 'customer', data_type: 'object' },
    { column: 'customer.email', data_type: 'string' },
    { column: 'customer.address.city', data_type: 'string' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any);

  it('keeps the dotted column as the path', () => {
    expect(flat.paths).toEqual(
      expect.arrayContaining(['customer.email', 'customer.address.city']),
    );
  });

  it('does not collapse a nested field to its last segment', () => {
    expect(flat.paths).not.toContain('email');
    expect(flat.paths).not.toContain('city');
  });

  it('derives a ref the schema can actually be read with', () => {
    expect(flat.byPath['customer.email'].ref).toBe(
      'properties.customer.properties.email',
    );
  });

  it('derives a ref for a deeply nested row', () => {
    expect(flat.byPath['customer.address.city'].ref).toBe(
      'properties.customer.properties.address.properties.city',
    );
  });

  it('still names the field by its last segment, for resolving', () => {
    expect(flat.byPath['customer.email'].name).toBe('email');
  });

  it('resolves the short name to the full path', () => {
    expect(resolveField(flat, 'email')).toEqual({
      status: 'exact',
      path: 'customer.email',
    });
  });

  it('leaves a top-level field alone', () => {
    expect(flat.byPath.order_id).toMatchObject({
      path: 'order_id',
      ref: 'properties.order_id',
    });
  });

  /** The nested-`properties` shape has to keep working too. */
  it('still handles nested fields hanging off properties', () => {
    const nested = buildFieldVocabulary([
      {
        column: 'customer',
        data_type: 'object',
        properties: { email: { key: 'email', data_type: 'string' } },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    expect(nested.byPath['customer.email']).toMatchObject({
      path: 'customer.email',
      ref: 'properties.customer.properties.email',
    });
  });

  /** An explicit `ref` from the API wins over any derivation. */
  it('prefers a ref the API supplied', () => {
    const withRef = buildFieldVocabulary([
      { column: 'a.b', ref: 'properties.a.properties.b', data_type: 'string' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    expect(withRef.byPath['a.b'].ref).toBe('properties.a.properties.b');
  });
});
