jest.mock('./http', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
  },
}));

import { http } from './http';
import {
  API_IDS,
  DATASET_ENDPOINTS,
  createDataset,
  datasetExists,
  datasetStatusTransition,
  datasetStatusTransitionResponse,
  fetchAllFields,
  fieldsByStatus,
  generateDataSchema,
  generateUploadUrls,
  listConnectors,
  listConnectorsResponse,
  listDatasets,
  readConnector,
  readDataset,
  stripSuggestions,
  updateDataset,
  uploadToPresignedUrl,
} from './datasetApi';

const mockHttp = http as jest.Mocked<typeof http>;

const envelopeOf = (call: unknown[]) => call[1] as Record<string, unknown>;

const okResult = <T>(result: T) => ({ data: { result } });

beforeEach(() => {
  jest.clearAllMocks();
});

type EnvelopeCase = [string, () => Promise<unknown>, string];

const envelopeCases: EnvelopeCase[] = [
  ['createDataset', () => createDataset({ dataset_id: 'a' }), API_IDS.create],
  [
    'generateDataSchema',
    () => generateDataSchema({ data: [{ a: 1 }] }),
    API_IDS.dataSchema,
  ],
  ['listDatasets', () => listDatasets({ status: ['Live'] }), API_IDS.list],
  ['listConnectors', () => listConnectors({}), API_IDS.connectorsList],
  [
    'datasetStatusTransition',
    () => datasetStatusTransition('a', 'Live'),
    API_IDS.statusTransition,
  ],
  [
    'listConnectorsResponse',
    () => listConnectorsResponse({}),
    API_IDS.connectorsList,
  ],
  [
    'datasetStatusTransitionResponse',
    () => datasetStatusTransitionResponse('a', 'Delete'),
    API_IDS.statusTransition,
  ],
];

describe('request envelope', () => {
  it.each(envelopeCases)(
    '%s sends a v2 envelope with a unique msgid',
    async (_name, call, apiId) => {
      mockHttp.post.mockResolvedValue(okResult({}));

      await call();

      const envelope = envelopeOf(mockHttp.post.mock.calls[0]);
      expect(envelope).toMatchObject({ id: apiId, ver: 'v2' });
      expect(envelope).toHaveProperty('request');
      expect((envelope.params as { msgid: string }).msgid).toEqual(
        expect.stringMatching(/^[0-9a-f-]{36}$/),
      );
    },
  );

  it('generates a distinct msgid per call', async () => {
    mockHttp.post.mockResolvedValue(okResult({}));

    await createDataset({ dataset_id: 'a' });
    await createDataset({ dataset_id: 'b' });

    const first = envelopeOf(mockHttp.post.mock.calls[0]).params as {
      msgid: string;
    };
    const second = envelopeOf(mockHttp.post.mock.calls[1]).params as {
      msgid: string;
    };
    expect(first.msgid).not.toEqual(second.msgid);
  });
});

describe('stripSuggestions', () => {
  it('removes suggestions at every depth', () => {
    const input = {
      properties: {
        order_ts: { type: 'string', suggestions: [{ severity: 'LOW' }] },
        customer: {
          type: 'object',
          properties: {
            email: { type: 'string', suggestions: [{ severity: 'LOW' }] },
          },
        },
      },
    };

    expect(stripSuggestions(input)).toEqual({
      properties: {
        order_ts: { type: 'string' },
        customer: {
          type: 'object',
          properties: { email: { type: 'string' } },
        },
      },
    });
  });

  it('preserves arrays as arrays', () => {
    const input = {
      total_amount: {
        oneof: [{ type: 'double' }, { type: 'string' }],
      },
      required: ['order_id', 'channel'],
    };

    const result = stripSuggestions(input);

    expect(Array.isArray(result.total_amount.oneof)).toBe(true);
    expect(result.total_amount.oneof).toEqual([
      { type: 'double' },
      { type: 'string' },
    ]);
    expect(result.required).toEqual(['order_id', 'channel']);
  });

  it('strips suggestions nested inside arrays', () => {
    const input = {
      items: [{ sku: { type: 'string', suggestions: [{ severity: 'LOW' }] } }],
    };

    expect(stripSuggestions(input)).toEqual({
      items: [{ sku: { type: 'string' } }],
    });
  });

  it('leaves primitives and null untouched', () => {
    expect(stripSuggestions({ a: 1, b: null, c: false, d: 'x' })).toEqual({
      a: 1,
      b: null,
      c: false,
      d: 'x',
    });
  });
});

