jest.mock('services/datasetApi', () => ({
  readDataset: jest.fn(),
  updateDataset: jest.fn(),
  datasetStatusTransition: jest.fn(),
}));

jest.mock('services/configData', () => ({
  getSystemSetting: jest.fn(),
}));

import { getSystemSetting } from 'services/configData';
import { readDataset, updateDataset } from 'services/datasetApi';
import { Action } from './actions';
import { SESSION_EXPIRED, diagnose } from './errorMap';
import { ExecutorContext, executeAction } from './executor';

const mocked = {
  read: readDataset as jest.MockedFunction<typeof readDataset>,
  update: updateDataset as jest.MockedFunction<typeof updateDataset>,
  setting: getSystemSetting as jest.MockedFunction<typeof getSystemSetting>,
};

const DATASET_ID = 'my-orders';

const dataSchema = () => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: true,
  properties: {
    order_id: { key: 'order_id', type: 'string', data_type: 'string' },
  },
});

const draft = (versionKey: string) => ({
  dataset_id: DATASET_ID,
  version_key: versionKey,
  type: 'event',
  data_schema: dataSchema(),
  sample_data: { mergedEvent: { order_id: 'ORD-1' } },
  validation_config: { validate: true, mode: 'Strict' },
  dedup_config: { drop_duplicates: false, dedup_key: '' },
  denorm_config: { denorm_fields: [] },
  transformations_config: [],
  dataset_config: {
    keys_config: { data_key: '', partition_key: '', timestamp_key: '' },
    indexing_config: {
      olap_store_enabled: true,
      lakehouse_enabled: false,
      cache_enabled: false,
    },
    file_upload_path: [],
  },
});

/** An axios-shaped rejection carrying the API's own error envelope. */
const apiError = (status: string, code: string, message: string) =>
  Object.assign(new Error(message), {
    response: { status, data: { error: { code, message } } },
  });

const OUTDATED = () =>
  apiError(
    'CONFLICT',
    'DATASET_OUTDATED',
    'The dataset is outdated. Please try to fetch latest changes of the dataset and perform the updates',
  );

const EXTRA_PROPERTIES = () =>
  apiError(
    'BAD_REQUEST',
    'DATASET_UPDATE_INPUT_INVALID',
    '#properties/request/properties/dataset_config/additionalProperties must NOT have additional properties',
  );

const run = (action: Action, context: Partial<ExecutorContext> = {}) =>
  executeAction(action, {
    datasetId: DATASET_ID,
    ...context,
  } as ExecutorContext);

const versionKeysSent = () =>
  mocked.update.mock.calls.map((call) => call[0].version_key);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.read.mockResolvedValue(draft('111'));
  mocked.update.mockResolvedValue({ version_key: '222' });
  mocked.setting.mockReturnValue(undefined);
});

/**
 * A concurrent edit is the one failure the assistant can fix by itself: every
 * write already begins with a read, so repeating the action rebuilds the body
 * against the current document.
 */
describe('replay on a stale version_key', () => {
  const staleThenFresh = () => {
    mocked.read
      .mockResolvedValueOnce(draft('111'))
      .mockResolvedValueOnce(draft('999'))
      .mockResolvedValue(draft('999'));
    mocked.update
      .mockRejectedValueOnce(OUTDATED())
      .mockResolvedValue({ version_key: '1000' });
  };

  it('re-reads and succeeds without surfacing the conflict', async () => {
    staleThenFresh();

    const outcome = await run({ kind: 'set_dedup', enabled: false });

    expect(outcome.ok).toBe(true);
  });

  it('sends the version_key from the fresh read on the second attempt', async () => {
    staleThenFresh();

    await run({ kind: 'set_dedup', enabled: false });

    expect(versionKeysSent()).toEqual(['111', '999']);
  });

  it('reports the action as replayed, so narration can say so', async () => {
    staleThenFresh();

    const outcome = await run({ kind: 'set_dedup', enabled: false });

    expect(outcome).toMatchObject({ status: 'applied', replayed: true });
  });

  it('does not claim a replay when the first attempt worked', async () => {
    const outcome = await run({ kind: 'set_dedup', enabled: false });

    expect(outcome).toMatchObject({ status: 'applied' });
    expect(outcome).not.toHaveProperty('replayed');
  });

  it('replays a schema edit too', async () => {
    staleThenFresh();

    const outcome = await run({
      kind: 'set_description',
      path: 'order_id',
      description: 'The order id',
    });

    expect(outcome.ok).toBe(true);
    expect(versionKeysSent()).toEqual(['111', '999']);
  });

  it('gives up after one replay rather than looping', async () => {
    mocked.update.mockRejectedValue(OUTDATED());

    const outcome = await run({ kind: 'set_dedup', enabled: false });

    expect(outcome).toMatchObject({ ok: false, code: 'DATASET_OUTDATED' });
    expect(mocked.update).toHaveBeenCalledTimes(2);
  });

  it('never replays a rejection that would fail identically', async () => {
    mocked.update.mockRejectedValue(EXTRA_PROPERTIES());

    const outcome = await run({ kind: 'set_dedup', enabled: false });

    expect(outcome).toMatchObject({
      ok: false,
      code: 'DATASET_UPDATE_INPUT_INVALID',
    });
    expect(mocked.update).toHaveBeenCalledTimes(1);
  });

  it('does not replay an action that was refused before any write', async () => {
    const outcome = await run({
      kind: 'set_description',
      path: 'no_such_field',
      description: 'x',
    });

    expect(outcome).toMatchObject({ ok: false, code: 'UNKNOWN_FIELD' });
    expect(mocked.update).not.toHaveBeenCalled();
  });
});

