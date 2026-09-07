jest.mock('services/datasetApi', () => ({
  readDataset: jest.fn(),
  updateDataset: jest.fn(),
}));

import _ from 'lodash';
import { readDataset, updateDataset } from 'services/datasetApi';
import { Action } from './actions';
import { executeAction } from './executor';

const mockRead = readDataset as jest.MockedFunction<typeof readDataset>;
const mockUpdate = updateDataset as jest.MockedFunction<typeof updateDataset>;

const DATASET_ID = 'claude-probe-orders';

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
          resolved: true,
        },
      },
    },
  },
});

/** First read returns the pre-edit dataset, the second the post-PATCH truth. */
const stubReads = (versionKey = '111', nextVersionKey = '222') => {
  mockRead
    .mockResolvedValueOnce({
      dataset_id: DATASET_ID,
      data_schema: dataSchema(),
      version_key: versionKey,
    })
    .mockResolvedValueOnce({
      dataset_id: DATASET_ID,
      data_schema: dataSchema(),
      version_key: nextVersionKey,
    });
  mockUpdate.mockResolvedValue({ version_key: nextVersionKey });
};

type Field = Record<string, unknown> & {
  properties?: Record<string, Field>;
};

const patchedSchema = () =>
  mockUpdate.mock.calls[0][0].data_schema as Record<string, unknown>;

/** Reads a patched field by dotted ref, avoiding `any` and optional chains. */
const patchedField = (ref: string): Field =>
  _.get(patchedSchema(), ref) as Field;

const patchedProperties = (ref = ''): Record<string, Field> =>
  (_.get(patchedSchema(), ref ? `${ref}.properties` : 'properties') ??
    {}) as Record<string, Field>;

const run = (action: Action) =>
  executeAction(action, { datasetId: DATASET_ID });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('read-modify-write ordering', () => {
  it('reads, patches, then reads again for truth', async () => {
    // Deliberately no `stubReads()` here: queued `mockResolvedValueOnce`
    // values are consumed before any `mockImplementation`.
    const order: string[] = [];
    mockRead.mockImplementation(async () => {
      order.push('read');
      return {
        dataset_id: DATASET_ID,
        data_schema: dataSchema(),
        version_key: '111',
      };
    });
    mockUpdate.mockImplementation(async () => {
      order.push('update');
      return { version_key: '222' };
    });

    await run({ kind: 'toggle_required', path: 'order_id', required: true });

    expect(order).toEqual(['read', 'update', 'read']);
  });

  it('sends the version_key from the read that produced the payload', async () => {
    stubReads('987654321');

    await run({ kind: 'toggle_required', path: 'order_id', required: true });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      dataset_id: DATASET_ID,
      version_key: '987654321',
    });
  });

  it('requests only the fields it needs, in edit mode', async () => {
    stubReads();

    await run({ kind: 'toggle_required', path: 'order_id', required: true });

    expect(mockRead.mock.calls[0][0]).toMatchObject({
      datasetId: DATASET_ID,
      fields: 'dataset_id,data_schema,version_key',
    });
  });

  it('returns the re-read dataset rather than the local write buffer', async () => {
    stubReads('111', '222');

    const result = await run({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'applied') {
      expect(result.dataset.version_key).toBe('222');
      expect(result.changedRefs).toEqual(['properties.order_id']);
    }
  });
});

