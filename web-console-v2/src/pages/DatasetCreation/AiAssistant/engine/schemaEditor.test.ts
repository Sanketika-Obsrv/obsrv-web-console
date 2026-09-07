import _ from 'lodash';
import { DataSchema } from './schemaEditor';
import {
  addField,
  conflictOptions,
  deleteField,
  parseConflictCounts,
  resolveConflict,
  setArrivalFormat,
  setDataType,
  setDescription,
  setRequired,
  unresolvedConflicts,
} from './schemaEditor';

/**
 * Trimmed copy of a real `data_schema` captured from the console, including the
 * UI-owned keys the API round-trips (`key`, `isRequired`, `resolved`,
 * `isModified`, `disableActions`) and `oneof` in its array form.
 */
const dataSchema = () => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: true,
  properties: {
    order_id: {
      key: 'order_id',
      type: 'string',
      arrival_format: 'text',
      data_type: 'string',
      isRequired: false,
      resolved: true,
    },
    total_amount: {
      key: 'total_amount',
      type: 'number',
      arrival_format: 'number',
      data_type: 'double',
      isRequired: false,
      resolved: false,
      oneof: [{ type: 'double' }, { type: 'string' }],
      suggestions: [
        {
          message:
            "Conflict in the Schema Generation at property: 'total_amount'. The property type double: 108 time(s), string: 12 time(s), ",
          advice:
            'System can choose highest occurance property or last appeared object property',
          resolutionType: 'DATA_TYPE',
          severity: 'MUST-FIX',
          path: 'properties.total_amount',
        },
      ],
    },
    customer: {
      key: 'customer',
      type: 'object',
      arrival_format: 'object',
      data_type: 'object',
      isRequired: false,
      resolved: true,
      properties: {
        email: {
          key: 'email',
          type: 'string',
          arrival_format: 'text',
          data_type: 'string',
          isRequired: false,
          resolved: false,
          suggestions: [
            {
              message:
                "The Property 'customer.email' appears to be 'email' format type.",
              advice: 'Suggest to Mask the Personal Information',
              resolutionType: 'TRANSFORMATION',
              severity: 'LOW',
              path: 'properties.customer.properties.email',
            },
          ],
        },
        geo: {
          key: 'geo',
          type: 'object',
          arrival_format: 'object',
          data_type: 'object',
          isRequired: false,
          resolved: true,
          properties: {
            lat: {
              key: 'lat',
              type: 'number',
              arrival_format: 'number',
              data_type: 'double',
              isRequired: false,
              resolved: false,
              oneof: [{ type: 'double' }, { type: 'integer' }],
              suggestions: [
                {
                  message:
                    "Conflict in the Schema Generation at property: 'customer.address.geo.lat'. The property type double: 119 time(s), integer: 1 time(s), ",
                  advice:
                    'System can choose highest occurance property or last appeared object property',
                  resolutionType: 'DATA_TYPE',
                  severity: 'MUST-FIX',
                  path: 'properties.customer.properties.geo.properties.lat',
                },
              ],
            },
          },
        },
      },
    },
  },
});

const TOTAL_AMOUNT = 'properties.total_amount';
const EMAIL = 'properties.customer.properties.email';
const LAT = 'properties.customer.properties.geo.properties.lat';

const expectOk = <T extends { ok: boolean }>(result: T) => {
  expect(result.ok).toBe(true);
  return result as Extract<T, { ok: true }>;
};

type Field = Record<string, unknown> & {
  properties?: Record<string, Field>;
};

/** Reads a field by its dotted ref, keeping the tests free of `any` casts. */
const at = (dataSchema: DataSchema, ref: string): Field =>
  _.get(dataSchema, ref) as Field;

const propertiesOf = (
  dataSchema: DataSchema,
  ref = '',
): Record<string, Field> =>
  (_.get(dataSchema, ref ? `${ref}.properties` : 'properties') ?? {}) as Record<
    string,
    Field
  >;