describe('datasetExists', () => {
  it('GETs the exists endpoint and returns the raw body', async () => {
    mockHttp.get.mockResolvedValue({ data: { responseCode: 'NOT_FOUND' } });

    const result = await datasetExists('claude-probe-orders');

    expect(mockHttp.get).toHaveBeenCalledWith(
      `${DATASET_ENDPOINTS.DATASET_EXISTS}/claude-probe-orders`,
    );
    expect(result).toEqual({ responseCode: 'NOT_FOUND' });
  });
});

describe('readDataset', () => {
  it('requests edit mode for Draft status', async () => {
    mockHttp.get.mockResolvedValue(okResult({ dataset_id: 'a' }));

    const result = await readDataset({ datasetId: 'a', status: 'Draft' });

    const url = mockHttp.get.mock.calls[0][0] as string;
    expect(url).toContain(`${DATASET_ENDPOINTS.DATASETS_READ}/a?`);
    expect(url).toContain('mode=edit');
    expect(url).toContain(`fields=${fieldsByStatus.Draft}`);
    expect(result).toEqual({ dataset_id: 'a' });
  });

  it('omits edit mode for non-Draft status', async () => {
    mockHttp.get.mockResolvedValue(okResult({ dataset_id: 'a' }));

    await readDataset({ datasetId: 'a', status: 'Live' });

    const url = mockHttp.get.mock.calls[0][0] as string;
    expect(url).not.toContain('mode=edit');
    expect(url).toContain(`fields=${fieldsByStatus.default}`);
  });

  it('honours an explicit field list', async () => {
    mockHttp.get.mockResolvedValue(okResult({}));

    await readDataset({ datasetId: 'a', fields: 'dataset_id,version_key' });

    expect(mockHttp.get.mock.calls[0][0]).toContain(
      'fields=dataset_id,version_key',
    );
  });
});

describe('createDataset', () => {
  it('POSTs the payload and returns the result', async () => {
    mockHttp.post.mockResolvedValue(okResult({ id: 'a', version_key: '123' }));

    const result = await createDataset({ dataset_id: 'a', name: 'A' });

    expect(mockHttp.post.mock.calls[0][0]).toEqual(
      DATASET_ENDPOINTS.CREATE_DATASET,
    );
    expect(envelopeOf(mockHttp.post.mock.calls[0]).request).toEqual({
      dataset_id: 'a',
      name: 'A',
    });
    expect(result).toEqual({ id: 'a', version_key: '123' });
  });
});

