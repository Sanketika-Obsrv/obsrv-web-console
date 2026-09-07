/**
 * The Obsrv type system, transcribed from the `dataMappings` block that
 * `POST /config/v2/datasets/dataschema` returns.
 *
 * The API models a field as a pair: an `arrival_format` bucket (how the value
 * shows up in the event) and a `data_type` store format (how it is stored).
 * Each pairing fixes the JSON Schema `type` and the datasource type.
 *
 * It lives as a constant because `dataMappings` only comes back from schema
 * inference — a plain `datasets/read` does not include it, and the assistant
 * still needs to reason about types on every turn.
 */
import { ArrivalFormat, DataType } from './actions';

export interface StoreFormat {
  jsonSchema: string;
  datasource: string;
}

export interface MappingBucket {
  /** Raw JSON types that arrive in this bucket. */
  arrivalFormat: string[];
  storeFormat: Record<string, StoreFormat>;
}

export const DATA_MAPPINGS: Record<ArrivalFormat, MappingBucket> = {
  text: {
    arrivalFormat: ['string'],
    storeFormat: {
      string: { jsonSchema: 'string', datasource: 'string' },
      'date-time': { jsonSchema: 'string', datasource: 'string' },
      date: { jsonSchema: 'string', datasource: 'string' },
      boolean: { jsonSchema: 'string', datasource: 'boolean' },
      epoch: { jsonSchema: 'string', datasource: 'integer' },
      long: { jsonSchema: 'string', datasource: 'long' },
      double: { jsonSchema: 'string', datasource: 'double' },
      bigdecimal: { jsonSchema: 'string', datasource: 'double' },
      integer: { jsonSchema: 'string', datasource: 'long' },
    },
  },
  number: {
    arrivalFormat: ['number', 'integer'],
    storeFormat: {
      integer: { jsonSchema: 'integer', datasource: 'long' },
      float: { jsonSchema: 'float', datasource: 'double' },
      long: { jsonSchema: 'integer', datasource: 'long' },
      double: { jsonSchema: 'double', datasource: 'double' },
      bigdecimal: { jsonSchema: 'number', datasource: 'double' },
      epoch: { jsonSchema: 'integer', datasource: 'long' },
      number: { jsonSchema: 'double', datasource: 'double' },
    },
  },
  object: {
    arrivalFormat: ['object'],
    storeFormat: { object: { jsonSchema: 'object', datasource: 'json' } },
  },
  array: {
    arrivalFormat: ['array'],
    storeFormat: { array: { jsonSchema: 'array', datasource: 'array' } },
  },
  boolean: {
    arrivalFormat: ['boolean'],
    storeFormat: { boolean: { jsonSchema: 'boolean', datasource: 'boolean' } },
  },
};

/**
 * Bucket preference when more than one accepts a store format.
 *
 * `text` first because it is the widening, lossless choice: the wizard resolves
 * a double/string conflict by moving the field to `text`, never by narrowing.
 */
const BUCKET_PREFERENCE: ArrivalFormat[] = [
  'text',
  'number',
  'boolean',
  'object',
  'array',
];

export interface TypeChange {
  arrivalFormat: ArrivalFormat;
  dataType: string;
  /** JSON Schema `type` for the pairing. */
  type: string;
}

export const dataTypesFor = (arrivalFormat: ArrivalFormat): string[] =>
  Object.keys(DATA_MAPPINGS[arrivalFormat]?.storeFormat ?? {});

export const arrivalFormatsFor = (dataType: string): ArrivalFormat[] =>
  BUCKET_PREFERENCE.filter((bucket) =>
    Object.prototype.hasOwnProperty.call(
      DATA_MAPPINGS[bucket].storeFormat,
      dataType,
    ),
  );

export const isDataTypeAllowed = (
  arrivalFormat: ArrivalFormat,
  dataType: string,
): boolean => dataTypesFor(arrivalFormat).includes(dataType);

const storeFormat = (
  arrivalFormat: ArrivalFormat,
  dataType: string,
): StoreFormat | undefined =>
  DATA_MAPPINGS[arrivalFormat]?.storeFormat[dataType];

export const jsonSchemaTypeFor = (
  arrivalFormat: ArrivalFormat,
  dataType: string,
): string | undefined => storeFormat(arrivalFormat, dataType)?.jsonSchema;

export const datasourceTypeFor = (
  arrivalFormat: ArrivalFormat,
  dataType: string,
): string | undefined => storeFormat(arrivalFormat, dataType)?.datasource;

/**
 * Works out the full type triple for a requested store format, keeping the
 * current bucket where possible and otherwise moving to the preferred bucket
 * that accepts it. Returns null when no bucket does.
 */
export const resolveTypeChange = (
  currentArrivalFormat: ArrivalFormat | string | undefined,
  dataType: DataType | string,
): TypeChange | null => {
  const current = currentArrivalFormat as ArrivalFormat;

  if (current && isDataTypeAllowed(current, dataType)) {
    return {
      arrivalFormat: current,
      dataType,
      type: jsonSchemaTypeFor(current, dataType) as string,
    };
  }

  const [fallback] = arrivalFormatsFor(dataType);
  if (!fallback) return null;

  return {
    arrivalFormat: fallback,
    dataType,
    type: jsonSchemaTypeFor(fallback, dataType) as string,
  };
};
