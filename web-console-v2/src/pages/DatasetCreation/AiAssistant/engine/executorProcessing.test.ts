jest.mock('services/datasetApi', () => ({
  readDataset: jest.fn(),
  updateDataset: jest.fn(),
  datasetStatusTransition: jest.fn(),
}));

import _ from 'lodash';
import {
  datasetStatusTransition,
  readDataset,
  updateDataset,
} from 'services/datasetApi';
import { Action } from './actions';
import { EVENT_ARRIVAL_TIME, ExecutorContext, executeAction } from './executor';

const mocked = {
  read: readDataset as jest.MockedFunction<typeof readDataset>,
  update: updateDataset as jest.MockedFunction<typeof updateDataset>,
  transition: datasetStatusTransition as jest.MockedFunction<
    typeof datasetStatusTransition
  >,
};

const DATASET_ID = 'my-orders';

const dataSchema = () => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: true,
  properties: {
    order_id: { key: 'order_id', type: 'string', data_type: 'string' },
    total_amount: { key: 'total_amount', type: 'number', data_type: 'double' },
    customer: {
      key: 'customer',
      type: 'object',
      data_type: 'object',
      properties: {
        email: { key: 'email', type: 'string', data_type: 'string' },
      },
    },
  },
});

const SAMPLE = {
  mergedEvent: {
    order_id: 'ORD-1',
    total_amount: 263.37,
    customer: { email: 'user1@example.com' },
  },
};

const draft = (overrides: Record<string, unknown> = {}) => ({
  dataset_id: DATASET_ID,
  version_key: '111',
  type: 'event',
  data_schema: dataSchema(),
  sample_data: SAMPLE,
  validation_config: { validate: true, mode: 'Strict' },
  dedup_config: { drop_duplicates: false, dedup_key: '' },
  denorm_config: {
    redis_db_host: 'valkey.local',
    redis_db_port: 6379,
    denorm_fields: [],
  },
  transformations_config: [],
  dataset_config: {
    keys_config: { data_key: '', partition_key: '', timestamp_key: '' },
    indexing_config: {
      olap_store_enabled: true,
      lakehouse_enabled: false,
      cache_enabled: false,
    },
    file_upload_path: ['uploads/orders.json'],
  },
  ...overrides,
});

const run = (action: Action, context: Partial<ExecutorContext> = {}) =>
  executeAction(action, {
    datasetId: DATASET_ID,
    ...context,
  } as ExecutorContext);

const patched = () => mocked.update.mock.calls[0][0];
const patchedAt = (path: string) => _.get(patched(), path);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.read.mockResolvedValue(draft());
  mocked.update.mockResolvedValue({ version_key: '222' });
  mocked.transition.mockResolvedValue({ dataset_id: DATASET_ID });
});

describe('set_additional_fields', () => {
  it('switches the validation mode and mirrors it onto the schema', async () => {
    await run({ kind: 'set_additional_fields', allow: true });

    expect(patchedAt('validation_config')).toEqual({
      validate: true,
      mode: 'IgnoreNewFields',
    });
    expect(patchedAt('data_schema.additionalProperties')).toBe(true);
    expect(
      patchedAt('data_schema.properties.customer.additionalProperties'),
    ).toBe(true);
  });

  it('tightens the schema when additional fields are refused', async () => {
    await run({ kind: 'set_additional_fields', allow: false });

    expect(patchedAt('validation_config')).toEqual({
      validate: true,
      mode: 'Strict',
    });
    expect(patchedAt('data_schema.additionalProperties')).toBe(false);
    expect(
      patchedAt('data_schema.properties.customer.additionalProperties'),
    ).toBe(false);
  });
});

