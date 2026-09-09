import { Action } from '../engine/actions';
import { createMemoryStorage } from './memoryStorage';
import {
  MAX_SAMPLE_ROWS,
  SAMPLE_TTL_MS,
  createSessionStore,
  scrubSecrets,
} from './sessionStore';
import { AiSession } from './types';

const NOW = 1_700_000_000_000;

const store = () => createSessionStore(createMemoryStorage(), () => NOW);

const rows = (count: number) =>
  Array.from({ length: count }, (_unused, index) => ({ order_id: index }));

describe('starting a session', () => {
  it('starts with no dataset, because create has not run yet', async () => {
    const session = await store().start({ mode: 'create' });

    expect(session.datasetId).toBeNull();
    expect(session.sessionId).toBeTruthy();
  });

  it('gives each session its own id', async () => {
    const sessions = store();

    const first = await sessions.start({ mode: 'create' });
    const second = await sessions.start({ mode: 'create' });

    expect(first.sessionId).not.toBe(second.sessionId);
  });

  it('persists it immediately, so a reload before the first turn resumes', async () => {
    const sessions = store();

    const started = await sessions.start({ mode: 'create' });

    expect(await sessions.load(started.sessionId)).toEqual(started);
  });

  it('starts on the rule-only tier until a model reports otherwise', async () => {
    expect((await store().start({ mode: 'create' })).modelTier).toBe(0);
  });
});

describe('resuming', () => {
  it('restores the messages and the step', async () => {
    const sessions = store();
    const started = await sessions.start({ mode: 'create' });

    await sessions.appendMessage(started.sessionId, {
      role: 'user',
      text: 'call it My Orders',
    });
    await sessions.setStep(started.sessionId, 'schema');

    const resumed = await sessions.load(started.sessionId);

    expect(resumed?.step).toBe('schema');
    expect(resumed?.messages).toHaveLength(1);
    expect(resumed?.messages[0].text).toBe('call it My Orders');
  });

  it('returns nothing for a session that was never started', async () => {
    expect(await store().load('no-such-session')).toBeUndefined();
  });

  it('keeps messages in the order they were said', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.appendMessage(sessionId, { role: 'user', text: 'first' });
    await sessions.appendMessage(sessionId, {
      role: 'assistant',
      text: 'second',
    });

    const resumed = await sessions.load(sessionId);

    expect(resumed?.messages.map((message) => message.text)).toEqual([
      'first',
      'second',
    ]);
  });

  it('records the action a turn dispatched, as an audit trail', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    const action: Action = {
      kind: 'set_data_type',
      path: 'total_amount',
      dataType: 'string',
    };

    await sessions.appendMessage(sessionId, {
      role: 'assistant',
      text: 'Set total_amount to string.',
      action,
    });

    expect((await sessions.load(sessionId))?.messages[0].action).toEqual(
      action,
    );
  });
});

/**
 * The session is keyed independently of the dataset, because it exists before
 * `datasets/create` does. Attaching the id afterwards is what lets the resume
 * list link a conversation to a draft.
 */
describe('attaching the dataset once it exists', () => {
  it('records the id without changing the session id', async () => {
    const sessions = store();
    const started = await sessions.start({ mode: 'create' });

    const attached = await sessions.attachDataset(
      started.sessionId,
      'my-orders',
    );

    expect(attached?.datasetId).toBe('my-orders');
    expect(attached?.sessionId).toBe(started.sessionId);
  });

  it('finds the session again by dataset id', async () => {
    const sessions = store();
    const started = await sessions.start({ mode: 'create' });
    await sessions.attachDataset(started.sessionId, 'my-orders');

    expect((await sessions.findByDataset('my-orders'))?.sessionId).toBe(
      started.sessionId,
    );
  });

  it('has no session for a dataset it never created', async () => {
    expect(await store().findByDataset('someone-elses')).toBeUndefined();
  });
});

