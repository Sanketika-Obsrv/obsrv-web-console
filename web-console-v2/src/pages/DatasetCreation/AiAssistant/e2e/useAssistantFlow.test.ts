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

/**
 * The model is mandatory in the real app, and jsdom has no WebGPU — so
 * without these overrides `useAssistant` never wires up `resolve`/`route`
 * at all, which is exactly the gap this file's "the model is shown the real
 * facts" tests exist to close. The default script mirrors the one
 * `e2e/createFlow.test.tsx` already uses: `{"intent":"request"}` satisfies
 * the router's own schema and names no step, so `handleRouted` falls every
 * turn straight through to the rules — which is why every *other* test in
 * this file keeps working unchanged with the model wired in. Individual
 * tests override `engineHolder.current` to script a real reply instead.
 */
jest.mock('../model/tiers', () => ({
  ...jest.requireActual('../model/tiers'),
  detectCapability: async () => ({ tier: 2, hasWebGPU: true }),
}));

jest.mock('../model/engineClient', () => {
  const holder: {
    current: (prompt: string, format?: unknown) => Promise<string>;
  } = {
    current: async () => '{"intent":"request"}',
  };

  return {
    __esModule: true,
    get engineHolder() {
      return holder;
    },
    ...jest.requireActual('../model/engineClient'),
    isModelCached: async () => true,
    removeModel: async () => undefined,
    loadEngine: async () => ({
      complete: (prompt: string, format?: unknown) =>
        holder.current(prompt, format),
      unload: async () => undefined,
    }),
  };
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, ReactNode } from 'react';
import { fetchSystemSettings } from 'services/configData';
import * as httpModule from 'services/http';
import * as engineClientModule from '../model/engineClient';
import { AssistantApi, useAssistant } from '../useAssistant';
import { createFakeConfigApi } from './fakeConfigApi';
import { pathFromRef } from '../engine/previewFocus';
import { DataSchema, unresolvedConflicts } from '../engine/schemaEditor';
import { timestampCandidates } from '../engine/schemaSuggestions';
import { Message } from '../session/types';

/** The holder `../model/engineClient`'s mock exposes, typed for test use. */
const engineHolder = (
  engineClientModule as unknown as {
    engineHolder: {
      current: (prompt: string, format?: unknown) => Promise<string>;
    };
  }
).engineHolder;

/**
 * Replies with `routerReply` to the router's own call and `extractionReply`
 * to the extracting call that follows it — the same way `model/router.ts`'s
 * fixed, five-way schema tells the two calls apart in `modelResolver.test.ts`:
 * the router's schema alone has an `intent` property.
 */
const scriptModel = (
  routerReply: string,
  extractionReply?: string,
): { calls: { prompt: string; schema?: string }[] } => {
  const calls: { prompt: string; schema?: string }[] = [];

  engineHolder.current = async (prompt, format) => {
    const schema = (format as { schema?: string } | undefined)?.schema;
    calls.push({ prompt, schema });

    return schema?.includes('"intent"')
      ? routerReply
      : (extractionReply ?? '{}');
  };

  return { calls };
};

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

  // Reset to the same falls-through-to-the-rules script every other test in
  // this file relies on; a test that needs the model to say something in
  // particular scripts its own via `scriptModel`.
  engineHolder.current = async () => '{"intent":"request"}';

  // As the app does at startup; `STORAGE_TYPES` drives capability detection.
  await fetchSystemSettings();
});

/**
 * The assistant drives: it opens with a question, and every answer is
 * followed by the next one. That is the whole shape of the guided flow, so it
 * is asserted on the transcript rather than on any one module.
 */
it('opens with a question and asks the next one after each answer', async () => {
  const { result } = renderAssistant();

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
  const { result } = renderAssistant();

  await waitFor(() => expect(result.current.loading).toBe(false));
  await result.current.send('call it My Orders');

  await waitFor(() =>
    expect(
      result.current.messages[result.current.messages.length - 1].card,
    ).toMatchObject({ kind: 'choice' }),
  );
});

