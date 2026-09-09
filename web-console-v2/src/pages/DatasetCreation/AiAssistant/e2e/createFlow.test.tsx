/**
 * End-to-end: the whole assistant, driven only by what a user can do.
 *
 * Only the network is faked. Every layer above it runs for real — the service
 * layer, the executor, the session store, the rule resolver, the turn loop,
 * the cards and the panes. The one seam is `services/http`, and the fake
 * behind it enforces the contracts established against the **live** API.
 *
 * This exists because of a pattern in this build: the last five real defects
 * were found by driving a browser, not by unit tests. Twice a card type was
 * useless because nothing created it; once a `useRef` mutation could not
 * refresh a `useMemo`, so the sample never reached the executor; once a step
 * never advanced. Every one of those passed its unit tests and every one is
 * the kind of thing this test catches — because it asserts on what the server
 * ended up holding, having only ever clicked and typed.
 */
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
      get: (...args: unknown[]) => holder.current!['get'](...(args as never[])),
      post: (...args: unknown[]) =>
        holder.current!['post'](...(args as never[])),
      patch: (...args: unknown[]) =>
        holder.current!['patch'](...(args as never[])),
      put: (...args: unknown[]) => holder.current!['put'](...(args as never[])),
    },
    addHttpRequestsInterceptor: () => undefined,
    responseInterceptor: (response: unknown) => response,
    errorInterceptor: () => (error: unknown) => Promise.reject(error),
  };
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fetchSystemSettings } from 'services/configData';
import * as httpModule from 'services/http';
import AiAssistantPage from '../AiAssistantPage';
import { FakeConfigApi, createFakeConfigApi } from './fakeConfigApi';

const SAMPLE_ROWS = [
  {
    order_id: 'ORD-1',
    total_amount: 12.5,
    order_ts: '2026-01-01T00:00:00Z',
    channel: 'web',
    customer: { email: 'a@example.com', customer_id: 'CUST-1' },
  },
  {
    order_id: 'ORD-1',
    total_amount: 30,
    order_ts: '2026-01-02T00:00:00Z',
    channel: 'app',
    customer: { email: 'b@example.com', customer_id: 'CUST-2' },
  },
  {
    order_id: 'ORD-2',
    total_amount: 7,
    order_ts: '2026-01-03T00:00:00Z',
    channel: 'web',
    customer: { email: 'c@example.com', customer_id: 'CUST-3' },
  },
];

/**
 * These drive the whole stack, so they are slower than a unit test. Jest's
 * default per-test budget is 5s — the same as the `asyncUtilTimeout` set in
 * `setupTests` — so a single `waitFor` could consume the entire budget and
 * the test would die before its assertion resolved.
 */
jest.setTimeout(60000);

let api: FakeConfigApi;

const useFakeApi = (options?: Parameters<typeof createFakeConfigApi>[0]) => {
  api = createFakeConfigApi(options);
  (
    httpModule as unknown as { httpHolder: { current: unknown } }
  ).httpHolder.current = api.http;
};

