import { renderHook, waitFor } from '@testing-library/react';
import { createMemoryStorage } from './memoryStorage';
import { createSessionStore } from './sessionStore';
import { SessionStorage } from './types';
import { ACTIVE_SESSION_KEY, useSession } from './useSession';

const setUp = (datasetId: string | null, storage?: SessionStorage) => {
  const store = createSessionStore(storage ?? createMemoryStorage());
  const hook = renderHook(() => useSession({ datasetId, store }));

  return { store, ...hook };
};

const settled = async (result: { current: { loading: boolean } }) =>
  waitFor(() => expect(result.current.loading).toBe(false));

beforeEach(() => sessionStorage.clear());

describe('starting fresh', () => {
  it('reports loading until the session is ready', async () => {
    const { result } = setUp(null);

    expect(result.current.loading).toBe(true);
    await settled(result);
  });

  it('starts a session when there is no dataset yet', async () => {
    const { result } = setUp(null);

    await settled(result);

    expect(result.current.session?.datasetId).toBeNull();
    expect(result.current.session?.sessionId).toBeTruthy();
  });

  it('starts with an empty transcript', async () => {
    const { result } = setUp(null);

    await settled(result);

    expect(result.current.messages).toEqual([]);
  });
});

describe('resuming the conversation for a dataset', () => {
  it('reuses the existing session rather than starting another', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    const existing = await store.start({ mode: 'create' });
    await store.attachDataset(existing.sessionId, 'my-orders');
    await store.appendMessage(existing.sessionId, {
      role: 'user',
      text: 'earlier turn',
    });

    const { result } = setUp('my-orders', storage);
    await settled(result);

    expect(result.current.session?.sessionId).toBe(existing.sessionId);
    expect(result.current.messages.map((m) => m.text)).toEqual([
      'earlier turn',
    ]);
  });

  it('restores the step the conversation had reached', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    const existing = await store.start({ mode: 'create' });
    await store.attachDataset(existing.sessionId, 'my-orders');
    await store.setStep(existing.sessionId, 'storage');

    const { result } = setUp('my-orders', storage);
    await settled(result);

    expect(result.current.session?.step).toBe('storage');
  });

  /**
   * Opening a draft the assistant never created is legitimate — the user may
   * have started it in the wizard — so a session is created for it.
   */
  it('starts a session for a draft it has never seen', async () => {
    const { result } = setUp('made-in-the-wizard');
    await settled(result);

    expect(result.current.session?.datasetId).toBe('made-in-the-wizard');
  });
});

describe('recording turns', () => {
  it('appends a message and exposes it immediately', async () => {
    const { result } = setUp(null);
    await settled(result);

    await result.current.append({ role: 'user', text: 'call it My Orders' });

    await waitFor(() =>
      expect(result.current.messages.map((m) => m.text)).toEqual([
        'call it My Orders',
      ]),
    );
  });

  /**
   * The acceptance case: reloading mid-conversation, *before* create, when
   * there is no dataset id to key on. The tab remembers its own session id in
   * `sessionStorage`, which is what survives the reload.
   */
  it('resumes the same conversation after a reload with no draft yet', async () => {
    const storage = createMemoryStorage();
    const { result } = setUp(null, storage);
    await settled(result);
    await result.current.append({ role: 'user', text: 'remembered' });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    const original = result.current.session?.sessionId;

    const again = renderHook(() =>
      useSession({ datasetId: null, store: createSessionStore(storage) }),
    );

    await waitFor(() => expect(again.result.current.loading).toBe(false));
    expect(again.result.current.session?.sessionId).toBe(original);
    expect(again.result.current.messages.map((m) => m.text)).toEqual([
      'remembered',
    ]);
  });

  it('records the active session id where a reload can find it', async () => {
    const { result } = setUp(null);
    await settled(result);

    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBe(
      result.current.session?.sessionId,
    );
  });

  /**
   * Two tabs each starting a new dataset must not share one conversation,
   * which is why this is `sessionStorage` and not `localStorage`.
   */
  it('starts a separate conversation for a tab with no remembered session', async () => {
    const storage = createMemoryStorage();
    const { result } = setUp(null, storage);
    await settled(result);
    const first = result.current.session?.sessionId;

    sessionStorage.clear();
    const otherTab = renderHook(() =>
      useSession({ datasetId: null, store: createSessionStore(storage) }),
    );

    await waitFor(() => expect(otherTab.result.current.loading).toBe(false));
    expect(otherTab.result.current.session?.sessionId).not.toBe(first);
  });

  it('moves the step and keeps it', async () => {
    const { result } = setUp(null);
    await settled(result);

    await result.current.setStep('processing');

    await waitFor(() =>
      expect(result.current.session?.step).toBe('processing'),
    );
  });
});