/**
 * The bug this test exists to catch: the user's own words used to be built
 * *inside* `runTurn` and were only written to the session once the whole
 * turn — model inference, then every server round trip — had resolved. The
 * text vanished from the composer and reappeared several seconds later.
 * `useAssistant` now appends the echo itself, ahead of the request, so it
 * must already be on screen while a turn is still in flight. The `dataset/
 * exists` GET that `set_dataset_name` triggers is held open with a deferred
 * promise to give a window in which "still in flight" can be observed.
 */
it("keeps the user's own message in the transcript while the turn is still running", async () => {
  const { result } = renderAssistant();

  await waitFor(() => expect(result.current.loading).toBe(false));

  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const real = api.http;
  (
    httpModule as unknown as { httpHolder: { current: unknown } }
  ).httpHolder.current = {
    ...real,
    get: async (url: string) => {
      if (url.includes('/api/dataset/exists/')) await gate;
      return real.get(url);
    },
  };

  const sent = result.current.send('call it My Orders');

  await waitFor(() =>
    expect(result.current.messages.map((m) => m.text)).toContain(
      'call it My Orders',
    ),
  );
  // Still mid-turn: the gated GET has not been released yet.
  expect(result.current.busy).toBe(true);

  release();
  await sent;

  await waitFor(() => expect(result.current.busy).toBe(false));
});

/**
 * Found by the end-to-end test: an instruction sent while the session was
 * still loading reached the API but had its turns dropped, because
 * `useSession.apply` no-ops before the session exists. The action ran with no
 * record of it — and the transcript is the audit trail.
 */