/**
 * With no session the console answers the SPA HTML shell at HTTP 200, so the
 * read resolves to `undefined` instead of throwing. Left unchecked the next
 * failure reported would be a misleading `NO_SCHEMA`.
 */
describe('a read that came back without an envelope', () => {
  it('reports a lost session rather than a missing schema', async () => {
    mocked.read.mockResolvedValue(undefined as never);

    const outcome = await run({
      kind: 'set_description',
      path: 'order_id',
      description: 'x',
    });

    expect(outcome).toMatchObject({ ok: false, code: SESSION_EXPIRED });
  });

  it('writes nothing when the session is gone', async () => {
    mocked.read.mockResolvedValue(undefined as never);

    await run({ kind: 'set_dedup', enabled: false });

    expect(mocked.update).not.toHaveBeenCalled();
  });

  it('reports a lost session on the processing path as well', async () => {
    mocked.read.mockResolvedValue(undefined as never);

    const outcome = await run({ kind: 'set_additional_fields', allow: true });

    expect(outcome).toMatchObject({ ok: false, code: SESSION_EXPIRED });
  });
});

/**
 * The storage step hides checkboxes for stores the cluster lacks. The
 * assistant reads the same capability map, so an unavailable store is refused
 * with a reason instead of being sent and rejected.
 */
describe('storage the cluster does not have', () => {
  const realtimeOnly = () =>
    mocked.setting.mockReturnValue(
      '{"lake_house":false,"realtime_store":true}',
    );

  it('refuses lakehouse before sending anything', async () => {
    realtimeOnly();

    const outcome = await run({ kind: 'set_storage', lakehouse: true });

    expect(outcome).toMatchObject({
      ok: false,
      code: 'DATASET_UNSUPPORTED_STORAGE_TYPE',
    });
    expect(mocked.update).not.toHaveBeenCalled();
  });

  /**
   * Phrased as the API phrases it, so the error map can label it *and* derive
   * a corrected retry — the console wording is asserted in `errorMap.test.ts`.
   * Writing the friendly sentence here instead duplicated the labelling and
   * left this path without the retry the server-error path offered.
   */
  it('names the store and what is available instead', async () => {
    realtimeOnly();

    const outcome = await run({ kind: 'set_storage', lakehouse: true });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toContain('lake_house');
    expect(outcome.error).toContain('realtime_store');
  });

  it('phrases it so the error map can derive a retry from it', async () => {
    realtimeOnly();

    const outcome = await run({ kind: 'set_storage', lakehouse: true });

    if (outcome.ok) throw new Error('expected a refusal');

    const { diagnosis } = { diagnosis: diagnose(outcome) };

    expect(diagnosis.explanation).toContain('Data Lakehouse (Hudi)');
    expect(diagnosis.retryAction).toEqual({
      kind: 'set_storage',
      lakehouse: false,
      realtime: true,
    });
  });

  it('allows turning an unavailable store off', async () => {
    realtimeOnly();

    const outcome = await run({
      kind: 'set_storage',
      lakehouse: false,
      realtime: true,
    });

    expect(outcome.ok).toBe(true);
  });

  it('allows a store the cluster does have', async () => {
    realtimeOnly();

    const outcome = await run({ kind: 'set_storage', realtime: true });

    expect(outcome.ok).toBe(true);
  });

  it('assumes availability when the setting is unreadable', async () => {
    mocked.setting.mockReturnValue(undefined);

    const outcome = await run({ kind: 'set_storage', lakehouse: true });

    expect(outcome.ok).toBe(true);
  });

  /**
   * Confirmed live: `create` does not validate storage availability but
   * `update` does, so a fresh draft can arrive with `lakehouse_enabled: true`
   * on a cluster that has no lakehouse. Any later storage write would then be
   * rejected for a flag the user never set, so the unavailable flag is
   * corrected rather than echoed.
   */
  it('clears a server default the cluster cannot honour', async () => {
    realtimeOnly();
    mocked.read.mockResolvedValue({
      ...draft('111'),
      dataset_config: {
        keys_config: { data_key: '', partition_key: '', timestamp_key: '' },
        indexing_config: {
          olap_store_enabled: true,
          lakehouse_enabled: true,
          cache_enabled: false,
        },
        file_upload_path: [],
      },
    });

    const outcome = await run({ kind: 'set_storage', cache: true });

    expect(outcome.ok).toBe(true);
    expect(mocked.update.mock.calls[0][0].dataset_config).toMatchObject({
      indexing_config: {
        olap_store_enabled: true,
        lakehouse_enabled: false,
        cache_enabled: true,
      },
    });
  });
});