describe('updateDataset', () => {
  const versioned = { dataset_id: 'a', version_key: '111' };

  it('PATCHes with the version_key supplied by the caller', async () => {
    mockHttp.patch.mockResolvedValue(okResult({ version_key: '222' }));

    const result = await updateDataset(versioned);

    expect(mockHttp.patch.mock.calls[0][0]).toEqual(
      DATASET_ENDPOINTS.UPDATE_DATASET,
    );
    expect(envelopeOf(mockHttp.patch.mock.calls[0])).toMatchObject({
      id: API_IDS.update,
    });
    expect(envelopeOf(mockHttp.patch.mock.calls[0]).request).toMatchObject({
      version_key: '111',
    });
    expect(result).toEqual({ version_key: '222' });
  });

  it('rejects when version_key is missing', async () => {
    await expect(updateDataset({ dataset_id: 'a' })).rejects.toThrow(
      /version_key/i,
    );
    expect(mockHttp.patch).not.toHaveBeenCalled();
  });

  it('strips suggestions from data_schema before sending', async () => {
    mockHttp.patch.mockResolvedValue(okResult({}));

    await updateDataset({
      ...versioned,
      data_schema: {
        properties: {
          order_ts: { type: 'string', suggestions: [{ severity: 'LOW' }] },
        },
      },
    });

    const sent = envelopeOf(mockHttp.patch.mock.calls[0]).request as {
      data_schema: { properties: { order_ts: Record<string, unknown> } };
    };
    expect(sent.data_schema.properties.order_ts).toEqual({ type: 'string' });
  });

  /**
   * The strip is the wizard's behaviour and stays the default, but it destroys
   * the API's own suggestions on the stored document — including an unresolved
   * MUST-FIX conflict on a *different* field, which then becomes invisible.
   * Verified against the live API: it accepts and preserves them.
   */
  it('keeps suggestions when the caller opts in', async () => {
    mockHttp.patch.mockResolvedValue(okResult({}));

    await updateDataset(
      {
        ...versioned,
        data_schema: {
          properties: {
            order_ts: { type: 'string', suggestions: [{ severity: 'LOW' }] },
          },
        },
      },
      { keepSuggestions: true },
    );

    const sent = envelopeOf(mockHttp.patch.mock.calls[0]).request as {
      data_schema: { properties: { order_ts: Record<string, unknown> } };
    };
    expect(sent.data_schema.properties.order_ts).toEqual({
      type: 'string',
      suggestions: [{ severity: 'LOW' }],
    });
  });

  it('still strips by default, so the wizard is unchanged', async () => {
    mockHttp.patch.mockResolvedValue(okResult({}));

    await updateDataset({
      ...versioned,
      data_schema: {
        properties: { a: { suggestions: [{ severity: 'LOW' }] } },
      },
    });

    const sent = envelopeOf(mockHttp.patch.mock.calls[0]).request as {
      data_schema: { properties: { a: Record<string, unknown> } };
    };
    expect(sent.data_schema.properties.a).toEqual({});
  });

  it('round-trips every other data_schema key untouched', async () => {
    mockHttp.patch.mockResolvedValue(okResult({}));

    const dataSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: true,
      properties: {
        total_amount: {
          key: 'total_amount',
          type: 'string',
          arrival_format: 'text',
          data_type: 'string',
          isRequired: false,
          resolved: true,
          disableActions: true,
          isModified: true,
          oneof: [{ type: 'double' }, { type: 'string' }],
        },
      },
    };

    await updateDataset({ ...versioned, data_schema: dataSchema });

    const sent = envelopeOf(mockHttp.patch.mock.calls[0]).request as {
      data_schema: typeof dataSchema;
    };
    expect(sent.data_schema).toEqual(dataSchema);
  });

  it('does not mutate the caller’s payload', async () => {
    mockHttp.patch.mockResolvedValue(okResult({}));

    const payload = {
      ...versioned,
      data_schema: {
        properties: {
          a: { type: 'string', suggestions: [{ severity: 'LOW' }] },
        },
      },
    };
    const snapshot = JSON.parse(JSON.stringify(payload));

    await updateDataset(payload);

    expect(payload).toEqual(snapshot);
  });

  it('leaves payloads without data_schema alone', async () => {
    mockHttp.patch.mockResolvedValue(okResult({}));

    await updateDataset({
      ...versioned,
      dedup_config: { drop_duplicates: true, dedup_key: 'order_id' },
    });

    expect(envelopeOf(mockHttp.patch.mock.calls[0]).request).toEqual({
      dataset_id: 'a',
      version_key: '111',
      dedup_config: { drop_duplicates: true, dedup_key: 'order_id' },
    });
  });
});

describe('generateDataSchema', () => {
  it('POSTs sample rows and returns the inference result', async () => {
    const inference = { schema: { type: 'object' }, configurations: {} };
    mockHttp.post.mockResolvedValue(okResult(inference));

    const result = await generateDataSchema({
      data: [{ order_id: 'ORD-1' }],
      config: { dataset: 'a' },
    });

    expect(mockHttp.post.mock.calls[0][0]).toEqual(
      DATASET_ENDPOINTS.GENERATE_DATA_SCHEMA,
    );
    expect(envelopeOf(mockHttp.post.mock.calls[0]).request).toEqual({
      data: [{ order_id: 'ORD-1' }],
      config: { dataset: 'a' },
    });
    expect(result).toEqual(inference);
  });
});

describe('file upload', () => {
  it('requests presigned urls for the given paths', async () => {
    mockHttp.post.mockResolvedValue(
      okResult([{ filePath: 'p', fileName: 'f', preSignedUrl: 'u' }]),
    );

    const result = await generateUploadUrls(['orders.json'], 'write');

    expect(mockHttp.post.mock.calls[0][0]).toEqual(
      DATASET_ENDPOINTS.GENERATE_URL,
    );
    expect(envelopeOf(mockHttp.post.mock.calls[0])).toMatchObject({
      id: API_IDS.generateUrl,
    });
    expect(envelopeOf(mockHttp.post.mock.calls[0]).request).toEqual({
      files: ['orders.json'],
      access: 'write',
    });
    expect(result).toEqual([
      { filePath: 'p', fileName: 'f', preSignedUrl: 'u' },
    ]);
  });

  it('defaults access to write', async () => {
    mockHttp.post.mockResolvedValue(okResult([]));

    await generateUploadUrls(['orders.json']);

    expect(envelopeOf(mockHttp.post.mock.calls[0]).request).toMatchObject({
      access: 'write',
    });
  });

  it('PUTs the file to the presigned url as multipart', async () => {
    mockHttp.put.mockResolvedValue({ data: {} });
    const file = new File(['{}'], 'orders.json', {
      type: 'application/json',
    });

    await uploadToPresignedUrl('https://signed.example/put', file);

    const [url, body, config] = mockHttp.put.mock.calls[0] as [
      string,
      FormData,
      { headers: Record<string, string> },
    ];
    expect(url).toEqual('https://signed.example/put');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
    expect(config.headers['Content-Type']).toEqual('multipart/form-data');
    expect(config.headers['x-ms-blob-type']).toEqual('BlockBlob');
  });
});