/** Sample rows may hold personal data, so they are capped and they expire. */
describe('sample rows', () => {
  it('keeps the rows for local inference', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.setSampleRows(sessionId, rows(3));

    expect(await sessions.readSampleRows(sessionId)).toHaveLength(3);
  });

  it('caps how many rows are kept', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.setSampleRows(sessionId, rows(MAX_SAMPLE_ROWS + 50));

    expect(await sessions.readSampleRows(sessionId)).toHaveLength(
      MAX_SAMPLE_ROWS,
    );
  });

  it('keeps the first rows, which is what the schema was inferred from', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.setSampleRows(sessionId, rows(MAX_SAMPLE_ROWS + 5));
    const kept = await sessions.readSampleRows(sessionId);

    expect(kept[0]).toEqual({ order_id: 0 });
  });

  it('stops returning them once they have expired', async () => {
    let now = NOW;
    const sessions = createSessionStore(createMemoryStorage(), () => now);
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.setSampleRows(sessionId, rows(3));

    now = NOW + SAMPLE_TTL_MS + 1;

    expect(await sessions.readSampleRows(sessionId)).toEqual([]);
  });

  it('drops the expired rows from storage rather than just hiding them', async () => {
    let now = NOW;
    const sessions = createSessionStore(createMemoryStorage(), () => now);
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.setSampleRows(sessionId, rows(3));

    now = NOW + SAMPLE_TTL_MS + 1;
    await sessions.readSampleRows(sessionId);

    expect((await sessions.load(sessionId))?.sampleRows).toEqual([]);
  });

  it('still returns them just before they expire', async () => {
    let now = NOW;
    const sessions = createSessionStore(createMemoryStorage(), () => now);
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.setSampleRows(sessionId, rows(3));

    now = NOW + SAMPLE_TTL_MS - 1;

    expect(await sessions.readSampleRows(sessionId)).toHaveLength(3);
  });

  it('clears them when the dataset is saved', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.setSampleRows(sessionId, rows(3));

    await sessions.onSaved(sessionId);

    expect(await sessions.readSampleRows(sessionId)).toEqual([]);
  });

  it('keeps the transcript when the dataset is saved', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.appendMessage(sessionId, { role: 'user', text: 'saved it' });
    await sessions.setSampleRows(sessionId, rows(3));

    await sessions.onSaved(sessionId);

    expect((await sessions.load(sessionId))?.messages).toHaveLength(1);
  });

  it('clears them on request', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.setSampleRows(sessionId, rows(3));

    await sessions.clearSample(sessionId);

    expect(await sessions.readSampleRows(sessionId)).toEqual([]);
  });
});

describe('clearing a session', () => {
  it('removes it entirely, rows included', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.setSampleRows(sessionId, rows(3));

    await sessions.clear(sessionId);

    expect(await sessions.load(sessionId)).toBeUndefined();
  });

  it('leaves other sessions alone', async () => {
    const sessions = store();
    const first = await sessions.start({ mode: 'create' });
    const second = await sessions.start({ mode: 'create' });

    await sessions.clear(first.sessionId);

    expect(await sessions.load(second.sessionId)).toBeDefined();
  });
});

describe('the resume list', () => {
  it('is empty before anything has been started', async () => {
    expect(await store().list()).toEqual([]);
  });

  it('puts the most recently touched session first', async () => {
    let now = NOW;
    const sessions = createSessionStore(createMemoryStorage(), () => now);

    const older = await sessions.start({ mode: 'create' });
    now += 1000;
    const newer = await sessions.start({ mode: 'create' });
    now += 1000;
    await sessions.appendMessage(older.sessionId, {
      role: 'user',
      text: 'back to this one',
    });

    expect((await sessions.list()).map((s) => s.sessionId)).toEqual([
      older.sessionId,
      newer.sessionId,
    ]);
  });

  it('does not carry sample rows into the list', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.setSampleRows(sessionId, rows(3));

    const listed = await sessions.list();

    expect(listed[0].sampleRows).toEqual([]);
  });
});

describe('updatedAt', () => {
  it('moves forward when a message is added', async () => {
    let now = NOW;
    const sessions = createSessionStore(createMemoryStorage(), () => now);
    const started = await sessions.start({ mode: 'create' });

    now += 5000;
    await sessions.appendMessage(started.sessionId, {
      role: 'user',
      text: 'hello',
    });

    expect((await sessions.load(started.sessionId))?.updatedAt).toBe(now);
  });

  it('leaves createdAt alone', async () => {
    let now = NOW;
    const sessions = createSessionStore(createMemoryStorage(), () => now);
    const started = await sessions.start({ mode: 'create' });

    now += 5000;
    await sessions.appendMessage(started.sessionId, {
      role: 'user',
      text: 'hello',
    });

    expect((await sessions.load(started.sessionId))?.createdAt).toBe(NOW);
  });
});

/**
 * Credentials must never reach storage. The action space already routes
 * secrets to a form instead of the model, and this is the second line of
 * defence at the persistence boundary.
 */