describe('set_pii', () => {
  it('appends a pii transformation in the shape the console uses', async () => {
    await run({
      kind: 'set_pii',
      path: 'customer.email',
      action: 'mask',
      skipOnFailure: true,
    });

    // `transformations_config` is a delta API: entries must be wrapped.
    expect(patchedAt('transformations_config')).toEqual([
      {
        value: {
          field_key: 'customer.email',
          transformation_function: {
            type: 'mask',
            expr: 'customer.email',
            datatype: 'string',
            category: 'pii',
          },
          mode: 'Strict',
        },
        action: 'upsert',
      },
    ]);
  });

  it('maps skipOnFailure false to Lenient', async () => {
    await run({
      kind: 'set_pii',
      path: 'customer.email',
      action: 'encrypt',
      skipOnFailure: false,
    });

    expect(patchedAt('transformations_config[0].value.mode')).toBe('Lenient');
    expect(
      patchedAt('transformations_config[0].value.transformation_function.type'),
    ).toBe('encrypt');
  });

  it('replaces an existing entry for the same field', async () => {
    mocked.read.mockResolvedValue(
      draft({
        transformations_config: [
          {
            field_key: 'customer.email',
            transformation_function: { type: 'mask', category: 'pii' },
            mode: 'Lenient',
          },
          {
            field_key: 'order_id',
            transformation_function: { type: 'mask', category: 'pii' },
            mode: 'Strict',
          },
        ],
      }),
    );

    await run({
      kind: 'set_pii',
      path: 'customer.email',
      action: 'encrypt',
      skipOnFailure: true,
    });

    // Replacing sends a remove followed by an upsert, as the console does.
    expect(patchedAt('transformations_config')).toEqual([
      { value: { field_key: 'customer.email' }, action: 'remove' },
      {
        value: {
          field_key: 'customer.email',
          transformation_function: {
            type: 'encrypt',
            expr: 'customer.email',
            datatype: 'string',
            category: 'pii',
          },
          mode: 'Strict',
        },
        action: 'upsert',
      },
    ]);
  });

  it('rejects an unknown field before patching', async () => {
    const result = await run({
      kind: 'set_pii',
      path: 'nope',
      action: 'mask',
      skipOnFailure: true,
    });

    expect(mocked.update).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UNKNOWN_FIELD');
  });
});

describe('add_transformation', () => {
  it('evaluates the expression against the sample to derive its datatype', async () => {
    await run({
      kind: 'add_transformation',
      path: 'customer.email',
      expression: '$lowercase(customer.email)',
      skipOnFailure: true,
    });

    expect(patchedAt('transformations_config[0]')).toEqual({
      value: {
        field_key: 'customer.email',
        transformation_function: {
          type: 'jsonata',
          expr: '$lowercase(customer.email)',
          datatype: 'string',
          category: 'transform',
        },
        mode: 'Strict',
      },
      action: 'upsert',
    });
  });

  it('derives a numeric datatype from a numeric expression', async () => {
    await run({
      kind: 'add_transformation',
      path: 'total_amount',
      expression: 'total_amount * 2',
      skipOnFailure: true,
    });

    expect(
      patchedAt(
        'transformations_config[0].value.transformation_function.datatype',
      ),
    ).toBe('double');
  });

  it('refuses an invalid expression without patching', async () => {
    const result = await run({
      kind: 'add_transformation',
      path: 'customer.email',
      expression: '$nope(((',
      skipOnFailure: true,
    });

    expect(mocked.update).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_EXPRESSION');
  });

  it('refuses an expression that matches nothing in the sample', async () => {
    const result = await run({
      kind: 'add_transformation',
      path: 'customer.email',
      expression: 'missing_field',
      skipOnFailure: true,
    });

    expect(mocked.update).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_EXPRESSION');
  });
});

describe('add_derived_field', () => {
  it('adds a derived transformation keyed by the new field name', async () => {
    await run({
      kind: 'add_derived_field',
      name: 'email_domain',
      expression: '$substringAfter(customer.email, "@")',
      skipOnFailure: false,
    });

    expect(patchedAt('transformations_config[0]')).toEqual({
      value: {
        field_key: 'email_domain',
        transformation_function: {
          type: 'jsonata',
          expr: '$substringAfter(customer.email, "@")',
          datatype: 'string',
          category: 'derived',
        },
        mode: 'Lenient',
      },
      action: 'upsert',
    });
  });

  it('does not require the new name to exist in the schema', async () => {
    const result = await run({
      kind: 'add_derived_field',
      name: 'brand_new',
      expression: 'order_id',
      skipOnFailure: true,
    });

    expect(result.ok).toBe(true);
    expect(mocked.update).toHaveBeenCalled();
  });
});

