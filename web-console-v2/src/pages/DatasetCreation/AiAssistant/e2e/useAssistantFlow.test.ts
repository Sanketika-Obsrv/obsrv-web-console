jest.mock('services/http', () => {
  // Assigned by the test before anything renders. Declared without a type
  // alias: jest's mock-factory hoist check rejects any identifier declared
  // inside the factory, type aliases included.
  const holder: {
    current?: Record<string, (...args: never[]) => Promise<unknown>>;
  } = {};
  return {
    __esModule: true,
    get httpHolder() {
      return holder;
    },
    http: {
      get: (...a: unknown[]) => holder.current!['get'](...(a as never[])),
      post: (...a: unknown[]) => holder.current!['post'](...(a as never[])),
      patch: (...a: unknown[]) => holder.current!['patch'](...(a as never[])),
      put: (...a: unknown[]) => holder.current!['put'](...(a as never[])),
    },
    addHttpRequestsInterceptor: () => undefined,
    responseInterceptor: (r: unknown) => r,
    errorInterceptor: () => (e: unknown) => Promise.reject(e),
  };
});

import { renderHook, waitFor } from '@testing-library/react';
import { fetchSystemSettings } from 'services/configData';
import * as httpModule from 'services/http';
import { useAssistant } from '../useAssistant';
import { createFakeConfigApi } from './fakeConfigApi';
import { pathFromRef } from '../engine/previewFocus';
import { DataSchema, unresolvedConflicts } from '../engine/schemaEditor';
import { timestampCandidates } from '../engine/schemaSuggestions';

/**
 * These drive the whole stack, so they are slower than a unit test. Jest's
 * default per-test budget is 5s — the same as the `asyncUtilTimeout` set in
 * `setupTests` — so a single `waitFor` could consume the entire budget and
 * the test would die before its assertion resolved.
 */
jest.setTimeout(60000);

let api: ReturnType<typeof createFakeConfigApi>;

beforeEach(async () => {
  sessionStorage.clear();
  localStorage.clear();
  api = createFakeConfigApi();
  (
    httpModule as unknown as { httpHolder: { current: unknown } }
  ).httpHolder.current = api.http;

  // As the app does at startup; `STORAGE_TYPES` drives capability detection.
  await fetchSystemSettings();
});

it('records a turn in the transcript', async () => {
  const { result } = renderHook(() => useAssistant(null));

  await waitFor(() => expect(result.current.loading).toBe(false));

  await result.current.send('call it My Orders');

  await waitFor(() =>
    expect(result.current.messages.map((m) => m.text)).toEqual([
      'call it My Orders',
      expect.stringContaining('My Orders'),
    ]),
  );
});

/**
 * Found by the end-to-end test: an instruction sent while the session was
 * still loading reached the API but had its turns dropped, because
 * `useSession.apply` no-ops before the session exists. The action ran with no
 * record of it — and the transcript is the audit trail.
 */
describe('before the session is ready', () => {
  it('reports itself busy while restoring', () => {
    const { result } = renderHook(() => useAssistant(null));

    expect(result.current.loading).toBe(true);
    expect(result.current.busy).toBe(true);
  });

  it('executes nothing that it could not record', async () => {
    const { result } = renderHook(() => useAssistant(null));

    // Deliberately sent before the session has loaded.
    await result.current.send('call it My Orders');

    expect(
      api.calls.filter((call) => call.url.includes('/api/dataset/exists/')),
    ).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([]);
  });

  it('accepts the same instruction once ready', async () => {
    const { result } = renderHook(() => useAssistant(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.send('call it My Orders');

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(
      api.calls.some((call) => call.url.includes('/api/dataset/exists/')),
    ).toBe(true);
  });

  it('stops being busy once restored', async () => {
    const { result } = renderHook(() => useAssistant(null));

    await waitFor(() => expect(result.current.busy).toBe(false));
  });
});

/**
 * The bug T36 fixes, driven end to end.
 *
 * `updateDataset` stripped `suggestions` from `data_schema` on every write.
 * The API does not re-derive them, so resolving the *first* conflict erased
 * the second one from the stored document — and `unresolvedConflicts` then
 * reported nothing, so the guided flow walked past an unresolved MUST-FIX and
 * offered to save.
 *
 * This could not be written before: `fakeConfigApi` emitted no `suggestions`
 * and no `oneof`, so there was never anything to strip and the whole conflict
 * path was untested.
 */
describe('a dataset with more than one type conflict', () => {
  /** Two columns whose values disagree, so both get a MUST-FIX suggestion. */
  const MIXED_ROWS = [
    {
      order_id: 'A-1',
      amount: 10.5,
      total: 1,
      order_ts: '2026-01-01T00:00:00Z',
    },
    {
      order_id: 'A-2',
      amount: 20,
      total: 2.5,
      order_ts: '2026-01-02T00:00:00Z',
    },
  ];

  const conflictedPaths = (): string[] =>
    unresolvedConflicts(
      (api.dataset('my-orders')?.data_schema ?? {}) as DataSchema,
    ).map(pathFromRef);

  const draftWithConflicts = async () => {
    const { result } = renderHook(() => useAssistant(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.send('call it My Orders');
    // The name is held in the session, so wait for the turn to land before
    // the sample tries to create the draft with it.
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await result.current.attachSample(
      MIXED_ROWS as unknown as Record<string, unknown>[],
      new File([JSON.stringify(MIXED_ROWS)], 'orders.json', {
        type: 'application/json',
      }),
    );
    await waitFor(() => expect(api.dataset('my-orders')).toBeDefined(), {
      timeout: 15000,
    });
    // The draft existing on the server is not the same as the session having
    // attached it; a schema action before that is refused for having no
    // dataset.
    await waitFor(() => expect(result.current.datasetId).toBe('my-orders'), {
      timeout: 15000,
    });

    return result;
  };

  it('reports both conflicts on the freshly created draft', async () => {
    await draftWithConflicts();

    expect(conflictedPaths().sort()).toEqual(['amount', 'total']);
  });

  it('still reports the second conflict after the first is resolved', async () => {
    const result = await draftWithConflicts();

    await result.current.dispatch({
      kind: 'resolve_conflict',
      path: 'amount',
      mode: 'apply',
      dataType: 'double',
    });

    await waitFor(() => expect(conflictedPaths()).toEqual(['total']));
  });

  it('keeps the API masking hint through a schema write', async () => {
    // The same strip erased the LOW TRANSFORMATION hint, which is the
    // assistant's source for the PII question.
    const result = await draftWithConflicts();

    await result.current.dispatch({
      kind: 'toggle_required',
      path: 'order_id',
      required: true,
    });

    await waitFor(() =>
      expect(
        timestampCandidates(
          (api.dataset('my-orders')?.data_schema ?? {}) as DataSchema,
        ),
      ).toEqual(['order_ts']),
    );
  });
});