describe('scrubSecrets', () => {
  it('removes an obviously named credential', () => {
    expect(scrubSecrets({ host: 'db.internal', password: 'hunter2' })).toEqual({
      host: 'db.internal',
      password: '[redacted]',
    });
  });

  it('removes secrets, tokens, passphrases and private keys', () => {
    expect(
      scrubSecrets({
        client_secret: 'a',
        access_token: 'b',
        passphrase: 'c',
        private_key: 'd',
        api_key: 'e',
        credentials: 'f',
      }),
    ).toEqual({
      client_secret: '[redacted]',
      access_token: '[redacted]',
      passphrase: '[redacted]',
      private_key: '[redacted]',
      api_key: '[redacted]',
      credentials: '[redacted]',
    });
  });

  /**
   * The important regression guard: the dataset domain is full of legitimate
   * `*_key` fields, and redacting those would corrupt the audit trail.
   */
  it('leaves the dataset domain’s own key fields intact', () => {
    const action = {
      kind: 'set_keys',
      dedup_key: 'order_id',
      data_key: 'order_id',
      partition_key: 'channel',
      timestamp_key: 'order_ts',
      version_key: '1788843914794',
    };

    expect(scrubSecrets(action)).toEqual(action);
  });

  it('reaches into nested objects and arrays', () => {
    expect(
      scrubSecrets({
        connector: { config: [{ password: 'hunter2', port: 5432 }] },
      }),
    ).toEqual({
      connector: { config: [{ password: '[redacted]', port: 5432 }] },
    });
  });

  it('leaves values that are not credentials alone', () => {
    const action: Action = {
      kind: 'set_data_type',
      path: 'total_amount',
      dataType: 'string',
    };

    expect(scrubSecrets(action)).toEqual(action);
  });

  it('does not mutate its input', () => {
    const input = { password: 'hunter2' };

    scrubSecrets(input);

    expect(input.password).toBe('hunter2');
  });
});

describe('credentials never reach storage', () => {
  it('scrubs a credential out of a recorded action', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.appendMessage(sessionId, {
      role: 'assistant',
      text: 'Connector configured.',
      action: {
        kind: 'set_connector_field',
        property: 'password',
        value: 'hunter2',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    const stored = JSON.stringify(await sessions.load(sessionId));

    expect(stored).not.toContain('hunter2');
  });

  it('records only that the connector was configured', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.markConnectorConfigured(sessionId);
    const resumed = await sessions.load(sessionId);

    expect(resumed?.connectorConfigured).toBe(true);
    expect(JSON.stringify(resumed)).not.toMatch(/hunter2|secret/i);
  });
});

/**
 * No dataset document is cached: whatever the preview shows comes from a fresh
 * read. `lastVersionKey` is kept only so a concurrent edit can be reported,
 * never to write with.
 */
describe('what the session refuses to hold', () => {
  it('has no field for dataset configuration', async () => {
    const session = await store().start({ mode: 'create' });

    [
      'data_schema',
      'dataset_config',
      'dedup_config',
      'validation_config',
    ].forEach((field) =>
      expect(session as unknown as Record<string, unknown>).not.toHaveProperty(
        field,
      ),
    );
  });

  it('remembers the last version key only for reporting', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.noteVersionKey(sessionId, '1788843914794');

    expect((await sessions.load(sessionId))?.lastVersionKey).toBe(
      '1788843914794',
    );
  });
});

describe('storage that is unavailable', () => {
  /**
   * Private browsing can refuse IndexedDB outright. The conversation must
   * still work for the current tab rather than failing to start.
   */
  it('keeps working when writes throw', async () => {
    const failing = {
      get: async () => undefined,
      put: async () => {
        throw new Error('IndexedDB is not available');
      },
      delete: async () => undefined,
      list: async () => [] as AiSession[],
    };

    const sessions = createSessionStore(failing, () => NOW);
    const started = await sessions.start({ mode: 'create' });

    expect(started.sessionId).toBeTruthy();
  });

  it('reports that the session is not being persisted', async () => {
    const failing = {
      get: async () => undefined,
      put: async () => {
        throw new Error('IndexedDB is not available');
      },
      delete: async () => undefined,
      list: async () => [] as AiSession[],
    };

    const sessions = createSessionStore(failing, () => NOW);
    await sessions.start({ mode: 'create' });

    expect(sessions.isPersisting()).toBe(false);
  });

  it('reports persistence when writes succeed', async () => {
    const sessions = store();
    await sessions.start({ mode: 'create' });

    expect(sessions.isPersisting()).toBe(true);
  });
});