describe('purity and the round-trip invariant', () => {
  it('never mutates the schema it was given', () => {
    const original = dataSchema();
    const snapshot = JSON.parse(JSON.stringify(original));

    setDataType(original, TOTAL_AMOUNT, 'string');
    setRequired(original, 'properties.order_id', true);
    deleteField(original, EMAIL);

    expect(original).toEqual(snapshot);
  });

  it('leaves every untouched field byte-identical', () => {
    const before = dataSchema();
    const result = expectOk(setDataType(before, TOTAL_AMOUNT, 'string'));
    const after = result.dataSchema as ReturnType<typeof dataSchema>;

    expect(after.properties.order_id).toEqual(before.properties.order_id);
    expect(after.properties.customer).toEqual(before.properties.customer);
    expect(after.$schema).toEqual(before.$schema);
    expect(after.additionalProperties).toBe(true);
  });

  it('preserves unknown keys on the edited field, including oneof as an array', () => {
    const result = expectOk(setDataType(dataSchema(), TOTAL_AMOUNT, 'string'));
    const field = at(result.dataSchema, TOTAL_AMOUNT);

    expect(field.key).toBe('total_amount');
    expect(Array.isArray(field.oneof)).toBe(true);
    expect(field.oneof).toEqual([{ type: 'double' }, { type: 'string' }]);
    expect(field.suggestions).toHaveLength(1);
  });

  it('reports the path it changed', () => {
    const result = expectOk(
      setRequired(dataSchema(), 'properties.order_id', true),
    );

    expect(result.changedRefs).toEqual(['properties.order_id']);
  });

  it('fails loudly for a ref that does not exist', () => {
    const result = setDataType(dataSchema(), 'properties.nope', 'string');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/properties\.nope/);
  });
});

describe('setDataType', () => {
  it('updates the type triple and marks the field modified', () => {
    const result = expectOk(setDataType(dataSchema(), TOTAL_AMOUNT, 'string'));
    const field = at(result.dataSchema, TOTAL_AMOUNT);

    expect(field).toMatchObject({
      type: 'string',
      arrival_format: 'text',
      data_type: 'string',
      isModified: true,
    });
  });

  it('keeps the arrival format when it already accepts the store format', () => {
    const result = expectOk(setDataType(dataSchema(), TOTAL_AMOUNT, 'integer'));
    const field = at(result.dataSchema, TOTAL_AMOUNT);

    expect(field).toMatchObject({
      arrival_format: 'number',
      data_type: 'integer',
      type: 'integer',
    });
  });

  it('edits a deeply nested field', () => {
    const result = expectOk(setDataType(dataSchema(), LAT, 'integer'));
    const geo = propertiesOf(
      result.dataSchema,
      'properties.customer.properties.geo',
    );

    expect(geo.lat).toMatchObject({
      data_type: 'integer',
      arrival_format: 'number',
      type: 'integer',
    });
  });

  it('rejects a store format no bucket accepts', () => {
    const result = setDataType(dataSchema(), TOTAL_AMOUNT, 'geo_point');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/geo_point/);
  });
});

describe('setArrivalFormat', () => {
  it('moves the bucket and re-derives the JSON Schema type', () => {
    const result = expectOk(
      setArrivalFormat(dataSchema(), TOTAL_AMOUNT, 'text'),
    );
    const field = at(result.dataSchema, TOTAL_AMOUNT);

    expect(field).toMatchObject({
      arrival_format: 'text',
      data_type: 'double',
      type: 'string',
      isModified: true,
    });
  });

  it('rejects a bucket that cannot hold the current store format', () => {
    const result = setArrivalFormat(dataSchema(), TOTAL_AMOUNT, 'boolean');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/double/);
  });
});

describe('setRequired and setDescription', () => {
  it('toggles isRequired', () => {
    const on = expectOk(setRequired(dataSchema(), 'properties.order_id', true));
    expect(at(on.dataSchema, 'properties.order_id')).toMatchObject({
      isRequired: true,
      isModified: true,
    });

    const off = expectOk(
      setRequired(on.dataSchema, 'properties.order_id', false),
    );
    expect(at(off.dataSchema, 'properties.order_id').isRequired).toBe(false);
  });

  it('sets a description', () => {
    const result = expectOk(
      setDescription(dataSchema(), 'properties.order_id', 'Unique order key'),
    );

    expect(at(result.dataSchema, 'properties.order_id').description).toBe(
      'Unique order key',
    );
  });

  it('removes the description when given an empty string', () => {
    const withText = expectOk(
      setDescription(dataSchema(), 'properties.order_id', 'temp'),
    );
    const cleared = expectOk(
      setDescription(withText.dataSchema, 'properties.order_id', ''),
    );

    expect('description' in at(cleared.dataSchema, 'properties.order_id')).toBe(
      false,
    );
  });
});

describe('deleteField', () => {
  it('removes a nested field and leaves its siblings alone', () => {
    const result = expectOk(deleteField(dataSchema(), EMAIL));
    const customer = propertiesOf(result.dataSchema, 'properties.customer');

    expect('email' in customer).toBe(false);
    expect(customer.geo).toBeDefined();
  });

  it('removes a top-level field', () => {
    const result = expectOk(deleteField(dataSchema(), TOTAL_AMOUNT));

    expect('total_amount' in propertiesOf(result.dataSchema)).toBe(false);
  });

  it('fails for a ref that does not exist', () => {
    expect(deleteField(dataSchema(), 'properties.ghost').ok).toBe(false);
  });
});

