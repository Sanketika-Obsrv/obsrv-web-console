jest.mock('services/datasetApi', () => ({
  readDataset: jest.fn(),
  updateDataset: jest.fn(),
  createDataset: jest.fn(),
  datasetExists: jest.fn(),
  generateUploadUrls: jest.fn(),
  uploadToPresignedUrl: jest.fn(),
  generateDataSchema: jest.fn(),
}));

import {
  createDataset,
  datasetExists,
  generateDataSchema,
  generateUploadUrls,
  readDataset,
  updateDataset,
  uploadToPresignedUrl,
} from 'services/datasetApi';
import { Action } from './actions';
import { ExecutorContext, executeAction } from './executor';

const mocked = {
  read: readDataset as jest.MockedFunction<typeof readDataset>,
  update: updateDataset as jest.MockedFunction<typeof updateDataset>,
  create: createDataset as jest.MockedFunction<typeof createDataset>,
  exists: datasetExists as jest.MockedFunction<typeof datasetExists>,
  urls: generateUploadUrls as jest.MockedFunction<typeof generateUploadUrls>,
  upload: uploadToPresignedUrl as jest.MockedFunction<
    typeof uploadToPresignedUrl
  >,
  schema: generateDataSchema as jest.MockedFunction<typeof generateDataSchema>,
};

const ROWS = [
  { order_id: 'ORD-1', items: [{ sku: 'SKU-1' }] },
  { order_id: 'ORD-2', coupon_code: 'SAVE10' },
];

const INFERRED = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: { order_id: { type: 'string', data_type: 'string' } },
};

const sampleFile = () =>
  new File([JSON.stringify(ROWS)], 'orders.json', {
    type: 'application/json',
  });

const run = (action: Action, context: Partial<ExecutorContext> = {}) =>
  executeAction(action, { datasetId: null, ...context } as ExecutorContext);

/** Dataset-not-found is how the API reports an available id. */
const idIsFree = () =>
  mocked.exists.mockRejectedValue({
    response: { status: 404, data: { error: { code: 'DATASET_NOT_FOUND' } } },
  });

beforeEach(() => {
  jest.clearAllMocks();
  mocked.urls.mockResolvedValue([
    {
      filePath: 'api-service/user_uploads/orders_abc.json',
      fileName: 'orders.json',
      preSignedUrl: 'https://signed.example/put',
    },
  ]);
  mocked.upload.mockResolvedValue({} as never);
  mocked.schema.mockResolvedValue({ schema: INFERRED });
  mocked.create.mockResolvedValue({ id: 'my-orders', version_key: '111' });
  mocked.update.mockResolvedValue({ version_key: '222' });
  mocked.read.mockResolvedValue({
    dataset_id: 'my-orders',
    data_schema: INFERRED,
    version_key: '222',
  });
});

describe('set_dataset_name before the draft exists', () => {
  it('checks availability and returns the derived id as pending state', async () => {
    idIsFree();

    const result = await run({ kind: 'set_dataset_name', name: 'My Orders' });

    expect(mocked.exists).toHaveBeenCalledWith('my-orders');
    expect(mocked.create).not.toHaveBeenCalled();
    expect(mocked.update).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'pending') {
      expect(result.pending).toEqual({
        name: 'My Orders',
        datasetId: 'my-orders',
      });
    }
  });

  it('rejects a name whose id is already taken', async () => {
    mocked.exists.mockResolvedValue({ responseCode: 'OK', result: {} });

    const result = await run({ kind: 'set_dataset_name', name: 'My Orders' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('DATASET_ID_TAKEN');
      expect(result.error).toMatch(/my-orders/);
    }
  });

  it('rejects a name with characters the console refuses', async () => {
    const result = await run({ kind: 'set_dataset_name', name: 'Orders!' });

    expect(mocked.exists).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_DATASET_NAME');
  });
});

describe('set_dataset_name after the draft exists', () => {
  it('patches the name and leaves the id alone', async () => {
    mocked.read.mockResolvedValueOnce({
      dataset_id: 'my-orders',
      version_key: '111',
    });

    const result = await run(
      { kind: 'set_dataset_name', name: 'Renamed Orders' },
      { datasetId: 'my-orders' },
    );

    expect(mocked.exists).not.toHaveBeenCalled();
    expect(mocked.update).toHaveBeenCalledWith({
      dataset_id: 'my-orders',
      version_key: '111',
      name: 'Renamed Orders',
    });
    expect(result.ok).toBe(true);
  });
});

describe('set_dataset_type', () => {
  it('is held as pending state before the draft exists', async () => {
    const result = await run({
      kind: 'set_dataset_type',
      datasetType: 'master',
    });

    expect(mocked.update).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'pending') {
      expect(result.pending).toEqual({ datasetType: 'master' });
    }
  });

  it('patches the type once the draft exists', async () => {
    mocked.read.mockResolvedValueOnce({
      dataset_id: 'my-orders',
      version_key: '111',
    });

    await run(
      { kind: 'set_dataset_type', datasetType: 'transaction' },
      { datasetId: 'my-orders' },
    );

    expect(mocked.update).toHaveBeenCalledWith({
      dataset_id: 'my-orders',
      version_key: '111',
      type: 'transaction',
    });
  });
});