describe('set_dedup', () => {
  it('enables deduplication with the chosen key', async () => {
    await run({ kind: 'set_dedup', enabled: true, key: 'order_id' });

    expect(patchedAt('dedup_config')).toEqual({
      drop_duplicates: true,
      dedup_key: 'order_id',
    });
  });

  it('disables deduplication and clears the key', async () => {
    await run({ kind: 'set_dedup', enabled: false });

    expect(patchedAt('dedup_config')).toEqual({
      drop_duplicates: false,
      dedup_key: '',
    });
  });

  it('never echoes back the server-managed dedup_period', async () => {
    mocked.read.mockResolvedValue(
      draft({
        dedup_config: {
          drop_duplicates: false,
          dedup_key: 'id',
          dedup_period: 604800,
        },
      }),
    );

    await run({ kind: 'set_dedup', enabled: true, key: 'order_id' });

    expect(patchedAt('dedup_config')).toEqual({
      drop_duplicates: true,
      dedup_key: 'order_id',
    });
  });

  it('refuses a key that is not eligible', async () => {
    const result = await run({
      kind: 'set_dedup',
      enabled: true,
      key: 'customer.email',
    });

    expect(mocked.update).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INELIGIBLE_DEDUP_KEY');
  });
});

describe('set_denorm', () => {
  it('appends a denorm field, keeping the redis config intact', async () => {
    await run({
      kind: 'set_denorm',
      path: 'order_id',
      masterDatasetId: 'customer-master',
      outField: 'customer_details',
    });

    // Server-managed redis settings must not be echoed, and `denorm_fields`
    // is a delta list like `transformations_config`.
    expect(patchedAt('denorm_config')).toEqual({
      denorm_fields: [
        {
          value: {
            denorm_key: 'order_id',
            denorm_out_field: 'customer_details',
            dataset_id: 'customer-master',
          },
          action: 'upsert',
        },
      ],
    });
  });

  it('replaces an existing entry for the same key', async () => {
    mocked.read.mockResolvedValue(
      draft({
        denorm_config: {
          redis_db_host: 'valkey.local',
          redis_db_port: 6379,
          denorm_fields: [
            {
              denorm_key: 'order_id',
              denorm_out_field: 'old',
              dataset_id: 'old-master',
            },
          ],
        },
      }),
    );

    await run({
      kind: 'set_denorm',
      path: 'order_id',
      masterDatasetId: 'customer-master',
      outField: 'customer_details',
    });

    expect(patchedAt('denorm_config.denorm_fields')).toEqual([
      { value: { denorm_key: 'order_id' }, action: 'remove' },
      {
        value: {
          denorm_key: 'order_id',
          denorm_out_field: 'customer_details',
          dataset_id: 'customer-master',
        },
        action: 'upsert',
      },
    ]);
  });
});

