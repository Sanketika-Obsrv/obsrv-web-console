jest.mock('idb', () => ({ openDB: jest.fn() }));

import { openDB } from 'idb';
import { createIdbStorage } from './idbStorage';
import { AiSession } from './types';

const mocked = openDB as jest.MockedFunction<typeof openDB>;

const session = (sessionId = 'session-1'): AiSession => ({
  sessionId,
  datasetId: null,
  pending: {},
  mode: 'create',
  step: 'ingestion',
  messages: [],
  sampleRows: [],
  sampleExpiresAt: null,
  lastVersionKey: null,
  modelTier: 0,
  connectorConfigured: false,
  createdAt: 1,
  updatedAt: 1,
});

beforeEach(() => jest.clearAllMocks());

/**
 * The conversation must survive a browser that will not give us a database.
 *
 * `isIndexedDbAvailable` only reports whether the *global* exists, which is
 * true in plenty of contexts where opening still fails: storage blocked by
 * policy, a corrupt database, or another tab holding an upgrade open. Before
 * this, that failure reached the turn loop as an unhandled rejection — which
 * the dev server renders as a full-screen runtime error, and which in
 * production silently lost the turn.
 */
describe('when the database cannot be opened', () => {
  it('keeps the conversation in memory instead of failing', async () => {
    mocked.mockRejectedValue(new Error('storage blocked'));

    const storage = createIdbStorage();
    await storage.put(session());

    expect(await storage.get('session-1')).toMatchObject({
      sessionId: 'session-1',
    });
  });

  it('does not retry the open on every call', async () => {
    mocked.mockRejectedValue(new Error('storage blocked'));

    const storage = createIdbStorage();
    await storage.put(session());
    await storage.get('session-1');
    await storage.list();

    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it('lists and deletes without a database', async () => {
    mocked.mockRejectedValue(new Error('storage blocked'));

    const storage = createIdbStorage();
    await storage.put(session('a'));
    await storage.put(session('b'));
    await storage.delete('a');

    expect((await storage.list()).map((s) => s.sessionId)).toEqual(['b']);
  });
});

/**
 * An open that never settles is the "another tab has it open" case: the
 * upgrade blocks until that tab closes, and until then every turn would hang
 * with no explanation.
 */
describe('when the database never opens', () => {
  it('gives up and uses memory rather than hanging', async () => {
    // Legacy fake timers in this jest: advance, then let the microtask that
    // the rejected timeout schedules actually run.
    jest.useFakeTimers();
    mocked.mockReturnValue(new Promise(() => undefined) as never);

    const storage = createIdbStorage();
    const write = storage.put(session());

    jest.advanceTimersByTime(6000);
    await write;
    jest.useRealTimers();

    expect(await storage.get('session-1')).toBeDefined();
  });
});

describe('when the database works', () => {
  it('uses it', async () => {
    const db = {
      get: jest.fn().mockResolvedValue(session()),
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      getAll: jest.fn().mockResolvedValue([session()]),
    };
    mocked.mockResolvedValue(db as never);

    const storage = createIdbStorage();
    await storage.put(session());

    expect(db.put).toHaveBeenCalled();
    expect(await storage.get('session-1')).toMatchObject({
      sessionId: 'session-1',
    });
  });

  /** A database that opens and then fails mid-write must not lose the turn. */
  it('falls back when a write fails after opening', async () => {
    const db = {
      get: jest.fn().mockResolvedValue(undefined),
      put: jest.fn().mockRejectedValue(new Error('quota exceeded')),
      delete: jest.fn().mockResolvedValue(undefined),
      getAll: jest.fn().mockResolvedValue([]),
    };
    mocked.mockResolvedValue(db as never);

    const storage = createIdbStorage();
    await storage.put(session());

    expect(await storage.get('session-1')).toMatchObject({
      sessionId: 'session-1',
    });
  });
});