describe('before the session is ready', () => {
  it('reports itself busy while restoring', () => {
    const { result } = renderAssistant();

    expect(result.current.loading).toBe(true);
    expect(result.current.busy).toBe(true);
  });

  it('executes nothing that it could not record', async () => {
    const { result } = renderAssistant();

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
    const { result } = renderAssistant();

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
    const { result } = renderAssistant();

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
    const { result } = renderAssistant();

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
 * The denormalisation sub-flow, which is the only question that takes three
 * answers. It is tested end to end because the three are carried in the
 * *transcript* rather than in session state, so nothing but a real
 * conversation proves they survive the round trip.
 */
describe('joining to a master dataset', () => {
  const ROWS = [{ order_id: 'A-1', amount: 10.5 }];

  it('collects the field, the master and the output field, then writes once', async () => {
    api = createFakeConfigApi({
      masters: [{ dataset_id: 'customers', name: 'Customers' }],
    });
    (
      httpModule as unknown as { httpHolder: { current: unknown } }
    ).httpHolder.current = api.http;

    const { result } = renderAssistant();

    await waitFor(() => expect(result.current.loading).toBe(false));

    const quiet = () => waitFor(() => expect(result.current.busy).toBe(false));
    const asked = () =>
      result.current.messages[result.current.messages.length - 1] as
        Message | undefined;

    /**
     * Answers, then waits for the transcript to grow.
     *
     * Waiting on `busy` alone is not enough here: `send` already awaited the
     * whole turn, so `busy` is false before React has committed anything, and
     * the next answer would be read against the question before last.
     */
    const answer = async (said: string) => {
      const before = result.current.messages.length;

      await result.current.send(said);
      await waitFor(() =>
        expect(result.current.messages.length).toBeGreaterThan(before),
      );
      await quiet();
    };

    await answer('call it My Orders');
    await answer('Event');

    await result.current.attachSample(
      ROWS as unknown as Record<string, unknown>[],
      new File([JSON.stringify(ROWS)], 'orders.json', {
        type: 'application/json',
      }),
    );
    await waitFor(() => expect(result.current.datasetId).toBe('my-orders'));
    await quiet();

    // Walk to the denormalisation question by declining what can be declined.
    for (let turn = 0; turn < 8; turn += 1) {
      const card = asked()?.card;
      if (card?.kind !== 'choice') break;
      if (card.options.some((option) => option.label === 'Customers')) break;

      // Declining where declining is offered, and taking the first option
      // where it is not — the validation question has no way out.
      const move =
        card.options.find((option) => option.action.kind === 'skip_step') ??
        card.options[0];

      const before = result.current.messages.length;
      await result.current.dispatch(move.action);
      await waitFor(() =>
        expect(result.current.messages.length).toBeGreaterThan(before),
      );
      await quiet();
    }

    expect(asked()?.text).toContain('Customers');

    await answer('Customers');
    expect(asked()?.text).toMatch(/which field in your data/i);

    await answer('order_id');
    expect(asked()?.text).toMatch(
      /what should the Customers record be called/i,
    );

    // Nothing has been written yet: the API takes all three together.
    expect(
      (api.dataset('my-orders')?.denorm_config as { denorm_fields?: unknown[] })
        ?.denorm_fields ?? [],
    ).toHaveLength(0);

    await answer('customer_details');

    // A prose reply is a proposal now, not a write — nothing is sent until
    // it is confirmed, the same as any other guess.
    expect(asked()?.card).toMatchObject({ kind: 'confirm' });
    expect(
      (api.dataset('my-orders')?.denorm_config as { denorm_fields?: unknown[] })
        ?.denorm_fields ?? [],
    ).toHaveLength(0);

    await answer('yes');

    expect(
      (
        api.dataset('my-orders')?.denorm_config as {
          denorm_fields?: Record<string, string>[];
        }
      )?.denorm_fields,
    ).toEqual([
      {
        denorm_key: 'order_id',
        denorm_out_field: 'customer_details',
        dataset_id: 'customers',
      },
    ]);

    // And the conversation moves on rather than asking for another join.
    expect(asked()?.text).not.toMatch(/master dataset/i);
  });

  type Hook = { current: AssistantApi };

  /** Name it, call it an event dataset, hand over the sample. */
  const beginOrders = async (result: Hook) => {
    const quiet = () => waitFor(() => expect(result.current.busy).toBe(false));

    const answer = async (said: string) => {
      const before = result.current.messages.length;
      await result.current.send(said);
      await waitFor(() =>
        expect(result.current.messages.length).toBeGreaterThan(before),
      );
      await quiet();
    };

    await answer('call it My Orders');
    await answer('Event');

    await result.current.attachSample(
      ROWS as unknown as Record<string, unknown>[],
      new File([JSON.stringify(ROWS)], 'orders.json', {
        type: 'application/json',
      }),
    );
    await waitFor(() => expect(result.current.datasetId).toBe('my-orders'));
    await quiet();
  };

  /**
   * Declines whatever can be declined until the question matches, taking the
   * first option where there is no way out.
   */
  const declineUntil = async (
    result: Hook,
    matches: (text: string) => boolean,
  ) => {
    const quiet = () => waitFor(() => expect(result.current.busy).toBe(false));
    const last = () =>
      result.current.messages[result.current.messages.length - 1] as
        Message | undefined;

    for (let turn = 0; turn < 10; turn += 1) {
      if (matches(last()?.text ?? '')) break;

      const card = last()?.card;
      if (card?.kind !== 'choice') break;

      const move =
        card.options.find((option) => option.action.kind === 'skip_step') ??
        card.options[0];

      const before = result.current.messages.length;
      await result.current.dispatch(move.action);
      await waitFor(() =>
        expect(result.current.messages.length).toBeGreaterThan(before),
      );
      await quiet();
    }

    return last();
  };

  const listCalls = () =>
    api.calls.filter((call) => call.url.includes('datasets/list')).length;

  /**
   * The assistant does not publish, so a master becomes Live somewhere else
   * — the wizard's preview, then the dataset list — while this conversation
   * sits open. Listed only on mount, that master stayed invisible and the
   * join offer named everything except the dataset just made for it.
   */
  it('offers a master that went live after the conversation started', async () => {
    const { result } = renderAssistant();

    await waitFor(() => expect(result.current.loading).toBe(false));
    await beginOrders(result);

    api.publishMaster({ dataset_id: 'customers', name: 'Customers' });

    const before = listCalls();
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(listCalls()).toBeGreaterThan(before));

    const question = await declineUntil(result, (text) =>
      /Customers/.test(text),
    );

    expect(question?.text).toContain('Customers');
  });

  it('keeps the masters it has when a later listing fails', async () => {
    api = createFakeConfigApi({
      masters: [{ dataset_id: 'customers', name: 'Customers' }],
    });
    const holder = (
      httpModule as unknown as { httpHolder: { current: unknown } }
    ).httpHolder;
    holder.current = api.http;

    const { result } = renderAssistant();

    await waitFor(() => expect(result.current.loading).toBe(false));
    await beginOrders(result);

    // Everything keeps working except listing, which is the failure that
    // must not be read as "the cluster has no master datasets".
    let refused = 0;
    holder.current = {
      ...api.http,
      post: async (url: string, body?: Record<string, unknown>) => {
        if (url.includes('datasets/list')) {
          refused += 1;
          throw new Error('gateway timed out');
        }
        return api.http.post(url, body);
      },
    };

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(refused).toBeGreaterThan(0));

    const question = await declineUntil(result, (text) =>
      /Customers/.test(text),
    );

    expect(question?.text).toContain('Customers');
  });
});

/**
 * T24's acceptance criterion, restated for a surface with nothing to click:
 * a dataset created by typing alone.
 *
 * The loop answers whatever is asked — the label of an option, the name of a
 * type, "yes" — and hands over a file only for the sample, which cannot be
 * typed. Nothing here knows the order of the questions, which is the point:
 * if a step stops being reachable by answering, this fails. There used to be
 * a second walk that clicked its way through instead; there is nothing left
 * to click, so the typed walk is the only one.
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

  it('reaches a saved dataset when every answer is typed', async () => {
    const { result } = renderAssistant();

    await waitFor(() => expect(result.current.loading).toBe(false));

    /**
     * Waits for the previous turn to finish before answering the next
     * question.
     *
     * Ordering matters more than it looks: `run` drops input while it is
     * busy — deliberately, so two writes cannot race — so answering too
     * early is silently ignored and the loop then waits for a turn that
     * never started. Quiet first, then answer, then wait for the transcript
     * to grow.
     */
    const quiet = () => waitFor(() => expect(result.current.busy).toBe(false));
    const grew = (before: number) =>
      waitFor(() =>
        expect(result.current.messages.length).toBeGreaterThan(before),
      );

    const typed: string[] = [];

    for (let turn = 0; turn < 25; turn += 1) {
      await quiet();

      const question = result.current.messages[
        result.current.messages.length - 1
      ] as Message | undefined;
      const card = question?.card;
      const before = result.current.messages.length;

      // The sample question carries no card any more: a sample is dropped on
      // the pane or pasted into the box, and either way it is offered for
      // confirmation before it is used.
      if (!card && /sample of the data/i.test(question?.text ?? '')) {
        await result.current.offerSample(
          new File([JSON.stringify(ROWS)], 'orders.json', {
            type: 'application/json',
          }),
        );
        await quiet();
        continue;
      }

      const say =
        card?.kind === 'choice'
          ? card.options[0].label
          : card?.kind === 'conflict'
            ? (card.candidates.find((entry) => entry.isSafest)?.dataType ??
              card.candidates[0].dataType)
            : card?.kind === 'confirm'
              ? 'yes'
              : /call this dataset/i.test(question?.text ?? '')
                ? 'call it My Orders'
                : undefined;

      if (!say) break;

      /**
       * A question that comes back after being answered is a stuck agenda,
       * and spinning through the turn budget hides which question it was.
       * "yes" is exempt: it answers both the sample offer and the save.
       */
      if (say !== 'yes' && typed.filter((said) => said === say).length >= 2) {
        throw new Error(`The same question was asked three times: ${say}`);
      }

      typed.push(say);
      await result.current.send(say);
      await grew(before);

      if (card?.kind === 'confirm' && card.confirmAction.kind === 'save') {
        break;
      }
    }

    expect(typed.join(' -> ')).toContain('yes');

    /**
     * The real-time store is the first storage option, and it makes
     * `timestamp_key` mandatory. So reaching the save at all proves the keys
     * question was asked *and* answered — the bug this flow existed to fix.
     */
    expect(typed).toContain('order_ts');
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

    /**
     * The closing check writes nothing: publishing is the dataset list's job
     * and the wizard's, not the conversation's. So the draft stays a draft,
     * and the last word says where to publish it.
     */
    expect(api.dataset('my-orders')?.status).toBe('Draft');
    expect(
      result.current.messages.map((message) => message.text).join(' | '),
    ).toMatch(/publish it from the dataset list/i);

    /**
     * Two confirmations, and no more: the sample offer and the closing
     * check. A third would mean a typed answer fell through to the resolver
     * and came back as "I think you mean".
     */
    expect(
      result.current.messages.filter(
        (message) => message.card?.kind === 'confirm',
      ),
    ).toHaveLength(2);
  });
});

