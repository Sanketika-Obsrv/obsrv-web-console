import { recap } from './recap';

const live = {
  dataset_id: 'telemetry_events',
  name: 'Telemetry Events',
  type: 'event',
  status: 'Live',
  data_schema: {
    type: 'object',
    properties: {
      device_id: { type: 'string' },
      reading: { type: 'number' },
      recorded_at: { type: 'string' },
    },
  },
  dedup_config: { drop_duplicates: true, dedup_key: 'device_id' },
  validation_config: { validate: true, mode: 'Strict' },
  dataset_config: {
    indexing_config: { olap_store_enabled: true },
    keys_config: { timestamp_key: 'recorded_at' },
  },
  transformations_config: [],
};

/**
 * Opening a dataset that already exists. The preview pane shows the whole
 * document, so the recap is not a substitute for it — it is the shared
 * ground the conversation needs before the first instruction.
 */
describe('the opening recap', () => {
  it('names the dataset and what kind it is', () => {
    const said = recap(live);

    expect(said).toMatch(/Telemetry Events/);
    expect(said).toMatch(/event/i);
  });

  it('counts the fields', () => {
    expect(recap(live)).toMatch(/3 fields/);
  });

  it('says what is set, in the words the questions used', () => {
    const said = recap(live);

    expect(said).toMatch(/dedup/i);
    expect(said).toMatch(/device_id/);
    expect(said).toMatch(/real-time/i);
  });

  /**
   * A live dataset is edited through a draft copy, and publishing happens in
   * the dataset list or the wizard. Saying so once, up front, is the
   * difference between a change that looks lost and one that is understood.
   */
  /**
   * Found in the browser: a live dataset read with `mode=edit` comes back as
   * its *draft copy*, whose own status is "Draft" — so from the document
   * alone a live dataset looks like a draft, and the caveat that matters
   * most never fired. Whether it is live has to be established separately.
   */
  it('says a live dataset changes through a draft', () => {
    const said = recap({ ...live, status: 'Draft' }, { liveElsewhere: true });

    expect(said).toMatch(/live/i);
    expect(said).toMatch(/draft/i);
    expect(said).toMatch(/publish/i);
  });

  it('does not call it a draft when it is live', () => {
    expect(
      recap({ ...live, status: 'Draft' }, { liveElsewhere: true }),
    ).not.toMatch(/event data, draft/i);
  });

  it('says nothing about drafts and publishing for a plain draft', () => {
    const said = recap({ ...live, status: 'Draft' });

    expect(said).not.toMatch(/publish/i);
  });

  it('reports what is still unset', () => {
    const said = recap({
      ...live,
      dataset_config: { indexing_config: {}, keys_config: {} },
    });

    expect(said).toMatch(/store/i);
  });

  it('says so plainly when there is no schema yet', () => {
    const said = recap({ ...live, data_schema: undefined });

    expect(said).toMatch(/no schema|sample/i);
  });

  it('has nothing to say about a document it could not read', () => {
    expect(recap(undefined)).toBe('');
  });
});
