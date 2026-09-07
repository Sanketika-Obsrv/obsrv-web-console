import {
  DATA_MAPPINGS,
  arrivalFormatsFor,
  dataTypesFor,
  datasourceTypeFor,
  isDataTypeAllowed,
  jsonSchemaTypeFor,
  resolveTypeChange,
} from './dataMappings';

describe('DATA_MAPPINGS', () => {
  it('mirrors the buckets returned by datasets/dataschema', () => {
    expect(Object.keys(DATA_MAPPINGS).sort()).toEqual([
      'array',
      'boolean',
      'number',
      'object',
      'text',
    ]);
  });

  it('lists the store formats the API allows per bucket', () => {
    expect(dataTypesFor('text')).toEqual([
      'string',
      'date-time',
      'date',
      'boolean',
      'epoch',
      'long',
      'double',
      'bigdecimal',
      'integer',
    ]);
    expect(dataTypesFor('number')).toEqual([
      'integer',
      'float',
      'long',
      'double',
      'bigdecimal',
      'epoch',
      'number',
    ]);
    expect(dataTypesFor('object')).toEqual(['object']);
    expect(dataTypesFor('array')).toEqual(['array']);
    expect(dataTypesFor('boolean')).toEqual(['boolean']);
  });
});

describe('type lookups', () => {
  it('maps a bucket and store format to the JSON Schema type', () => {
    expect(jsonSchemaTypeFor('text', 'string')).toBe('string');
    expect(jsonSchemaTypeFor('text', 'double')).toBe('string');
    expect(jsonSchemaTypeFor('text', 'boolean')).toBe('string');
    expect(jsonSchemaTypeFor('number', 'double')).toBe('double');
    expect(jsonSchemaTypeFor('number', 'integer')).toBe('integer');
    expect(jsonSchemaTypeFor('number', 'bigdecimal')).toBe('number');
    expect(jsonSchemaTypeFor('object', 'object')).toBe('object');
    expect(jsonSchemaTypeFor('boolean', 'boolean')).toBe('boolean');
  });

  it('maps to the datasource type used by the stores', () => {
    expect(datasourceTypeFor('text', 'boolean')).toBe('boolean');
    expect(datasourceTypeFor('text', 'integer')).toBe('long');
    expect(datasourceTypeFor('object', 'object')).toBe('json');
    expect(datasourceTypeFor('number', 'float')).toBe('double');
  });

  it('returns undefined for a combination the API does not allow', () => {
    expect(jsonSchemaTypeFor('number', 'string')).toBeUndefined();
    expect(datasourceTypeFor('array', 'string')).toBeUndefined();
  });

  it('reports which buckets accept a store format', () => {
    expect(arrivalFormatsFor('string')).toEqual(['text']);
    expect(arrivalFormatsFor('double')).toEqual(['text', 'number']);
    expect(arrivalFormatsFor('boolean')).toEqual(['text', 'boolean']);
    expect(arrivalFormatsFor('object')).toEqual(['object']);
    expect(arrivalFormatsFor('nonsense')).toEqual([]);
  });

  it('validates a bucket and store format pairing', () => {
    expect(isDataTypeAllowed('text', 'date-time')).toBe(true);
    expect(isDataTypeAllowed('number', 'date-time')).toBe(false);
  });
});

describe('resolveTypeChange', () => {
  it('keeps the arrival format when it already accepts the store format', () => {
    expect(resolveTypeChange('number', 'integer')).toEqual({
      arrivalFormat: 'number',
      type: 'integer',
      dataType: 'integer',
    });
    expect(resolveTypeChange('text', 'date-time')).toEqual({
      arrivalFormat: 'text',
      type: 'string',
      dataType: 'date-time',
    });
  });

  it('switches bucket when the current one cannot hold the store format', () => {
    // Reproduces the wizard resolving total_amount (double|string) to string:
    // arrival_format moved from number to text.
    expect(resolveTypeChange('number', 'string')).toEqual({
      arrivalFormat: 'text',
      type: 'string',
      dataType: 'string',
    });
  });

  it('prefers text over number when both accept the store format', () => {
    expect(resolveTypeChange('text', 'double')).toEqual({
      arrivalFormat: 'text',
      type: 'string',
      dataType: 'double',
    });
    expect(resolveTypeChange('number', 'double')).toEqual({
      arrivalFormat: 'number',
      type: 'double',
      dataType: 'double',
    });
    expect(resolveTypeChange('object', 'double')).toEqual({
      arrivalFormat: 'text',
      type: 'string',
      dataType: 'double',
    });
  });

  it('returns null for a store format no bucket accepts', () => {
    expect(resolveTypeChange('text', 'geo_point')).toBeNull();
  });
});
