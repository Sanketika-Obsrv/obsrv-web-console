/**
 * In-memory session storage.
 *
 * Two jobs: it is what the store's rules are tested against, and it is the
 * fallback when IndexedDB is unavailable — private browsing can refuse it
 * outright, and the conversation should still work for the current tab.
 */
import { AiSession, SessionStorage } from './types';

export const createMemoryStorage = (): SessionStorage => {
  const sessions = new Map<string, AiSession>();

  return {
    get: async (sessionId) => sessions.get(sessionId),
    put: async (session) => {
      sessions.set(session.sessionId, session);
    },
    delete: async (sessionId) => {
      sessions.delete(sessionId);
    },
    list: async () => [...sessions.values()],
  };
};