/**
 * The dataset id only exists after `datasets/create`, so the session has to
 * adopt it mid-conversation without losing the transcript.
 */
describe('adopting the dataset id after create', () => {
  it('attaches the id to the running session', async () => {
    const { result } = setUp(null);
    await settled(result);
    await result.current.append({ role: 'user', text: 'before create' });

    await result.current.attachDataset('my-orders');

    await waitFor(() =>
      expect(result.current.session?.datasetId).toBe('my-orders'),
    );
  });

  it('keeps the transcript across the attach', async () => {
    const { result } = setUp(null);
    await settled(result);
    await result.current.append({ role: 'user', text: 'before create' });

    await result.current.attachDataset('my-orders');

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
  });

  it('is then found by dataset id on the next mount', async () => {
    const storage = createMemoryStorage();
    const { result } = setUp(null, storage);
    await settled(result);
    await result.current.attachDataset('my-orders');
    await waitFor(() =>
      expect(result.current.session?.datasetId).toBe('my-orders'),
    );

    const again = renderHook(() =>
      useSession({
        datasetId: 'my-orders',
        store: createSessionStore(storage),
      }),
    );

    await waitFor(() => expect(again.result.current.loading).toBe(false));
    expect(again.result.current.session?.sessionId).toBe(
      result.current.session?.sessionId,
    );
  });
});

describe('sample rows', () => {
  it('holds the rows for local inference', async () => {
    const { result } = setUp(null);
    await settled(result);

    await result.current.setSampleRows([{ order_id: 'ORD-1' }]);

    await waitFor(() =>
      expect(result.current.session?.sampleRows).toEqual([
        { order_id: 'ORD-1' },
      ]),
    );
  });

  it('clears them on request', async () => {
    const { result } = setUp(null);
    await settled(result);
    await result.current.setSampleRows([{ order_id: 'ORD-1' }]);
    await waitFor(() =>
      expect(result.current.session?.sampleRows).toHaveLength(1),
    );

    await result.current.clearSample();

    await waitFor(() => expect(result.current.session?.sampleRows).toEqual([]));
  });
});

describe('clearing the session', () => {
  it('starts a fresh one, so the pane is never left without a session', async () => {
    const { result } = setUp(null);
    await settled(result);
    const original = result.current.session?.sessionId;
    await result.current.append({ role: 'user', text: 'forget this' });

    await result.current.clear();

    await waitFor(() =>
      expect(result.current.session?.sessionId).not.toBe(original),
    );
    expect(result.current.messages).toEqual([]);
  });

  it('removes the old rows entirely', async () => {
    const storage = createMemoryStorage();
    const { result } = setUp(null, storage);
    await settled(result);
    const original = result.current.session?.sessionId ?? '';
    await result.current.setSampleRows([{ pii: 'a@example.com' }]);

    await result.current.clear();
    await waitFor(() =>
      expect(result.current.session?.sessionId).not.toBe(original),
    );

    expect(await storage.get(original)).toBeUndefined();
  });
});

describe('when storage refuses to persist', () => {
  const failing = (): SessionStorage => ({
    get: async () => undefined,
    put: async () => {
      throw new Error('IndexedDB is not available');
    },
    delete: async () => undefined,
    list: async () => [],
  });

  it('still provides a working session', async () => {
    const { result } = setUp(null, failing());
    await settled(result);

    expect(result.current.session).toBeDefined();
  });

  it('reports that the conversation is not being saved', async () => {
    const { result } = setUp(null, failing());
    await settled(result);

    expect(result.current.persisting).toBe(false);
  });
});

