/**
 * IndexedDB adapter for the session store.
 *
 * Deliberately thin: every rule that could be got wrong — capping, expiry,
 * credential scrubbing, ordering — lives in `sessionStore` and is unit-tested
 * against `createMemoryStorage`. This file only moves records in and out, and
 * is verified in the browser.
 *
 * If IndexedDB is unavailable (private browsing refuses it outright), callers
 * fall back to in-memory storage so the conversation still works in this tab.
 */
import { IDBPDatabase, openDB } from 'idb';
import { createMemoryStorage } from './memoryStorage';
import { AiSession, SessionStorage } from './types';

export const DB_NAME = 'obsrv-ai-assistant';
export const STORE_NAME = 'sessions';
const DB_VERSION = 1;

/** Index so the resume list and `findByDataset` do not scan every record. */
export const DATASET_INDEX = 'by-dataset';

const open = (): Promise<IDBPDatabase> =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (db.objectStoreNames.contains(STORE_NAME)) return;

      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'sessionId',
      });
      store.createIndex(DATASET_INDEX, 'datasetId');
    },
  });

export const isIndexedDbAvailable = (): boolean => {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    // Some browsers throw on merely touching the global in a blocked context.
    return false;
  }
};

/**
 * How long to wait for the database before giving up on it.
 *
 * `openDB` does not reject when the open is *blocked* — it waits for the
 * other connection to close, which may be another tab the user has
 * forgotten. Waiting forever means every turn hangs with no explanation, so
 * after this the conversation carries on in memory.
 */
const OPEN_TIMEOUT_MS = 5000;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timed out opening the session database.')),
      ms,
    );

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (cause) => {
        clearTimeout(timer);
        reject(cause);
      },
    );
  });

/**
 * IndexedDB, degrading to memory rather than to an error.
 *
 * `isIndexedDbAvailable` only says whether the global exists, and that is
 * true in plenty of contexts where opening still fails: storage blocked by
 * policy, a corrupt database, a quota refusal mid-write, or another tab
 * holding an upgrade open. Any of those used to reach the turn loop as a
 * rejected promise nobody caught — a full-screen runtime error in
 * development, and a silently lost turn in production.
 *
 * So every operation falls back to an in-memory store, and once it has
 * fallen back it stays there for the life of the tab. The conversation is
 * then not durable across a reload, which is worth saying plainly and is far
 * better than losing the turn in hand.
 */
export const createIdbStorage = (): SessionStorage => {
  let connection: Promise<IDBPDatabase> | null = null;
  const memory = createMemoryStorage();
  let degraded = false;

  const db = () => {
    if (!connection) connection = withTimeout(open(), OPEN_TIMEOUT_MS);
    return connection;
  };

  /** Runs against the database, or against memory once that has failed. */
  const attempt = async <T>(
    // Not named `use`: the hooks lint rule reads any call to `use(...)` as
    // React's own hook, wherever it appears.
    onDatabase: (db: IDBPDatabase) => Promise<T>,
    instead: () => Promise<T>,
  ): Promise<T> => {
    if (degraded) return instead();

    try {
      return await onDatabase(await db());
    } catch {
      degraded = true;
      return instead();
    }
  };

  return {
    get: (sessionId) =>
      attempt(
        (database) =>
          database.get(STORE_NAME, sessionId) as Promise<AiSession | undefined>,
        () => memory.get(sessionId),
      ),

    put: (session) =>
      attempt(
        async (database) => {
          await database.put(STORE_NAME, session);
        },
        async () => {
          // Kept in memory so the turn that could not be persisted is still
          // in the conversation the user is looking at.
          await memory.put(session);
        },
      ),

    delete: (sessionId) =>
      attempt(
        async (database) => {
          await database.delete(STORE_NAME, sessionId);
        },
        () => memory.delete(sessionId),
      ),

    list: () =>
      attempt(
        (database) => database.getAll(STORE_NAME) as Promise<AiSession[]>,
        () => memory.list(),
      ),
  };
};
