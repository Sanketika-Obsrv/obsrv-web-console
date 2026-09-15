import { Action } from './actions';
import { AgendaState } from './agenda';
import { alreadySatisfied, datasetFacts } from './datasetFacts';
import { DatasetSnapshot } from './executor';

const schemaWith = (
  properties: Record<string, Record<string, unknown>>,
): Record<string, unknown> => ({ type: 'object', properties });

/** A dataset with every fact this module reads set to a known value. */
const fullDataset = (over: Partial<DatasetSnapshot> = {}): DatasetSnapshot => ({
  dataset_id: 'orders-2026',
  name: 'telemetry',
  type: 'event',
  version_key: 'vk-1',
  data_schema: schemaWith({
    order_id: { type: 'string' },
    order_ts: { type: 'string' },
  }),
  dataset_config: {
    indexing_config: { olap_store_enabled: true },
    keys_config: { timestamp_key: 'order_ts' },
  },
  dedup_config: { drop_duplicates: false },
  ...over,
});

describe('datasetFacts', () => {
  it('derives the name, id and type from the document', () => {
    const facts = datasetFacts({ dataset: fullDataset() });

    expect(facts.name).toBe('telemetry');
    expect(facts.datasetId).toBe('orders-2026');
    expect(facts.datasetType).toBe('event');
    expect(facts.hasDraft).toBe(true);
  });

  it('falls back to the pending name and type before the draft exists', () => {
    const facts = datasetFacts({
      pending: { name: 'telemetry', datasetType: 'event' },
    });

    expect(facts.name).toBe('telemetry');
    expect(facts.datasetType).toBe('event');
    // The id is not fixed until `datasets/create` has run, so a pending
    // name carries no id yet — even though `pending.datasetId` may already
    // hold the candidate the executor computed.
    expect(facts.datasetId).toBeUndefined();
    expect(facts.hasDraft).toBe(false);
  });

  it('reads which stores are switched on from indexing_config', () => {
    const facts = datasetFacts({
      dataset: fullDataset({
        dataset_config: {
          indexing_config: {
            olap_store_enabled: true,
            lakehouse_enabled: true,
            cache_enabled: false,
          },
        },
      }),
    });

    expect(facts.stores).toEqual({
      realtime: true,
      lakehouse: true,
      cache: false,
    });
  });

  it('reads the storage keys from keys_config', () => {
    const facts = datasetFacts({
      dataset: fullDataset({
        dataset_config: {
          indexing_config: { lakehouse_enabled: true },
          keys_config: {
            timestamp_key: 'order_ts',
            data_key: 'order_id',
            partition_key: 'region',
          },
        },
      }),
    });

    expect(facts.keys).toEqual({
      timestamp: 'order_ts',
      primary: 'order_id',
      partition: 'region',
    });
  });

  it('reads dedup state once the draft exists', () => {
    const on = datasetFacts({
      dataset: fullDataset({
        dedup_config: { drop_duplicates: true, dedup_key: 'order_id' },
      }),
    });
    expect(on.dedup).toEqual({ enabled: true, key: 'order_id' });

    const off = datasetFacts({
      dataset: fullDataset({ dedup_config: { drop_duplicates: false } }),
    });
    expect(off.dedup).toEqual({ enabled: false });
  });

  it('counts the fields on the schema', () => {
    const facts = datasetFacts({ dataset: fullDataset() });

    expect(facts.fieldCount).toBe(2);
  });

  it('returns sensible defaults for an empty state', () => {
    const facts = datasetFacts({});

    expect(facts).toEqual({
      datasetId: undefined,
      name: undefined,
      datasetType: undefined,
      stores: { realtime: false, lakehouse: false, cache: false },
      keys: {
        timestamp: undefined,
        primary: undefined,
        partition: undefined,
      },
      fieldCount: 0,
      hasDraft: false,
    });
  });
});

describe('alreadySatisfied', () => {
  const state: AgendaState = { dataset: fullDataset() };
  const facts = datasetFacts(state);

  it('is true for a rename to the name already held', () => {
    expect(
      alreadySatisfied({ kind: 'set_dataset_name', name: 'telemetry' }, facts),
    ).toBe(true);
  });

  it('is false for a rename to a different name', () => {
    expect(
      alreadySatisfied({ kind: 'set_dataset_name', name: 'orders_v2' }, facts),
    ).toBe(false);
  });

  it('is true for a storage change that matches the flags already set', () => {
    expect(
      alreadySatisfied({ kind: 'set_storage', realtime: true }, facts),
    ).toBe(true);
  });

  it('is false for a storage change that differs from the current flags', () => {
    expect(
      alreadySatisfied({ kind: 'set_storage', lakehouse: true }, facts),
    ).toBe(false);
  });

  it('is true for a dedup change that matches the key already set', () => {
    const dedupOn = datasetFacts({
      dataset: fullDataset({
        dedup_config: { drop_duplicates: true, dedup_key: 'order_id' },
      }),
    });

    expect(
      alreadySatisfied(
        { kind: 'set_dedup', enabled: true, key: 'order_id' },
        dedupOn,
      ),
    ).toBe(true);
  });

  it('is false for a dedup change to a different key', () => {
    const dedupOn = datasetFacts({
      dataset: fullDataset({
        dedup_config: { drop_duplicates: true, dedup_key: 'order_id' },
      }),
    });

    expect(
      alreadySatisfied(
        { kind: 'set_dedup', enabled: true, key: 'amount' },
        dedupOn,
      ),
    ).toBe(false);
  });

  it('handles an action kind with no corresponding fact without throwing', () => {
    const action: Action = { kind: 'skip_step', step: 'schema' };

    expect(() => alreadySatisfied(action, facts)).not.toThrow();
    expect(alreadySatisfied(action, facts)).toBe(false);
  });
});
