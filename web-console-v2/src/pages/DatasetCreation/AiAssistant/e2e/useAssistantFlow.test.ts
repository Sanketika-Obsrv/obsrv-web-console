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

    const { result } = renderHook(() => useAssistant(null));

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
    const { result } = renderHook(() => useAssistant(null));

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

    const { result } = renderHook(() => useAssistant('telemetry-events'));

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
});