describe('schema actions', () => {
  it('set_data_type patches the resolved type triple', async () => {
    stubReads();

    await run({
      kind: 'set_data_type',
      path: 'total_amount',
      dataType: 'string',
    });

    expect(patchedField('properties.total_amount')).toMatchObject({
      type: 'string',
      arrival_format: 'text',
      data_type: 'string',
      isModified: true,
    });
  });

  it('set_arrival_format patches the bucket', async () => {
    stubReads();

    await run({
      kind: 'set_arrival_format',
      path: 'total_amount',
      arrivalFormat: 'text',
    });

    expect(patchedField('properties.total_amount')).toMatchObject({
      arrival_format: 'text',
      type: 'string',
    });
  });

  it('toggle_required patches isRequired', async () => {
    stubReads();

    await run({ kind: 'toggle_required', path: 'order_id', required: true });

    expect(patchedField('properties.order_id')).toMatchObject({
      isRequired: true,
    });
  });

  it('set_description patches a nested field by dot path', async () => {
    stubReads();

    await run({
      kind: 'set_description',
      path: 'customer.email',
      description: 'Contact address',
    });

    expect(patchedField('properties.customer.properties.email')).toMatchObject({
      description: 'Contact address',
    });
  });

  it('delete_field removes the field from the patched schema', async () => {
    stubReads();

    await run({ kind: 'delete_field', path: 'customer.email' });

    expect('email' in patchedProperties('properties.customer')).toBe(false);
  });

  it('add_field appends under the requested parent', async () => {
    stubReads();

    await run({
      kind: 'add_field',
      parentPath: 'customer',
      name: 'tier',
      arrivalFormat: 'text',
      dataType: 'string',
    });

    expect(patchedField('properties.customer.properties.tier')).toMatchObject({
      key: 'tier',
      data_type: 'string',
    });
  });

  it('add_field without a parent appends at the root', async () => {
    stubReads();

    await run({
      kind: 'add_field',
      name: 'ingested_at',
      arrivalFormat: 'text',
      dataType: 'date-time',
    });

    expect(patchedField('properties.ingested_at')).toMatchObject({
      data_type: 'date-time',
    });
  });

  it('resolve_conflict applies the console recommendation by default', async () => {
    stubReads();

    await run({
      kind: 'resolve_conflict',
      path: 'total_amount',
      mode: 'apply',
    });

    expect(patchedField('properties.total_amount')).toMatchObject({
      data_type: 'string',
      resolved: true,
      disableActions: true,
    });
  });

  it('resolve_conflict honours an explicit data type', async () => {
    stubReads();

    await run({
      kind: 'resolve_conflict',
      path: 'total_amount',
      mode: 'apply',
      dataType: 'bigdecimal',
    });

    expect(patchedField('properties.total_amount')).toMatchObject({
      data_type: 'bigdecimal',
      resolved: true,
    });
  });

  it('resolve_conflict dismiss keeps the type', async () => {
    stubReads();

    await run({
      kind: 'resolve_conflict',
      path: 'total_amount',
      mode: 'dismiss',
    });

    expect(patchedField('properties.total_amount')).toMatchObject({
      data_type: 'double',
      resolved: true,
    });
  });

  it('leaves the rest of the schema untouched', async () => {
    stubReads();
    const before = dataSchema();

    await run({ kind: 'toggle_required', path: 'order_id', required: true });

    expect(patchedField('properties.customer')).toEqual(
      before.properties.customer,
    );
    expect(patchedField('properties.total_amount')).toEqual(
      before.properties.total_amount,
    );
    expect(patchedSchema().$schema).toEqual(before.$schema);
  });
});

describe('failure handling', () => {
  it('does not patch when the field is unknown', async () => {
    stubReads();

    const result = await run({
      kind: 'set_data_type',
      path: 'shipping_weight',
      dataType: 'string',
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/shipping_weight/);
      expect(result.code).toBe('UNKNOWN_FIELD');
    }
  });

  it('does not patch when the edit itself is invalid', async () => {
    stubReads();

    const result = await run({
      kind: 'set_arrival_format',
      path: 'total_amount',
      arrivalFormat: 'boolean',
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_EDIT');
  });

  it('surfaces the API error code and message from a failed patch', async () => {
    mockRead.mockResolvedValueOnce({
      dataset_id: DATASET_ID,
      data_schema: dataSchema(),
      version_key: '111',
    });
    mockUpdate.mockRejectedValue({
      response: {
        status: 400,
        data: {
          error: {
            code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
            message: 'The storage type "lake_house" is not available.',
          },
        },
      },
    });

    const result = await run({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('DATASET_UNSUPPORTED_STORAGE_TYPE');
      expect(result.error).toMatch(/lake_house/);
    }
  });

  it('reports a read failure without attempting a patch', async () => {
    mockRead.mockRejectedValue(new Error('network down'));

    const result = await run({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/network down/);
  });

  it('reports a missing data_schema rather than patching an empty one', async () => {
    mockRead.mockResolvedValueOnce({
      dataset_id: DATASET_ID,
      version_key: '111',
    });

    const result = await run({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NO_SCHEMA');
  });

  it('rejects an action that is not wired up yet without calling the API', async () => {
    // `undo` lands with the hardening task; `save` is wired now.
    const result = await run({ kind: 'undo' });

    expect(mockRead).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UNSUPPORTED_ACTION');
  });
});