describe('listDatasets', () => {
  it('wraps filters in a filters object', async () => {
    mockHttp.post.mockResolvedValue(okResult({ data: [] }));

    await listDatasets({ status: ['Live'] });

    expect(mockHttp.post.mock.calls[0][0]).toEqual(
      DATASET_ENDPOINTS.LIST_DATASET,
    );
    expect(envelopeOf(mockHttp.post.mock.calls[0]).request).toEqual({
      filters: { status: ['Live'] },
    });
  });

  it('defaults to no filters', async () => {
    mockHttp.post.mockResolvedValue(okResult({ data: [] }));

    await listDatasets();

    expect(envelopeOf(mockHttp.post.mock.calls[0]).request).toEqual({
      filters: {},
    });
  });
});

describe('connectors', () => {
  it('lists connectors', async () => {
    mockHttp.post.mockResolvedValue(
      okResult([{ id: 'kafka-connector-2.0.0' }]),
    );

    const result = await listConnectors();

    expect(mockHttp.post.mock.calls[0][0]).toEqual(
      DATASET_ENDPOINTS.LIST_CONNECTORS,
    );
    expect(result).toEqual([{ id: 'kafka-connector-2.0.0' }]);
  });

  it('reads one connector with its ui_spec', async () => {
    const connector = {
      id: 'postgres-connector-1.0.0',
      ui_spec: { type: 'object', properties: {} },
    };
    mockHttp.get.mockResolvedValue(okResult(connector));

    const result = await readConnector('postgres-connector-1.0.0');

    expect(mockHttp.get).toHaveBeenCalledWith(
      `${DATASET_ENDPOINTS.READ_CONNECTORS}/postgres-connector-1.0.0`,
    );
    expect(result).toEqual(connector);
  });
});

describe('datasetStatusTransition', () => {
  it.each(['ReadyToPublish', 'Live', 'Retire', 'Delete'] as const)(
    'posts a %s transition',
    async (status) => {
      mockHttp.post.mockResolvedValue(okResult({ dataset_id: 'a' }));

      await datasetStatusTransition('a', status);

      expect(mockHttp.post.mock.calls[0][0]).toEqual(
        DATASET_ENDPOINTS.STATUS_TRANSITION,
      );
      expect(envelopeOf(mockHttp.post.mock.calls[0]).request).toEqual({
        dataset_id: 'a',
        status,
      });
    },
  );
});

describe('raw axios response variants', () => {
  it('listConnectorsResponse returns the untouched axios response', async () => {
    const response = { data: { result: { data: [{ id: 'kafka' }] } } };
    mockHttp.post.mockResolvedValue(response);

    await expect(listConnectorsResponse()).resolves.toBe(response);
  });

  it('datasetStatusTransitionResponse returns the untouched axios response', async () => {
    const response = { data: { result: { dataset_id: 'a' } } };
    mockHttp.post.mockResolvedValue(response);

    await expect(datasetStatusTransitionResponse('a', 'Retire')).resolves.toBe(
      response,
    );
  });
});

describe('fetchAllFields', () => {
  it('unwraps the nested field list returned by the console BFF', async () => {
    const fields = [
      { column: 'order_id', data_type: 'string', ref: 'properties.order_id' },
    ];
    mockHttp.get.mockResolvedValue({ data: [fields] });

    const result = await fetchAllFields('a', 'Draft');

    expect(mockHttp.get).toHaveBeenCalledWith(
      `${DATASET_ENDPOINTS.GENERATE_FIELDS}/a?status=Draft`,
    );
    expect(result).toEqual(fields);
  });

  it('defaults status to Draft', async () => {
    mockHttp.get.mockResolvedValue({ data: [[]] });

    await fetchAllFields('a');

    expect(mockHttp.get.mock.calls[0][0]).toContain('status=Draft');
  });

  it('returns an empty list when the BFF returns nothing usable', async () => {
    mockHttp.get.mockResolvedValue({ data: null });

    await expect(fetchAllFields('a')).resolves.toEqual([]);
  });
});
