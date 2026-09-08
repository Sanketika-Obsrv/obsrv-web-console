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

export const createIdbStorage = (): SessionStorage => {
  let connection: Promise<IDBPDatabase> | null = null;

  const db = () => {
    if (!connection) connection = open();
    return connection;
  };

  return {
    get: async (sessionId) =>
      (await db()).get(STORE_NAME, sessionId) as Promise<AiSession | undefined>,

    put: async (session) => {
      await (await db()).put(STORE_NAME, session);
    },

    delete: async (sessionId) => {
      await (await db()).delete(STORE_NAME, sessionId);
    },

    list: async () => (await db()).getAll(STORE_NAME) as Promise<AiSession[]>,
  };
};
