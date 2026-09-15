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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, ReactNode } from 'react';
import { fetchSystemSettings } from 'services/configData';
import * as httpModule from 'services/http';
import { useAssistant } from '../useAssistant';
import { createFakeConfigApi } from './fakeConfigApi';
import * as turnModule from '../engine/turn';
import * as executorModule from '../engine/executor';
import { Action } from '../engine/actions';
import { ExecutionOutcome, ExecutorContext } from '../engine/executor';

/**
 * The assistant invalidates the preview's reads after a write, so it needs a
 * query client in context. One per render, so nothing leaks between tests.
 */
const renderAssistant = (datasetId: string | null = null) => {
  const client = new QueryClient();

  return renderHook(() => useAssistant(datasetId), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  });
};

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

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * `contextNow` reads `session.session`, which is React state and does not
 * update mid-turn. A turn that runs two actions — a create followed by a
 * patch — needs the second action to see the `datasetId` the first one just
 * created, or it would run against `datasetId: null`. That is the gap
 * `turnState` (a mutable ref, cleared at the top of every turn and updated
 * from each outcome) exists to close, ahead of the multi-action planner that
 * will actually produce a turn like this.
 *
 * There is no router yet to drive a real two-action plan, so `runTurn` is
 * stubbed to call `deps.execute` for two actions in a row and report both in
 * `applied` — a direct test double for the one piece this commit changes,
 * rather than a lower-level test against `contextNow` in isolation, because
 * this exercises the actual `execute` closure `useAssistant` builds,
 * `turnState` included. `executeAction` is stubbed alongside it purely to
 * observe the `ExecutorContext` each call received, without needing a real
 * create-then-patch round trip against the fake API.
 */
describe('the mid-turn context overlay', () => {
  it("carries the first action's new datasetId into the second", async () => {
    const contexts: ExecutorContext[] = [];

    jest
      .spyOn(executorModule, 'executeAction')
      .mockImplementation(
        async (
          action: Action,
          context: ExecutorContext,
        ): Promise<ExecutionOutcome> => {
          contexts.push(context);

          if (action.kind === 'set_dataset_name') {
            return {
              ok: true,
              status: 'applied',
              dataset: { dataset_id: 'telemetry-events' },
              changedRefs: [],
              datasetId: 'telemetry-events',
            };
          }

          return { ok: true, status: 'applied', dataset: {}, changedRefs: [] };
        },
      );

    jest
      .spyOn(turnModule, 'runTurn')
      .mockImplementation(async (input, deps) => {
        const first = await deps.execute({
          kind: 'set_dataset_name',
          name: 'telemetry',
        });
        const second = await deps.execute({
          kind: 'set_dataset_type',
          datasetType: 'event',
        });

        return {
          messages: [
            { role: 'assistant', text: 'Named it telemetry.' },
            { role: 'assistant', text: 'Set the type to event.' },
          ],
          applied: [
            {
              action: { kind: 'set_dataset_name', name: 'telemetry' },
              outcome: first,
            },
            {
              action: { kind: 'set_dataset_type', datasetType: 'event' },
              outcome: second,
            },
          ],
        };
      });

    const { result } = renderAssistant();

    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.send('call it telemetry, an event dataset');

    await waitFor(() => expect(contexts).toHaveLength(2));

    // The render closure had no dataset yet, so the first action ran with
    // nothing to patch — this is today's behaviour, unaffected by the
    // overlay.
    expect(contexts[0].datasetId).toBeNull();
    // The second action ran within the *same* turn, after the first one's
    // outcome reported a fresh `datasetId` — without `turnState` this would
    // still read `null` from the render closure.
    expect(contexts[1].datasetId).toBe('telemetry-events');
  });
});
