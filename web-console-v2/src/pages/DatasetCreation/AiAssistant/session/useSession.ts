/**
 * Binds one conversation to the pane.
 *
 * The store is injected so the rules can be tested against in-memory storage;
 * in the app it defaults to IndexedDB, falling back to memory when the browser
 * refuses it. Every mutation writes through the store and then re-reads, so
 * what the pane renders is what was persisted rather than optimistic local
 * state — the same discipline the executor applies to the server.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createIdbStorage, isIndexedDbAvailable } from './idbStorage';
import { createMemoryStorage } from './memoryStorage';
import { NewMessage, SessionStore, createSessionStore } from './sessionStore';
import { AiSession, Message } from './types';

/**
 * Where the active session id is remembered before `datasets/create` runs.
 *
 * `sessionStorage` rather than `localStorage` deliberately: it is per tab, so
 * reloading restores the conversation while two tabs each starting a new
 * dataset stay independent.
 */
export const ACTIVE_SESSION_KEY = 'obsrv-ai-active-session';

const rememberActive = (sessionId: string) => {
  try {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
  } catch {
    // Storage can be refused outright; the conversation still works in memory.
  }
};

const recallActive = (): string | null => {
  try {
    return sessionStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
};

export const defaultSessionStore = (): SessionStore =>
  createSessionStore(
    isIndexedDbAvailable() ? createIdbStorage() : createMemoryStorage(),
  );

export interface UseSessionOptions {
  /** Null before `datasets/create` has run. */
  datasetId: string | null;
  store?: SessionStore;
}

export interface SessionApi {
  session?: AiSession;
  messages: Message[];
  loading: boolean;
  /** False when the browser refused to persist, e.g. private browsing. */
  persisting: boolean;
  append(message: NewMessage): Promise<void>;
  setStep(step: string): Promise<void>;
  /** Marks a change undone, so `undoTarget` does not offer it again. */
  markUndone(messageId: string): Promise<void>;
  attachDataset(datasetId: string): Promise<void>;
  setSampleRows(rows: unknown[]): Promise<void>;
  clearSample(): Promise<void>;
  noteVersionKey(versionKey: string): Promise<void>;
  markConnectorConfigured(): Promise<void>;
  /** Records a name or type chosen before the draft exists. */
  setPending(pending: AiSession['pending']): Promise<void>;
  selectConnector(connector: { id: string; name?: string }): Promise<void>;
  setConnectorValue(key: string, value: unknown): Promise<void>;
  onSaved(): Promise<void>;
  /**
   * Re-reads this conversation from the store.
   *
   * For callers that need the session *after* their own writes in the same
   * callback, where React state still holds the previous value.
   */
  reload(): Promise<AiSession | undefined>;
  /** Wipes this conversation and starts a new one in its place. */
  clear(): Promise<void>;
  /** Other conversations that have turns and can be picked up again. */
  resumable: AiSession[];
  /** Removes one of the conversations in `resumable`. */
  clearSession(sessionId: string): Promise<void>;
}

export const useSession = ({
  datasetId,
  store,
}: UseSessionOptions): SessionApi => {
  // Created once: a new store per render would open a second connection.
  const fallbackStore = useRef<SessionStore | null>(null);
  if (!fallbackStore.current) fallbackStore.current = defaultSessionStore();

  const sessions = store ?? fallbackStore.current;

  const [session, setSession] = useState<AiSession>();
  const [loading, setLoading] = useState(true);
  const [resumable, setResumable] = useState<AiSession[]>([]);

  /** Resumes the conversation for this dataset or this tab, or starts one. */
  const open = useCallback(async () => {
    // With a draft, the dataset id is the durable handle.
    const existing = datasetId
      ? await sessions.findByDataset(datasetId)
      : // Before create there is no id yet, so the tab remembers its own.
        await (async () => {
          const active = recallActive();
          return active ? sessions.load(active) : undefined;
        })();

    if (existing) {
      rememberActive(existing.sessionId);
      return existing;
    }

    const started = await sessions.start({ mode: 'create' });
    rememberActive(started.sessionId);

    return datasetId
      ? ((await sessions.attachDataset(started.sessionId, datasetId)) ??
          started)
      : started;
  }, [datasetId, sessions]);

  /**
   * Reads the resume list from the store rather than tracking it separately,
   * so it cannot drift from what is actually persisted.
   */
  const refreshResumable = useCallback(
    async (currentSessionId?: string) => {
      const all = await sessions.list();

      setResumable(
        all.filter(
          (candidate) =>
            // Spoken to, not merely opened: the assistant asks the first
            // question itself, so every conversation has a message.
            sessions.isSpokenTo(candidate) &&
            candidate.sessionId !== currentSessionId,
        ),
      );
    },
    [sessions],
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    open().then(async (opened) => {
      if (cancelled) return;
      setSession(opened);
      setLoading(false);

      // Opening the page creates a session, so sweep up any that were never
      // spoken to — including the extra one StrictMode's second effect makes.
      await sessions.pruneEmpty(opened.sessionId);
      await refreshResumable(opened.sessionId);
    });

    return () => {
      cancelled = true;
    };
  }, [open, refreshResumable, sessions]);

  /** Runs a store mutation and adopts whatever it persisted. */
  const apply = useCallback(
    async (
      change: (sessionId: string) => Promise<AiSession | undefined>,
    ): Promise<void> => {
      if (!session) return;

      const updated = await change(session.sessionId);
      if (updated) setSession(updated);
    },
    [session],
  );

  return useMemo(
    () => ({
      session,
      messages: session?.messages ?? [],
      loading,
      persisting: sessions.isPersisting(),

      reload: async () => {
        if (!session) return undefined;

        const fresh = await sessions.load(session.sessionId);
        if (fresh) setSession(fresh);

        return fresh;
      },

      append: (message) => apply((id) => sessions.appendMessage(id, message)),
      setStep: (step) => apply((id) => sessions.setStep(id, step)),
      markUndone: (messageId) =>
        apply((id) => sessions.markUndone(id, messageId)),
      attachDataset: (id) =>
        apply((sessionId) => sessions.attachDataset(sessionId, id)),
      setSampleRows: (rows) => apply((id) => sessions.setSampleRows(id, rows)),
      clearSample: () => apply((id) => sessions.clearSample(id)),
      noteVersionKey: (versionKey) =>
        apply((id) => sessions.noteVersionKey(id, versionKey)),
      markConnectorConfigured: () =>
        apply((id) => sessions.markConnectorConfigured(id)),
      setPending: (pending) => apply((id) => sessions.setPending(id, pending)),
      selectConnector: (connector) =>
        apply((id) => sessions.selectConnector(id, connector)),
      setConnectorValue: (key, value) =>
        apply((id) => sessions.setConnectorValue(id, key, value)),
      onSaved: () => apply((id) => sessions.onSaved(id)),

      resumable,
      clearSession: async (sessionId) => {
        await sessions.clear(sessionId);
        await refreshResumable(session?.sessionId);
      },

      clear: async () => {
        if (session) await sessions.clear(session.sessionId);

        // Never leave the pane without a session to write to.
        const started = await sessions.start({ mode: 'create' });
        rememberActive(started.sessionId);
        const replacement = datasetId
          ? ((await sessions.attachDataset(started.sessionId, datasetId)) ??
            started)
          : started;

        setSession(replacement);
        await refreshResumable(replacement.sessionId);
      },
    }),
    [apply, datasetId, loading, refreshResumable, resumable, session, sessions],
  );
};