/**
 * The resume list is read from the store rather than tracked separately, so
 * it cannot drift from what is actually persisted.
 */
describe('the resume list', () => {
  it('is empty when this is the only conversation', async () => {
    const { result } = setUp(null);
    await settled(result);

    expect(result.current.resumable).toEqual([]);
  });

  it('offers an earlier conversation that has turns', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    const earlier = await store.start({ mode: 'create' });
    await store.attachDataset(earlier.sessionId, 'orders');
    await store.appendMessage(earlier.sessionId, {
      role: 'user',
      text: 'earlier',
    });

    const { result } = setUp(null, storage);
    await settled(result);

    await waitFor(() =>
      expect(result.current.resumable.map((s) => s.datasetId)).toEqual([
        'orders',
      ]),
    );
  });

  it('leaves out the conversation currently open', async () => {
    const { result } = setUp(null);
    await settled(result);
    await result.current.append({ role: 'user', text: 'current' });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.resumable).toEqual([]);
  });

  it('leaves out a session that never got a turn', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    await store.start({ mode: 'create' });

    const { result } = setUp(null, storage);
    await settled(result);

    expect(result.current.resumable).toEqual([]);
  });

  it('drops a conversation once it is cleared', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    const earlier = await store.start({ mode: 'create' });
    await store.attachDataset(earlier.sessionId, 'orders');
    await store.appendMessage(earlier.sessionId, {
      role: 'user',
      text: 'earlier',
    });

    const { result } = setUp(null, storage);
    await settled(result);
    await waitFor(() => expect(result.current.resumable).toHaveLength(1));

    await result.current.clearSession(earlier.sessionId);

    await waitFor(() => expect(result.current.resumable).toEqual([]));
  });

  it('removes the cleared conversation from storage', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    const earlier = await store.start({ mode: 'create' });
    await store.appendMessage(earlier.sessionId, {
      role: 'user',
      text: 'earlier',
    });

    const { result } = setUp(null, storage);
    await settled(result);

    await result.current.clearSession(earlier.sessionId);

    expect(await storage.get(earlier.sessionId)).toBeUndefined();
  });

  it('does not carry sample rows into the list', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    const earlier = await store.start({ mode: 'create' });
    await store.appendMessage(earlier.sessionId, {
      role: 'user',
      text: 'earlier',
    });
    await store.setSampleRows(earlier.sessionId, [{ pii: 'a@example.com' }]);

    const { result } = setUp(null, storage);
    await settled(result);

    await waitFor(() => expect(result.current.resumable).toHaveLength(1));
    expect(result.current.resumable[0].sampleRows).toEqual([]);
  });
});

/**
 * The page creates a session on every open, and StrictMode invokes the effect
 * twice in development, so without pruning IndexedDB would fill with
 * conversations nobody ever spoke to.
 */
describe('conversations that were never started', () => {
  it('leaves only one session behind after mounting', async () => {
    const storage = createMemoryStorage();
    const { result } = setUp(null, storage);
    await settled(result);

    await waitFor(async () => expect(await storage.list()).toHaveLength(1));
  });

  it('clears an empty session left by an earlier visit', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    const abandoned = await store.start({ mode: 'create' });

    const { result } = setUp(null, storage);
    await settled(result);

    await waitFor(async () =>
      expect(await storage.get(abandoned.sessionId)).toBeUndefined(),
    );
  });

  it('keeps an earlier conversation that has turns', async () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    const spoken = await store.start({ mode: 'create' });
    await store.appendMessage(spoken.sessionId, {
      role: 'user',
      text: 'earlier',
    });

    const { result } = setUp(null, storage);
    await settled(result);

    expect(await storage.get(spoken.sessionId)).toBeDefined();
  });

  it('keeps the conversation it just opened', async () => {
    const storage = createMemoryStorage();
    const { result } = setUp(null, storage);
    await settled(result);

    const opened = result.current.session?.sessionId ?? '';
    await waitFor(async () => expect(await storage.get(opened)).toBeDefined());
  });
});