/**
 * Opening a dataset the conversation did not build.
 *
 * The assistant was create-only: every question that the document cannot
 * honestly answer — storage, validation, dedup, the timestamp key — was
 * settled from the transcript, because `create` writes defaults nobody
 * chose. An existing dataset has no transcript, so it was walked from "what
 * would you like to call this dataset?" through all fourteen questions
 * again. Now the document is the record, and the conversation starts from
 * what is actually there.
 */
describe('opening a dataset that already exists', () => {
  const CONFIGURED = {
    dataset_id: 'telemetry-events',
    name: 'Telemetry Events',
    type: 'event',
    status: 'Live',
    data_schema: {
      type: 'object',
      properties: {
        device_id: {
          type: 'string',
          data_type: 'string',
          arrival_format: 'text',
        },
        reading: {
          type: 'number',
          data_type: 'double',
          arrival_format: 'number',
        },
        recorded_at: {
          type: 'string',
          data_type: 'date-time',
          arrival_format: 'text',
        },
      },
    },
    dedup_config: { drop_duplicates: true, dedup_key: 'device_id' },
    validation_config: { validate: true, mode: 'Strict' },
    dataset_config: {
      indexing_config: { olap_store_enabled: true },
      keys_config: { timestamp_key: 'recorded_at' },
    },
  };

  const openIt = async () => {
    api = createFakeConfigApi({ seeded: [CONFIGURED] });
    (
      httpModule as unknown as { httpHolder: { current: unknown } }
    ).httpHolder.current = api.http;

    const { result } = renderAssistant('telemetry-events');

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() =>
      expect(result.current.messages.length).toBeGreaterThan(1),
    );
    // The opening turn has to finish before anything is sent: `run` drops
    // input while it is busy, deliberately, so two writes cannot race.
    await waitFor(() => expect(result.current.busy).toBe(false));

    return result;
  };

  const said = (result: { current: { messages: Message[] } }) =>
    result.current.messages.map((message) => message.text).join(' | ');

  it('reads the dataset back instead of starting over', async () => {
    const result = await openIt();

    expect(said(result)).toMatch(/Telemetry Events/);
    expect(said(result)).not.toMatch(/call this dataset/i);
  });

  it('asks what to change, since the document answers the rest', async () => {
    const result = await openIt();

    expect(said(result)).toMatch(/what would you like to change/i);
  });

  it('says a live dataset is edited through a draft', async () => {
    const result = await openIt();

    expect(said(result)).toMatch(/draft/i);
    expect(said(result)).toMatch(/republish|publish/i);
  });

  it('acts on an instruction about it', async () => {
    const result = await openIt();

    await result.current.send('make device_id required');

    await waitFor(() =>
      expect(
        (
          api.dataset('telemetry-events')?.data_schema as {
            properties?: Record<string, { isRequired?: boolean }>;
          }
        )?.properties?.device_id?.isRequired,
      ).toBe(true),
    );
  });

  it('never publishes it', async () => {
    const result = await openIt();
    const before = result.current.messages.length;

    await result.current.send('save it');

    await waitFor(() =>
      expect(result.current.messages.length).toBeGreaterThan(before),
    );
    await waitFor(() => expect(result.current.busy).toBe(false));

    expect(said(result)).toMatch(/publish it from the dataset list/i);
    expect(api.dataset('telemetry-events')?.status).toBe('Live');
  });

  /**
   * The gap this file exists to close: `resolveWithModel`/`resolveTurn` have
   * accepted a `facts` field since `datasetFacts` was built, but nothing in
   * the live app ever supplied one — so the model was never actually shown
   * what the document holds, only the question and the words typed at it.
   * Scripting the router to name the `name` step forces the second,
   * extracting call `model/modelResolver.ts` makes through `buildPrompt`,
   * whose `factsLine` is the one place the dataset's own name and id are
   * rendered into the prompt text — so finding them here is direct evidence
   * `useAssistant` is threading `facts` all the way through, not merely
   * constructing them and leaving them unused.
   */
  it('shows the model the dataset it is actually looking at, not just the question', async () => {
    const result = await openIt();

    const { calls } = scriptModel(
      JSON.stringify({ intent: 'request', step: 'name' }),
    );

    await result.current.send('why is the id still the old one?');
    await waitFor(() => expect(result.current.busy).toBe(false));

    const extractionCalls = calls.filter(
      (call) => !call.schema?.includes('"intent"'),
    );

    expect(extractionCalls.length).toBeGreaterThan(0);
    expect(extractionCalls[0].prompt).toContain('Telemetry Events');
    expect(extractionCalls[0].prompt).toContain('telemetry-events');
  });

  /**
   * The same gap, one call earlier: the router (call A) generates its own
   * `ask`/`other` `reply` in the very call that classifies intent, but
   * `resolveTurn` never passed `facts` into `buildRouterPrompt` at all — only
   * the extraction call (the test above) ever saw them. Live testing found
   * the router answering a question about the dataset id with a fabricated
   * value on a brand-new, empty draft; here the draft is real, so the fix is
   * proved by finding the same facts in the router's own prompt, not just
   * the extractor's.
   */
  it('shows the router itself the dataset it is actually looking at, not just the extractor', async () => {
    const result = await openIt();

    const { calls } = scriptModel(
      JSON.stringify({ intent: 'ask', reply: 'It is telemetry-events.' }),
    );

    await result.current.send('what is the dataset id right now?');
    await waitFor(() => expect(result.current.busy).toBe(false));

    const routerCalls = calls.filter((call) =>
      call.schema?.includes('"intent"'),
    );

    expect(routerCalls.length).toBeGreaterThan(0);
    expect(routerCalls[0].prompt).toContain('Telemetry Events');
    expect(routerCalls[0].prompt).toContain('telemetry-events');
  });

  /**
   * `alreadySatisfied` has been unit-tested since it was built, but nothing
   * exercised it live: `facts` never reached `resolveWithModel` before this
   * commit, so the drop it performs was structurally unreachable from the
   * real hook. Renaming to the name already on the document is the case
   * `datasetFacts.ts` itself names as the reason `alreadySatisfied` exists.
   *
   * Both the router's own extraction call and the plain `resolve` fallback
   * `runTurn` falls back to when the router extracts nothing are scripted to
   * answer the same way here, since either could be the one carrying the
   * no-op through to `alreadySatisfied` — the point being tested is that
   * whichever one runs, the document is checked before anything is proposed.
   */
  it('drops a rename to the name the document already holds, without proposing it', async () => {
    const result = await openIt();

    scriptModel(
      JSON.stringify({ intent: 'request', step: 'name' }),
      '{"kind":"set_dataset_name","name":"Telemetry Events"}',
    );

    const before = result.current.messages.length;
    await result.current.send('call it Telemetry Events');

    await waitFor(() =>
      expect(result.current.messages.length).toBeGreaterThan(before),
    );
    await waitFor(() => expect(result.current.busy).toBe(false));

    const last = result.current.messages[result.current.messages.length - 1];

    expect(last.card?.kind).not.toBe('confirm');
    expect(api.calls.filter((call) => call.method === 'PATCH')).toEqual([]);
    expect(api.dataset('telemetry-events')?.name).toBe('Telemetry Events');
  });
});