describe('attach_sample creating the draft', () => {
  const context: Partial<ExecutorContext> = {
    datasetId: null,
    pending: {
      name: 'My Orders',
      datasetId: 'my-orders',
      datasetType: 'event',
    },
    sample: { file: sampleFile(), rows: ROWS },
  };

  it('uploads, infers, then creates in that order', async () => {
    const order: string[] = [];
    mocked.urls.mockImplementation(async () => {
      order.push('generate-url');
      return [
        {
          filePath: 'api-service/user_uploads/orders_abc.json',
          fileName: 'orders.json',
          preSignedUrl: 'https://signed.example/put',
        },
      ];
    });
    mocked.upload.mockImplementation(async () => {
      order.push('put');
      return {} as never;
    });
    mocked.schema.mockImplementation(async () => {
      order.push('dataschema');
      return { schema: INFERRED };
    });
    mocked.create.mockImplementation(async () => {
      order.push('create');
      return { id: 'my-orders', version_key: '111' };
    });

    await run({ kind: 'attach_sample', fileName: 'orders.json' }, context);

    expect(order).toEqual(['generate-url', 'put', 'dataschema', 'create']);
  });

  it('requests a write url for the file being attached', async () => {
    await run({ kind: 'attach_sample', fileName: 'orders.json' }, context);

    expect(mocked.urls).toHaveBeenCalledWith(['orders.json'], 'write');
    expect(mocked.upload).toHaveBeenCalledWith(
      'https://signed.example/put',
      context.sample?.file,
    );
  });

  it('sends the sample rows with the config the API requires', async () => {
    await run({ kind: 'attach_sample', fileName: 'orders.json' }, context);

    expect(mocked.schema).toHaveBeenCalledWith({
      data: ROWS,
      config: { dataset: 'my-orders' },
    });
  });

  it('creates the draft with the inferred schema and uploaded path', async () => {
    await run({ kind: 'attach_sample', fileName: 'orders.json' }, context);

    expect(mocked.create).toHaveBeenCalledWith({
      name: 'My Orders',
      dataset_id: 'my-orders',
      type: 'event',
      dataset_config: {
        keys_config: {},
        indexing_config: {},
        file_upload_path: ['api-service/user_uploads/orders_abc.json'],
      },
      connectors_config: [],
      data_schema: INFERRED,
      sample_data: {
        mergedEvent: {
          order_id: 'ORD-2',
          items: [{ sku: 'SKU-1' }],
          coupon_code: 'SAVE10',
        },
      },
    });
  });

  it('reports the newly minted dataset id back to the caller', async () => {
    const result = await run(
      { kind: 'attach_sample', fileName: 'orders.json' },
      context,
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.status === 'applied') {
      expect(result.datasetId).toBe('my-orders');
      expect(result.dataset.version_key).toBe('222');
    }
  });

  it('defaults the dataset type to event when none was chosen', async () => {
    await run(
      { kind: 'attach_sample', fileName: 'orders.json' },
      { ...context, pending: { name: 'My Orders', datasetId: 'my-orders' } },
    );

    expect(mocked.create.mock.calls[0][0]).toMatchObject({ type: 'event' });
  });

  it('refuses to create without a name', async () => {
    const result = await run(
      { kind: 'attach_sample', fileName: 'orders.json' },
      { datasetId: null, sample: { file: sampleFile(), rows: ROWS } },
    );

    expect(mocked.urls).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('MISSING_DATASET_NAME');
  });

  it('refuses when no sample has been provided', async () => {
    const result = await run(
      { kind: 'attach_sample', fileName: 'orders.json' },
      { datasetId: null, pending: context.pending },
    );

    expect(mocked.urls).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('MISSING_SAMPLE');
  });

  it('does not create when inference fails', async () => {
    mocked.schema.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'DATA_SCHEMA_INVALID_INPUT',
            message: "must have required property 'config'",
          },
        },
      },
    });

    const result = await run(
      { kind: 'attach_sample', fileName: 'orders.json' },
      context,
    );

    expect(mocked.create).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('DATA_SCHEMA_INVALID_INPUT');
  });

  it('does not create when the upload fails', async () => {
    mocked.upload.mockRejectedValue(new Error('network down'));

    const result = await run(
      { kind: 'attach_sample', fileName: 'orders.json' },
      context,
    );

    expect(mocked.schema).not.toHaveBeenCalled();
    expect(mocked.create).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it('fails cleanly when no presigned url comes back', async () => {
    mocked.urls.mockResolvedValue([]);

    const result = await run(
      { kind: 'attach_sample', fileName: 'orders.json' },
      context,
    );

    expect(mocked.upload).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UPLOAD_URL_MISSING');
  });
});

describe('attach_sample replacing the sample of an existing draft', () => {
  const context: Partial<ExecutorContext> = {
    datasetId: 'my-orders',
    sample: { file: sampleFile(), rows: ROWS },
  };

  it('patches rather than creating, preserving existing dataset_config', async () => {
    mocked.read.mockResolvedValueOnce({
      dataset_id: 'my-orders',
      version_key: '111',
      name: 'My Orders',
      type: 'event',
      dataset_config: {
        keys_config: { data_key: 'order_id' },
        indexing_config: { olap_store_enabled: true },
        file_upload_path: ['old/path.json'],
      },
    });

    await run({ kind: 'attach_sample', fileName: 'orders.json' }, context);

    expect(mocked.create).not.toHaveBeenCalled();
    expect(mocked.update.mock.calls[0][0]).toMatchObject({
      dataset_id: 'my-orders',
      version_key: '111',
      data_schema: INFERRED,
      dataset_config: {
        keys_config: { data_key: 'order_id' },
        indexing_config: { olap_store_enabled: true },
        file_upload_path: ['api-service/user_uploads/orders_abc.json'],
      },
    });
  });

  it('passes the existing dataset id to schema inference', async () => {
    mocked.read.mockResolvedValueOnce({
      dataset_id: 'my-orders',
      version_key: '111',
    });

    await run({ kind: 'attach_sample', fileName: 'orders.json' }, context);

    expect(mocked.schema).toHaveBeenCalledWith({
      data: ROWS,
      config: { dataset: 'my-orders' },
    });
  });
});
