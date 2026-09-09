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