describe('addField', () => {
  it('adds a top-level field with a derived type triple', () => {
    const result = expectOk(
      addField(dataSchema(), null, 'ingested_at', 'text', 'date-time'),
    );
    const field = at(result.dataSchema, 'properties.ingested_at');

    expect(field).toMatchObject({
      key: 'ingested_at',
      type: 'string',
      arrival_format: 'text',
      data_type: 'date-time',
      isRequired: false,
      isModified: true,
      resolved: true,
    });
    expect(result.changedRefs).toEqual(['properties.ingested_at']);
  });

  it('adds a nested field under an object parent', () => {
    const result = expectOk(
      addField(dataSchema(), 'properties.customer', 'tier', 'text', 'string'),
    );

    expect(
      at(result.dataSchema, 'properties.customer.properties.tier'),
    ).toMatchObject({ key: 'tier', data_type: 'string' });
  });

  it('refuses to overwrite an existing field', () => {
    const result = addField(dataSchema(), null, 'order_id', 'text', 'string');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already exists/i);
  });

  it('refuses a parent that is not an object', () => {
    const result = addField(dataSchema(), TOTAL_AMOUNT, 'x', 'text', 'string');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not an object/i);
  });

  it('rejects an invalid type pairing', () => {
    expect(addField(dataSchema(), null, 'x', 'number', 'string').ok).toBe(
      false,
    );
  });
});

describe('conflict inspection', () => {
  it('parses the occurrence counts the API embeds in the message', () => {
    expect(
      parseConflictCounts(
        "Conflict in the Schema Generation at property: 'total_amount'. The property type double: 108 time(s), string: 12 time(s), ",
      ),
    ).toEqual({ double: 108, string: 12 });
  });

  it('returns null for a message with no counts', () => {
    expect(parseConflictCounts('Some other advice')).toBeNull();
  });

  it('lists only unresolved MUST-FIX conflicts', () => {
    expect(unresolvedConflicts(dataSchema())).toEqual([TOTAL_AMOUNT, LAT]);
  });

  it('excludes low-severity suggestions such as the PII hint', () => {
    expect(unresolvedConflicts(dataSchema())).not.toContain(EMAIL);
  });

  it('reports the API recommendation alongside the safer choice', () => {
    const options = conflictOptions(dataSchema(), LAT);

    expect(options).toEqual({
      current: 'double',
      candidates: ['double', 'integer'],
      counts: { double: 119, integer: 1 },
      // What the console's own button offers, which narrows 119 values.
      recommended: 'integer',
      // The widest candidate holds every observed value.
      safest: 'double',
      recommendationIsLossy: true,
      valuesAtRisk: 119,
    });
  });

  it('agrees with the recommendation when it is already the safe choice', () => {
    const options = conflictOptions(dataSchema(), TOTAL_AMOUNT);

    // string holds both the 108 doubles and the 12 strings, so the API's
    // recommendation is already the widest option here.
    expect(options).toMatchObject({
      current: 'double',
      recommended: 'string',
      safest: 'string',
      recommendationIsLossy: false,
      valuesAtRisk: null,
    });
  });

  it('returns null when a field carries no data-type conflict', () => {
    expect(conflictOptions(dataSchema(), 'properties.order_id')).toBeNull();
  });
});

describe('resolveConflict', () => {
  it('applying sets the type triple and marks the field resolved', () => {
    const result = expectOk(
      resolveConflict(dataSchema(), TOTAL_AMOUNT, 'apply'),
    );
    const field = at(result.dataSchema, TOTAL_AMOUNT);

    expect(field).toMatchObject({
      type: 'string',
      arrival_format: 'text',
      data_type: 'string',
      resolved: true,
      isModified: true,
      disableActions: true,
    });
    expect(field.oneof).toEqual([{ type: 'double' }, { type: 'string' }]);
  });

  it('applying can take an explicit data type instead of the recommendation', () => {
    const result = expectOk(
      resolveConflict(dataSchema(), LAT, 'apply', 'double'),
    );
    const field = at(result.dataSchema, LAT);

    expect(field).toMatchObject({ data_type: 'double', resolved: true });
  });

  it('dismissing marks the field resolved without changing its type', () => {
    const before = dataSchema();
    const result = expectOk(resolveConflict(before, LAT, 'dismiss'));
    const field = at(result.dataSchema, LAT);

    expect(field).toMatchObject({
      data_type: 'double',
      arrival_format: 'number',
      type: 'number',
      resolved: true,
      isModified: true,
    });
    expect('disableActions' in field).toBe(false);
  });

  it('fails for a field with nothing to resolve', () => {
    const result = resolveConflict(
      dataSchema(),
      'properties.order_id',
      'apply',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no data-type conflict/i);
  });
});