/**
 * A session is created every time the assistant page is opened, so one that
 * is never spoken to would otherwise accumulate in IndexedDB forever. Two
 * appear per dev page load because StrictMode double-invokes the effect;
 * abandoned visits leave one each in production.
 */
describe('pruning conversations that never started', () => {
  it('removes a session with no turns', async () => {
    const sessions = store();
    const orphan = await sessions.start({ mode: 'create' });

    await sessions.pruneEmpty();

    expect(await sessions.load(orphan.sessionId)).toBeUndefined();
  });

  it('keeps the session it is told to spare', async () => {
    const sessions = store();
    const keep = await sessions.start({ mode: 'create' });
    const orphan = await sessions.start({ mode: 'create' });

    await sessions.pruneEmpty(keep.sessionId);

    expect(await sessions.load(keep.sessionId)).toBeDefined();
    expect(await sessions.load(orphan.sessionId)).toBeUndefined();
  });

  it('keeps a conversation that has turns', async () => {
    const sessions = store();
    const spoken = await sessions.start({ mode: 'create' });
    await sessions.appendMessage(spoken.sessionId, {
      role: 'user',
      text: 'hello',
    });

    await sessions.pruneEmpty();

    expect(await sessions.load(spoken.sessionId)).toBeDefined();
  });

  /**
   * A draft exists on the server even if the conversation never got a turn,
   * so throwing the session away would orphan the link to that draft.
   */
  it('keeps an empty session that is attached to a draft', async () => {
    const sessions = store();
    const attached = await sessions.start({ mode: 'create' });
    await sessions.attachDataset(attached.sessionId, 'my-orders');

    await sessions.pruneEmpty();

    expect(await sessions.load(attached.sessionId)).toBeDefined();
  });

  it('reports how many it removed', async () => {
    const sessions = store();
    await sessions.start({ mode: 'create' });
    await sessions.start({ mode: 'create' });

    expect(await sessions.pruneEmpty()).toBe(2);
  });
});

/**
 * Name and type are chosen before `datasets/create` runs, so the server
 * cannot hold them yet. Losing them between turns would make the create call
 * fail with MISSING_DATASET_NAME — found by driving the real UI, where the
 * name was narrated as held and then forgotten.
 */
describe('the name and type chosen before the draft exists', () => {
  it('starts with nothing pending', async () => {
    expect((await store().start({ mode: 'create' })).pending).toEqual({});
  });

  it('holds a name across turns', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.setPending(sessionId, { name: 'My Orders' });

    expect((await sessions.load(sessionId))?.pending).toEqual({
      name: 'My Orders',
    });
  });

  it('merges a later choice rather than replacing the earlier one', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.setPending(sessionId, { name: 'My Orders' });
    await sessions.setPending(sessionId, { datasetType: 'master' });

    expect((await sessions.load(sessionId))?.pending).toEqual({
      name: 'My Orders',
      datasetType: 'master',
    });
  });

  it('lets a choice be corrected', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.setPending(sessionId, { name: 'Wrong Name' });
    await sessions.setPending(sessionId, { name: 'My Orders' });

    expect((await sessions.load(sessionId))?.pending?.name).toBe('My Orders');
  });

  /** Once the draft exists the server owns these, so holding them would rot. */
  it('drops them when the dataset id is attached', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.setPending(sessionId, { name: 'My Orders' });

    await sessions.attachDataset(sessionId, 'my-orders');

    expect((await sessions.load(sessionId))?.pending).toEqual({});
  });
});

/**
 * Postgres marks nine of its ten properties required, so a reload that lost
 * the collected values would cost the user eight answers. They are persisted;
 * the credentials are not, by construction.
 */