describe('set_storage', () => {
  it('flips only the flags it was given', async () => {
    await run({ kind: 'set_storage', lakehouse: true });

    expect(patchedAt('dataset_config.indexing_config')).toEqual({
      olap_store_enabled: true,
      lakehouse_enabled: true,
      cache_enabled: false,
    });
  });

  it('preserves the upload path and keys', async () => {
    // Not `realtime: false` here: with lakehouse and cache already off that
    // would disable every store, which the guard below rejects.
    await run({ kind: 'set_storage', cache: true });

    expect(patchedAt('dataset_config.file_upload_path')).toEqual([
      'uploads/orders.json',
    ]);
    expect(patchedAt('dataset_config.keys_config')).toEqual({
      data_key: '',
      partition_key: '',
      timestamp_key: '',
    });
  });

  it('sends only the three keys dataset_config accepts', async () => {
    // `dataset_config` is additionalProperties:false, so echoing back the
    // server-managed `cache_config` is rejected.
    mocked.read.mockResolvedValue(
      draft({
        dataset_config: {
          keys_config: { data_key: '', partition_key: '', timestamp_key: '' },
          indexing_config: {
            olap_store_enabled: true,
            lakehouse_enabled: false,
            cache_enabled: false,
          },
          file_upload_path: ['uploads/orders.json'],
          cache_config: { redis_db_host: 'valkey.local', redis_db_port: 6379 },
        },
      }),
    );

    await run({ kind: 'set_storage', lakehouse: true });

    expect(Object.keys(patchedAt('dataset_config') as object).sort()).toEqual([
      'file_upload_path',
      'indexing_config',
      'keys_config',
    ]);
  });

  it('forces the cache store on for a master dataset', async () => {
    mocked.read.mockResolvedValue(draft({ type: 'master' }));

    await run({ kind: 'set_storage', cache: false });

    expect(patchedAt('dataset_config.indexing_config.cache_enabled')).toBe(
      true,
    );
  });

  it('refuses to disable every store', async () => {
    const result = await run({
      kind: 'set_storage',
      realtime: false,
      lakehouse: false,
      cache: false,
    });

    expect(mocked.update).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NO_STORAGE_SELECTED');
  });
});

describe('set_keys', () => {
  it('sets the keys it was given and leaves the others alone', async () => {
    await run({ kind: 'set_keys', primary: 'order_id' });

    expect(patchedAt('dataset_config.keys_config')).toEqual({
      data_key: 'order_id',
      partition_key: '',
      timestamp_key: '',
    });
  });

  it('translates the event arrival time sentinel', async () => {
    await run({ kind: 'set_keys', timestamp: 'Event Arrival Time' });

    expect(patchedAt('dataset_config.keys_config.timestamp_key')).toBe(
      EVENT_ARRIVAL_TIME,
    );
  });

  it('accepts a date-time field as the timestamp key', async () => {
    mocked.read.mockResolvedValue(
      draft({
        data_schema: {
          ...dataSchema(),
          properties: {
            ...dataSchema().properties,
            order_ts: {
              key: 'order_ts',
              type: 'string',
              data_type: 'date-time',
            },
          },
        },
      }),
    );

    await run({ kind: 'set_keys', timestamp: 'order_ts' });

    expect(patchedAt('dataset_config.keys_config.timestamp_key')).toBe(
      'order_ts',
    );
  });

  it('refuses a timestamp key that is not a date-time field', async () => {
    const result = await run({ kind: 'set_keys', timestamp: 'order_id' });

    expect(mocked.update).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INELIGIBLE_TIMESTAMP_KEY');
  });

  it('refuses a primary key that is not eligible', async () => {
    const result = await run({ kind: 'set_keys', primary: 'customer.email' });

    expect(mocked.update).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INELIGIBLE_STORAGE_KEY');
  });
});

describe('save', () => {
  it('transitions the draft to ReadyToPublish', async () => {
    mocked.read.mockResolvedValue(draft({ status: 'ReadyToPublish' }));

    const result = await run({ kind: 'save' });

    expect(mocked.transition).toHaveBeenCalledWith(
      DATASET_ID,
      'ReadyToPublish',
    );
    expect(result.ok).toBe(true);
  });

  it('surfaces the API error when the transition is rejected', async () => {
    mocked.transition.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
            message: 'The storage type "lake_house" is not available.',
          },
        },
      },
    });

    const result = await run({ kind: 'save' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('DATASET_UNSUPPORTED_STORAGE_TYPE');
    }
  });

  it('does nothing without a dataset', async () => {
    const result = await run({ kind: 'save' }, { datasetId: null });

    expect(mocked.transition).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });
});

describe('goto_step', () => {
  it('changes step without touching the API', async () => {
    const result = await run({ kind: 'goto_step', step: 'storage' });

    expect(mocked.read).not.toHaveBeenCalled();
    expect(mocked.update).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});
