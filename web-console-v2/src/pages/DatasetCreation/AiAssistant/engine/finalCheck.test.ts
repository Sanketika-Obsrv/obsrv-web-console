import { outstandingWork } from './finalCheck';

const draft = (overrides: Record<string, unknown> = {}) => ({
  dataset_id: 'my-orders',
  name: 'My Orders',
  type: 'event',
  data_schema: {
    type: 'object',
    properties: { order_id: { type: 'string' }, order_ts: { type: 'string' } },
  },
  dataset_config: {
    indexing_config: { olap_store_enabled: true },
    keys_config: { timestamp_key: 'order_ts' },
  },
  ...overrides,
});

/**
 * The assistant never publishes — that happens from the dataset list or the
 * wizard's preview. So "save it" is a closing read: it says what is still
 * unset, which is the only thing the user cannot see for themselves in the
 * preview.
 */
describe('the closing check', () => {
  it('finds nothing wrong with a finished draft', () => {
    expect(outstandingWork(draft())).toEqual([]);
  });

  it('reports a dataset with no store chosen', () => {
    const said = outstandingWork(
      draft({ dataset_config: { indexing_config: {}, keys_config: {} } }),
    );

    expect(said.join(' ')).toMatch(/store/i);
  });

  /** The real-time store partitions by time, so it cannot go without one. */
  it('reports a real-time store with no timestamp field', () => {
    const said = outstandingWork(
      draft({
        dataset_config: {
          indexing_config: { olap_store_enabled: true },
          keys_config: {},
        },
      }),
    );

    expect(said.join(' ')).toMatch(/timestamp/i);
  });

  it('reports a lakehouse with no partition field', () => {
    const said = outstandingWork(
      draft({
        dataset_config: {
          indexing_config: { lakehouse_enabled: true },
          keys_config: {},
        },
      }),
    );

    expect(said.join(' ')).toMatch(/partition/i);
  });

  it('reports a schema that still has a conflict', () => {
    const said = outstandingWork(
      draft({
        data_schema: {
          type: 'object',
          properties: {
            total: {
              type: 'string',
              oneof: [{ type: 'string' }, { type: 'number' }],
              suggestions: [
                {
                  severity: 'MUST-FIX',
                  advice: 'Pick one',
                  resolutionType: 'DATA_TYPE',
                },
              ],
            },
          },
        },
      }),
    );

    expect(said.join(' ')).toMatch(/total/);
  });

  it('reports a draft with no schema at all', () => {
    const said = outstandingWork(draft({ data_schema: undefined }));

    expect(said.join(' ')).toMatch(/sample|schema/i);
  });

  it('says nothing about a dataset it was given nothing about', () => {
    // No document read is not the same as a finished dataset, but there is
    // nothing honest to report either.
    expect(outstandingWork(undefined)).toEqual([]);
  });
});
