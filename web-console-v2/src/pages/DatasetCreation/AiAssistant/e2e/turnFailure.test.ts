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
import * as turnModule from '../engine/turn';

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

/**
 * The turn loop must not be able to throw at the user.
 *
 * `runTurn` already turns an executor failure into a message, and the
 * storage layer degrades to memory rather than rejecting. This covers
 * everything else — a bug of ours, a browser API refusing, a dependency
 * throwing — because an uncaught rejection here is what the development
 * server renders as a full-screen "Uncaught runtime errors" overlay, and
 * what production drops silently along with the user's turn.
 */
describe('a turn that throws', () => {
  const rejections: unknown[] = [];
  const record = (event: PromiseRejectionEvent) => {
    event.preventDefault();
    rejections.push(event.reason);
  };

  beforeEach(() => {
    rejections.length = 0;
    window.addEventListener('unhandledrejection', record);
    jest
      .spyOn(turnModule, 'runTurn')
      .mockRejectedValue(new Error('something deep failed'));
  });

  afterEach(() => {
    window.removeEventListener('unhandledrejection', record);
    jest.restoreAllMocks();
  });

  it('says so rather than escaping as a runtime error', async () => {
    const { result } = renderHook(() => useAssistant(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.send('call it My Orders');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(rejections).toEqual([]);
    await waitFor(() =>
      expect(
        result.current.messages.map((message) => message.text).join(' '),
      ).toMatch(/went wrong/i),
    );
  });

  it('stops being busy, so the next thing typed is still accepted', async () => {
    const { result } = renderHook(() => useAssistant(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.send('call it My Orders');

    await waitFor(() => expect(result.current.busy).toBe(false));
  });
});
