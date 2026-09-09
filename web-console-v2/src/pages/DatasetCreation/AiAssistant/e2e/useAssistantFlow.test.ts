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
import { Message } from '../session/types';

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
 * The assistant drives: it opens with a question, and every answer is
 * followed by the next one. That is the whole shape of the guided flow, so it
 * is asserted on the transcript rather than on any one module.
 */
it('opens with a question and asks the next one after each answer', async () => {
  const { result } = renderHook(() => useAssistant(null));

  await waitFor(() =>
    expect(result.current.messages.map((m) => m.text)).toEqual([
      'What would you like to call this dataset?',
    ]),
  );

  await result.current.send('call it My Orders');

  await waitFor(() =>
    expect(result.current.messages.map((m) => m.text)).toEqual([
      'What would you like to call this dataset?',
      'call it My Orders',
      expect.stringContaining('My Orders'),
      'What kind of data is it?',
    ]),
  );
});

it('offers the next answer as something clickable', async () => {
  const { result } = renderHook(() => useAssistant(null));

  await waitFor(() => expect(result.current.loading).toBe(false));
  await result.current.send('call it My Orders');

  await waitFor(() =>
    expect(
      result.current.messages[result.current.messages.length - 1].card,
    ).toMatchObject({ kind: 'choice' }),
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

    // The assistant's own opening question is expected; the user's turn is
    // not, because it was never recorded and so must never have run.
    expect(result.current.messages.map((m) => m.role)).toEqual(['assistant']);
  });

  it('accepts the same instruction once ready', async () => {
    const { result } = renderHook(() => useAssistant(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.send('call it My Orders');

    await waitFor(() =>
      expect(result.current.messages.map((m) => m.role)).toContain('user'),
    );
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
    await waitFor(() =>
      expect(result.current.messages.map((m) => m.role)).toContain('user'),
    );

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

/**
 * T24's acceptance criterion: a dataset created without the user composing a
 * single instruction.
 *
 * The loop answers whatever is asked — clicking the first option of every
 * choice, resolving each conflict, dropping the sample when asked for one —
 * and stops when the agenda has nothing left. Nothing here knows the order of
 * the questions, which is the point: if a step stops being reachable by
 * answering, this fails.
 */
describe('creating a dataset by answering only', () => {
  const ROWS = [
    {
      order_id: 'A-1',
      customer_email: 'jo@example.com',
      amount: 10.5,
      order_ts: '2026-01-01T00:00:00Z',
    },
    {
      order_id: 'A-2',
      customer_email: 'sam@example.com',
      amount: 20,
      order_ts: '2026-01-02T00:00:00Z',
    },
  ];

  it('reaches a saved dataset', async () => {
    const { result } = renderHook(() => useAssistant(null));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const asked = (): Message | undefined =>
      result.current.messages[result.current.messages.length - 1];

    /** The questions answered, so a stuck agenda is reported as itself. */
    const answered: string[] = [];

    /**
     * Waits for the previous turn to finish before answering the next
     * question.
     *
     * Ordering matters more than it looks: `run` drops input while it is busy
     * — deliberately, so a double click cannot write twice — so answering too
     * early is silently ignored and the loop then waits for a turn that never
     * started. Quiet first, then answer, then wait for the transcript to
     * grow.
     */
    const quiet = () => waitFor(() => expect(result.current.busy).toBe(false));

    const grew = (before: number) =>
      waitFor(() =>
        expect(result.current.messages.length).toBeGreaterThan(before),
      );

    for (let turn = 0; turn < 25; turn += 1) {
      await quiet();

      const question = asked();
      const card = question?.card;
      const before = result.current.messages.length;

      if (!card) {
        // Only the name question expects prose.
        if (!/call this dataset/i.test(question?.text ?? '')) break;

        answered.push('name');
        await result.current.send('call it My Orders');
        await grew(before);
        continue;
      }

      if (card.kind === 'file_drop') {
        answered.push('sample');
        await result.current.attachSample(
          ROWS as unknown as Record<string, unknown>[],
          new File([JSON.stringify(ROWS)], 'orders.json', {
            type: 'application/json',
          }),
        );
      } else if (card.kind === 'choice') {
        answered.push(card.options[0].label);
        await result.current.dispatch(card.options[0].action);
      } else if (card.kind === 'conflict') {
        answered.push(`conflict:${card.path}`);
        await result.current.dispatch({
          kind: 'resolve_conflict',
          path: card.path,
          mode: 'apply',
          ...(card.candidates.find((entry) => entry.isSafest)?.dataType
            ? {
                dataType: card.candidates.find((entry) => entry.isSafest)!
                  .dataType,
              }
            : {}),
        });
      } else if (card.kind === 'confirm') {
        answered.push('save');
        await result.current.dispatch(card.confirmAction);
        break;
      } else {
        break;
      }

      await waitFor(() => expect(result.current.busy).toBe(false));
    }

    // Asserted on the joined path so a failure names the question it stopped
    // on rather than only reporting a missing status.
    expect(answered.join(' -> ')).toContain('save');

    /**
     * The real-time store is the first storage option, and it makes
     * `timestamp_key` mandatory. So reaching `save` at all proves the keys
     * question was asked *and* answered — which is the bug this flow existed
     * to fix, checked here in the flow rather than only in the agenda's unit
     * tests.
     */
    expect(answered).toContain('order_ts');
    expect(
      (
        api.dataset('my-orders')?.dataset_config as {
          keys_config?: { timestamp_key?: string };
        }
      )?.keys_config?.timestamp_key,
    ).toBe('order_ts');

    // A storage key has to be present in every event, so the wizard marks it
    // required. An assistant-built dataset that skipped this would validate
    // differently from a wizard-built one.
    expect(
      (
        api.dataset('my-orders')?.data_schema as {
          properties?: Record<string, { isRequired?: boolean }>;
        }
      )?.properties?.order_ts?.isRequired,
    ).toBe(true);

    await waitFor(() =>
      expect(api.dataset('my-orders')?.status).toBe('ReadyToPublish'),
    );
  });
});