describe('the connector chosen before it is written', () => {
  it('starts with no connector', async () => {
    expect((await store().start({ mode: 'create' })).connector).toBeUndefined();
  });

  it('records the connector chosen', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.selectConnector(sessionId, {
      id: 'postgres-connector-1.0.0',
      name: 'PostgreSQL',
    });

    expect((await sessions.load(sessionId))?.connector).toEqual({
      id: 'postgres-connector-1.0.0',
      name: 'PostgreSQL',
      values: {},
    });
  });

  it('accumulates values across turns', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.selectConnector(sessionId, {
      id: 'postgres-connector-1.0.0',
    });

    await sessions.setConnectorValue(sessionId, 'source_database_host', 'db');
    await sessions.setConnectorValue(sessionId, 'source_database_port', 5432);

    expect((await sessions.load(sessionId))?.connector?.values).toEqual({
      source_database_host: 'db',
      source_database_port: 5432,
    });
  });

  it('lets a value be corrected', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.selectConnector(sessionId, {
      id: 'postgres-connector-1.0.0',
    });

    await sessions.setConnectorValue(
      sessionId,
      'source_database_host',
      'wrong',
    );
    await sessions.setConnectorValue(sessionId, 'source_database_host', 'db');

    expect(
      (await sessions.load(sessionId))?.connector?.values.source_database_host,
    ).toBe('db');
  });

  /**
   * Carrying one connector's values into another could send postgres settings
   * to kafka, so choosing again starts clean.
   */
  it('drops the values when a different connector is chosen', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.selectConnector(sessionId, {
      id: 'postgres-connector-1.0.0',
    });
    await sessions.setConnectorValue(sessionId, 'source_database_host', 'db');

    await sessions.selectConnector(sessionId, { id: 'kafka-connector-2.0.0' });

    expect((await sessions.load(sessionId))?.connector?.values).toEqual({});
  });

  it('un-marks configured when a different connector is chosen', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.selectConnector(sessionId, {
      id: 'postgres-connector-1.0.0',
    });
    await sessions.markConnectorConfigured(sessionId);

    await sessions.selectConnector(sessionId, { id: 'kafka-connector-2.0.0' });

    expect((await sessions.load(sessionId))?.connectorConfigured).toBe(false);
  });

  it('ignores a value when no connector has been chosen', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.setConnectorValue(sessionId, 'source_database_host', 'db');

    expect((await sessions.load(sessionId))?.connector).toBeUndefined();
  });

  /**
   * The backstop, and it *drops* rather than redacts. Storing `[redacted]`
   * would be worse than storing nothing: the buffer is merged into
   * `connector_config` on submit, so the connector would be sent the literal
   * placeholder as its password.
   */
  it('drops a credential that reaches the value buffer', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.selectConnector(sessionId, {
      id: 'postgres-connector-1.0.0',
    });

    await sessions.setConnectorValue(
      sessionId,
      'source_database_pwd',
      'hunter2-do-not-store',
    );

    const stored = await sessions.load(sessionId);

    expect(JSON.stringify(stored)).not.toContain('hunter2-do-not-store');
    expect(stored?.connector?.values).not.toHaveProperty('source_database_pwd');
  });

  it('keeps the non-secret values alongside a dropped credential', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.selectConnector(sessionId, {
      id: 'postgres-connector-1.0.0',
    });

    await sessions.setConnectorValue(sessionId, 'source_database_host', 'db');
    await sessions.setConnectorValue(sessionId, 'source_database_pwd', 'x');

    expect((await sessions.load(sessionId))?.connector?.values).toEqual({
      source_database_host: 'db',
    });
  });
});

/**
 * The transcript is the undo stack, so the inverse has to survive a reload
 * and being spent has to be recorded — otherwise the same change could be
 * undone twice, the second time against a document that no longer holds it.
 */
describe('the inverse a change carries', () => {
  const inverse: Action[] = [
    { kind: 'set_data_type', path: 'order_id', dataType: 'string' },
  ];

  it('persists with the message', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });

    await sessions.appendMessage(sessionId, {
      role: 'assistant',
      text: 'Done — set order_id to double.',
      action: { kind: 'set_data_type', path: 'order_id', dataType: 'double' },
      inverse,
    });

    const resumed = await sessions.load(sessionId);

    expect(resumed?.messages[0].inverse).toEqual(inverse);
  });

  it('is marked spent once it has been undone', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    const appended = await sessions.appendMessage(sessionId, {
      role: 'assistant',
      text: 'Done',
      action: { kind: 'set_data_type', path: 'order_id', dataType: 'double' },
      inverse,
    });
    const [message] = appended?.messages ?? [];

    const updated = await sessions.markUndone(sessionId, message.id);

    expect(updated?.messages[0].undone).toBe(true);
  });

  it('leaves the other turns alone', async () => {
    const sessions = store();
    const { sessionId } = await sessions.start({ mode: 'create' });
    await sessions.appendMessage(sessionId, { role: 'user', text: 'first' });
    const appended = await sessions.appendMessage(sessionId, {
      role: 'assistant',
      text: 'Done',
      action: { kind: 'set_dedup', enabled: false },
      inverse,
    });
    const target = appended?.messages[1];

    const updated = await sessions.markUndone(sessionId, target?.id ?? '');

    expect(updated?.messages[0].undone).toBeUndefined();
    expect(updated?.messages[1].undone).toBe(true);
  });
});