const renderAssistant = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={['/dataset/ai/%3Cnew%3E']}>
        <Routes>
          <Route path="/dataset/ai/:datasetId" element={<AiAssistantPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const composer = () => screen.getByRole('textbox', { name: /message/i });

/**
 * Types an instruction and waits for the turn to finish.
 *
 * Waits for the composer to be accepting input first: it is deliberately
 * disabled while the session restores, because an instruction sent before
 * then would execute without being recorded.
 */
const say = async (text: string) => {
  await waitFor(() =>
    expect(screen.queryByText(/working on that/i)).not.toBeInTheDocument(),
  );

  await userEvent.type(composer(), text);

  const send = screen.getByRole('button', { name: /send/i });
  await waitFor(() => expect(send).toBeEnabled());
  await userEvent.click(send);

  await waitFor(
    () =>
      expect(screen.queryByText(/working on that/i)).not.toBeInTheDocument(),
    { timeout: 15000 },
  );

  if (process.env.E2E_DEBUG) {
    console.log('SAID>>>', text, '=>', lastReply().slice(0, 160));
  }
};

/**
 * Supplies the sample through the paste path, as a user would.
 *
 * `user-event` is v13 here, where `paste` takes the element rather than
 * relying on focus.
 */
const pasteSample = async (rows: unknown[]) => {
  await waitFor(() =>
    expect(screen.queryByText(/working on that/i)).not.toBeInTheDocument(),
  );

  const box = screen.getByLabelText(/paste json/i);

  await userEvent.click(box);
  userEvent.paste(box, JSON.stringify(rows));
  await userEvent.click(screen.getByRole('button', { name: /use this/i }));
};

const transcript = () =>
  screen.getAllByRole('listitem').map((item) => item.textContent ?? '');

/**
 * The assistant's answer to what the user just did.
 *
 * Not the last bubble: the assistant drives, so a turn ends with the *next
 * question* and the reply sits before it. Found by position rather than by
 * wording — the reply is the first assistant bubble after the last thing the
 * user said, and anything after that is the agenda moving on.
 */
const lastReply = () => {
  const bubbles = transcript();
  const lastSaid = bubbles.reduce(
    (found, bubble, index) => (bubble.startsWith('user') ? index : found),
    -1,
  );

  return (
    bubbles
      .slice(lastSaid + 1)
      .find((bubble) => bubble.startsWith('assistant')) ??
    bubbles[bubbles.length - 1] ??
    ''
  );
};

beforeEach(async () => {
  sessionStorage.clear();
  localStorage.clear();
  useFakeApi();

  /**
   * The app fetches its system settings at startup and caches them, and
   * `STORAGE_TYPES` among them is what tells the assistant which stores this
   * cluster has. Without it, capability detection degrades to "assume
   * available" and the draft's `lakehouse_enabled: true` default gets echoed
   * to an update that rejects it. Seeding it here the way the app does keeps
   * the harness faithful to runtime rather than to an empty browser.
   */
  await fetchSystemSettings();
});

/**
 * Gets to a draft *with its vocabulary loaded*.
 *
 * Waiting only for the draft is not enough: the field list is read from the
 * server after creation, and until it arrives the resolver rightly declines
 * every field name. The preview showing a field is the user-visible signal
 * that the vocabulary is in hand.
 */
const withDraft = async () => {
  renderAssistant();
  await say('call it My Orders');
  await pasteSample(SAMPLE_ROWS);
  await waitFor(() => expect(api.dataset('my-orders')).toBeDefined(), {
    timeout: 10000,
  });

  const preview = screen.getByRole('region', { name: /dataset preview/i });
  await waitFor(
    () => expect(within(preview).getByText('order_id')).toBeInTheDocument(),
    { timeout: 10000 },
  );
};

/**
 * The flow the product exists for. Each step is a thing a user does, and the
 * assertion at the end is on what the *server* holds — not on what the UI
 * said it did.
 */
describe('creating a dataset through the conversation', () => {
  it('names the dataset, holding it until there is a draft to write to', async () => {
    renderAssistant();

    await say('call it My Orders');

    expect(lastReply()).toMatch(/My Orders/);
    // Nothing exists yet: the name has nowhere to go.
    expect(api.dataset('my-orders')).toBeUndefined();
  });

  it('creates the draft when the sample arrives', async () => {
    renderAssistant();
    await say('call it My Orders');

    await pasteSample(SAMPLE_ROWS);

    await waitFor(() => expect(api.dataset('my-orders')).toBeDefined(), {
      timeout: 10000,
    });
  });

  it('detects the schema from the sample', async () => {
    renderAssistant();
    await say('call it My Orders');
    await pasteSample(SAMPLE_ROWS);

    await waitFor(() => expect(api.dataset('my-orders')).toBeDefined(), {
      timeout: 10000,
    });

    const properties = api.dataset('my-orders')?.data_schema
      .properties as Record<string, { data_type: string }>;

    expect(Object.keys(properties).sort()).toEqual([
      'channel',
      'customer',
      'order_id',
      'order_ts',
      'total_amount',
    ]);
    expect(properties.total_amount.data_type).toBe('double');
    expect(properties.order_ts.data_type).toBe('date-time');
  });

  /**
   * The sample has to reach the executor to create anything. It lives in a
   * ref, and a memoised context could not see a ref mutation — which failed
   * with MISSING_SAMPLE and was invisible to every unit test.
   */
  it('refuses to guess when no sample has been given', async () => {
    renderAssistant();

    await say('save it');

    expect(lastReply()).not.toMatch(/^Done/);
  });
});

describe('editing the schema by instruction', () => {
  it('writes a required flag through to the stored schema', async () => {
    await withDraft();

    await say('make order_id required');

    await waitFor(() => {
      const properties = api.dataset('my-orders')?.data_schema
        .properties as Record<string, { isRequired?: boolean }>;
      expect(properties.order_id.isRequired).toBe(true);
    });
  });

  it('changes a data type', async () => {
    await withDraft();

    await say('make total_amount a string');

    await waitFor(() => {
      const properties = api.dataset('my-orders')?.data_schema
        .properties as Record<string, { data_type?: string }>;
      expect(properties.total_amount.data_type).toBe('string');
    });
  });

  /** The resolver's fuzzy match has to reach a real nested path. */
  it('resolves a nested field named loosely', async () => {
    await withDraft();

    await say('mask the email');

    await waitFor(() => {
      const transformations = api.dataset('my-orders')?.transformations_config;
      expect(transformations).toEqual([
        expect.objectContaining({ field_key: 'customer.email' }),
      ]);
    });
  });

  it('leaves the other fields byte-identical', async () => {
    await withDraft();
    const before = JSON.stringify(
      (
        api.dataset('my-orders')?.data_schema.properties as Record<
          string,
          unknown
        >
      ).channel,
    );

    await say('make order_id required');

    await waitFor(() =>
      expect(
        JSON.stringify(
          (
            api.dataset('my-orders')?.data_schema.properties as Record<
              string,
              unknown
            >
          ).channel,
        ),
      ).toBe(before),
    );
  });

  it('declines an unknown field rather than writing something', async () => {
    await withDraft();
    const before = JSON.stringify(api.dataset('my-orders')?.data_schema);

    await say('make revenue_forecast required');

    expect(lastReply()).toMatch(/could not find|unknown field/i);
    expect(JSON.stringify(api.dataset('my-orders')?.data_schema)).toBe(before);
  });

  /** Ambiguity is offered as buttons, not prose the user must retype. */
  it('offers the candidates when a field name is ambiguous', async () => {
    await withDraft();

    await say('set id to string');

    expect(lastReply()).toMatch(/which field/i);
    expect(
      screen.getByRole('button', { name: 'order_id' }),
    ).toBeInTheDocument();
  });

  it('applies the candidate that was clicked', async () => {
    await withDraft();
    await say('set id to string');

    await userEvent.click(screen.getByRole('button', { name: 'order_id' }));

    await waitFor(() => {
      const properties = api.dataset('my-orders')?.data_schema
        .properties as Record<string, { data_type?: string }>;
      expect(properties.order_id.data_type).toBe('string');
    });
  });
});

describe('processing and storage', () => {
  /**
   * Gets to a draft *with its vocabulary loaded*.
   *
   * Waiting only for the draft is not enough: the field list is read from the
   * server after creation, and until it arrives the resolver rightly declines
   * every field name. The preview showing a field is the user-visible signal
   * that the vocabulary is in hand.
   */
  const withDraft = async () => {
    renderAssistant();
    await say('call it My Orders');
    await pasteSample(SAMPLE_ROWS);
    await waitFor(() => expect(api.dataset('my-orders')).toBeDefined(), {
      timeout: 10000,
    });

    const preview = screen.getByRole('region', { name: /dataset preview/i });
    await waitFor(
      () => expect(within(preview).getByText('order_id')).toBeInTheDocument(),
      { timeout: 10000 },
    );
  };

  it('sets a dedup key and says how many rows it would drop', async () => {
    await withDraft();

    await say('dedup on order_id');

    await waitFor(() =>
      expect(api.dataset('my-orders')?.dedup_config).toMatchObject({
        drop_duplicates: true,
        dedup_key: 'order_id',
      }),
    );
    // ORD-1 appears twice in the sample, so one row would go.
    expect(lastReply()).toMatch(/1 of 3/);
  });

  /**
   * `dedup_config` is `additionalProperties: false`, so echoing the
   * server-added `dedup_period` back is rejected. The fake enforces that,
   * which is why this asserting-nothing-visible test is worth having.
   */
  it('does not echo the server-added dedup period back', async () => {
    await withDraft();

    await say('dedup on order_id');
    await waitFor(() =>
      expect(api.dataset('my-orders')?.dedup_config).toMatchObject({
        dedup_key: 'order_id',
      }),
    );

    // A rejection would have surfaced as an error turn.
    expect(lastReply()).not.toMatch(/additional properties/i);
  });

  it('enables a store the cluster has', async () => {
    await withDraft();

    await say('use the real-time store');

    await waitFor(() =>
      expect(
        api.dataset('my-orders')?.dataset_config.indexing_config,
      ).toMatchObject({ olap_store_enabled: true }),
    );
  });

  /**
   * The failure this product exists to fix: the wizard's storage step could
   * appear to save and silently do nothing.
   */
  it('explains a store the cluster does not have, and offers a retry', async () => {
    await withDraft();

    await say('enable the lakehouse');

    expect(lastReply()).toMatch(/does not have Data Lakehouse/i);
    expect(
      screen.getByRole('button', { name: /retry with the available option/i }),
    ).toBeInTheDocument();
  });

  it('applies the retry it offered', async () => {
    await withDraft();
    await say('enable the lakehouse');

    await userEvent.click(
      screen.getByRole('button', { name: /retry with the available option/i }),
    );

    await waitFor(() =>
      expect(
        api.dataset('my-orders')?.dataset_config.indexing_config,
      ).toMatchObject({ lakehouse_enabled: false, olap_store_enabled: true }),
    );
  });

  it('sets the storage keys', async () => {
    await withDraft();

    await say('partition by channel');

    await waitFor(() =>
      expect(
        api.dataset('my-orders')?.dataset_config.keys_config,
      ).toMatchObject({ partition_key: 'channel' }),
    );
  });
});

/**
 * The preview is the product's promise: it shows what the *server* holds, not
 * what the assistant believes.
 */
describe('the preview follows the server', () => {
  it('shows the fields the server detected', async () => {
    renderAssistant();
    await say('call it My Orders');
    await pasteSample(SAMPLE_ROWS);
    await waitFor(() => expect(api.dataset('my-orders')).toBeDefined(), {
      timeout: 10000,
    });

    const preview = screen.getByRole('region', { name: /dataset preview/i });

    await waitFor(() =>
      expect(within(preview).getByText('order_id')).toBeInTheDocument(),
    );
    expect(within(preview).getByText('customer.email')).toBeInTheDocument();
  });

  it('names the draft once it exists', async () => {
    renderAssistant();
    await say('call it My Orders');
    await pasteSample(SAMPLE_ROWS);

    const preview = screen.getByRole('region', { name: /dataset preview/i });

    await waitFor(
      () => expect(within(preview).getByText('my-orders')).toBeInTheDocument(),
      { timeout: 10000 },
    );
  });
});

/**
 * Reload persistence is *not* asserted here, deliberately.
 *
 * jsdom has no IndexedDB, so the session store falls back to memory — and
 * that memory belongs to the `useSession` instance, so a remount starts
 * empty. In a browser the weights of this test would be carried by
 * IndexedDB, which does survive. Asserting it here would only prove the
 * fallback behaves like a fallback.
 *
 * It is covered where it can be tested honestly: `session/useSession.test.ts`
 * shares one storage across two mounts and asserts the transcript and the
 * remembered session id survive. The browser side was checked by hand.
 */
describe('what the session records for a reload to find', () => {
  it('remembers the active session id, which is what survives a reload', async () => {
    renderAssistant();
    await say('call it My Orders');

    expect(sessionStorage.getItem('obsrv-ai-active-session')).toBeTruthy();
  });
});

describe('the whole path, ending in a saved dataset', () => {
  it('reaches ReadyToPublish having only been typed at', async () => {
    renderAssistant();

    await say('call it My Orders');
    await pasteSample(SAMPLE_ROWS);
    await waitFor(() => expect(api.dataset('my-orders')).toBeDefined(), {
      timeout: 10000,
    });

    await say('make order_id required');
    await say('dedup on order_id');
    await say('use the real-time store');
    await say('use order_ts as the timestamp');
    await say('save it');

    await waitFor(() =>
      expect(api.dataset('my-orders')?.status).toBe('ReadyToPublish'),
    );

    const dataset = api.dataset('my-orders');

    expect(dataset).toMatchObject({
      name: 'My Orders',
      type: 'event',
      dedup_config: { drop_duplicates: true, dedup_key: 'order_id' },
    });
    expect(dataset?.dataset_config.keys_config).toMatchObject({
      timestamp_key: 'order_ts',
    });
  });

  /**
   * Every write is a read-modify-write against a `version_key`. If the
   * executor ever reused a stale one, the fake would answer
   * `DATASET_OUTDATED` and the turn would fail.
   */
  it('never writes with a stale version key', async () => {
    renderAssistant();
    await say('call it My Orders');
    await pasteSample(SAMPLE_ROWS);
    await waitFor(() => expect(api.dataset('my-orders')).toBeDefined(), {
      timeout: 10000,
    });

    await say('make order_id required');
    await say('make total_amount a string');
    await say('dedup on order_id');

    const conflicted = transcript().filter((line) =>
      /outdated|changed since/i.test(line),
    );

    expect(conflicted).toEqual([]);
  });
});

/**
 * Undo, end to end, against what the server holds.
 *
 * The inverse is computed from the pre-write read and recorded on the message,
 * so these assert the whole loop: a change lands, `undo` re-PATCHes the
 * inverse, and the stored document is the one that was there before.
 */
describe('undoing a change', () => {
  const properties = () =>
    api.dataset('my-orders')?.data_schema.properties as Record<
      string,
      { data_type?: string; arrival_format?: string; isRequired?: boolean }
    >;

  /**
   * Restoring the store format is not enough on its own: `double` moved the
   * field out of the `number` bucket into `text`, and setting `double` back
   * leaves it there. Both halves of the pairing have to come back.
   */
  it('puts a data type back, including the arrival format it moved', async () => {
    await withDraft();
    await say('make total_amount a string');
    await waitFor(() =>
      expect(properties().total_amount.data_type).toBe('string'),
    );

    await say('undo that');

    await waitFor(() => {
      expect(properties().total_amount.data_type).toBe('double');
      expect(properties().total_amount.arrival_format).toBe('number');
    });
  });

  it('makes a field optional again', async () => {
    await withDraft();
    await say('make order_id required');
    await waitFor(() => expect(properties().order_id.isRequired).toBe(true));

    await say('undo');

    await waitFor(() => expect(properties().order_id.isRequired).toBe(false));
  });

  it('removes a transformation it added', async () => {
    await withDraft();
    await say('mask the email');
    await waitFor(() =>
      expect(api.dataset('my-orders')?.transformations_config).toHaveLength(1),
    );

    await say('undo');

    await waitFor(() =>
      expect(api.dataset('my-orders')?.transformations_config).toEqual([]),
    );
  });

  it('turns deduplication back off, clearing the key with it', async () => {
    await withDraft();
    await say('dedup on order_id');
    await waitFor(() =>
      expect(api.dataset('my-orders')?.dedup_config).toMatchObject({
        drop_duplicates: true,
        dedup_key: 'order_id',
      }),
    );

    await say('undo');

    await waitFor(() =>
      expect(api.dataset('my-orders')?.dedup_config).toMatchObject({
        drop_duplicates: false,
        dedup_key: '',
      }),
    );
  });

  /**
   * Undoing an undo is a redo, with no separate mechanism: the restoring
   * write computes its own inverse from the document it read, exactly as the
   * original write did.
   */
  it('redoes when the undo is itself undone', async () => {
    await withDraft();
    await say('make order_id required');
    await say('undo');
    await waitFor(() => expect(properties().order_id.isRequired).toBe(false));

    await say('undo');

    await waitFor(() => expect(properties().order_id.isRequired).toBe(true));
  });

  it('says why the sample cannot be taken back, and sends nothing', async () => {
    await withDraft();
    const before = api.dataset('my-orders')?.version_key;

    await say('undo');

    expect(lastReply()).toMatch(/sample/i);
    expect(api.dataset('my-orders')?.version_key).toBe(before);
  });

  it('has nothing to undo before anything has changed', async () => {
    renderAssistant();

    await say('undo');

    expect(lastReply()).toMatch(/nothing to undo/i);
  });
});

/**
 * The audit trail, exported the way a user exports it.
 *
 * `downloadJsonFile` is left alone and the browser's own object-URL seam is
 * captured instead, so what is asserted is the actual bytes the file would
 * contain — not an intermediate object a mocked writer was handed.
 */
describe('exporting the action trail', () => {
  const captureDownload = () => {
    const blobs: Blob[] = [];

    // jsdom implements neither, so these are the seam rather than a stub of
    // our own code.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = (
      blob: Blob,
    ) => {
      blobs.push(blob);
      return 'blob:trail';
    };
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = () =>
      undefined;

    return async () => {
      const blob = blobs[blobs.length - 1];
      expect(blob).toBeDefined();

      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(blob);
      });

      return JSON.parse(text);
    };
  };

  it('writes every action the conversation took', async () => {
    const read = captureDownload();
    await withDraft();
    await say('make order_id required');
    await say('dedup on order_id');

    await userEvent.click(
      screen.getByRole('button', { name: /export the action trail/i }),
    );

    const trail = await read();

    expect(trail.session.datasetId).toBe('my-orders');
    expect(
      trail.entries
        .filter((entry: { action?: { kind: string } }) => entry.action)
        .map((entry: { action: { kind: string } }) => entry.action.kind),
    ).toEqual([
      // Held client-side until there was a draft, and recorded either way.
      'set_dataset_name',
      'attach_sample',
      'toggle_required',
      'set_dedup',
    ]);
    expect(trail.summary.changes).toBe(4);
  });

  it('records an undo as part of the trail, and marks what it undid', async () => {
    const read = captureDownload();
    await withDraft();
    await say('make order_id required');
    await say('undo');

    await userEvent.click(
      screen.getByRole('button', { name: /export the action trail/i }),
    );

    const trail = await read();
    const changes = trail.entries.filter(
      (entry: { action?: unknown }) => entry.action,
    );

    expect(
      changes.map((entry: { action: { kind: string } }) => entry.action.kind),
    ).toEqual([
      'set_dataset_name',
      'attach_sample',
      'toggle_required',
      'toggle_required',
    ]);
    expect(changes[2].undone).toBe(true);
    expect(changes[3].undone).toBeUndefined();
  });

  it('leaves the sample rows out of the file', async () => {
    const read = captureDownload();
    await withDraft();
    await say('make order_id required');

    await userEvent.click(
      screen.getByRole('button', { name: /export the action trail/i }),
    );

    expect(JSON.stringify(await read())).not.toContain('a@example.com');
  });
});
