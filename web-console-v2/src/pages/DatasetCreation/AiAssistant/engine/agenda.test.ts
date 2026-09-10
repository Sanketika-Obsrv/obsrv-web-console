import { Action } from './actions';
import { ACCEPTS, AgendaState, currentStep, nextPrompt } from './agenda';
import { DatasetSnapshot } from './executor';
import { Message } from '../session/types';

/** A transcript entry for an action that went through. */
const applied = (action: Action, index = 0): Message => ({
  id: `msg-${index}`,
  role: 'assistant',
  text: 'done',
  createdAt: 1_000 + index,
  action,
});

const rejected = (action: Action, index = 0): Message => ({
  ...applied(action, index),
  failureCode: 'PATCH_FAILED',
});

const schemaWith = (
  properties: Record<string, Record<string, unknown>>,
): Record<string, unknown> => ({ type: 'object', properties });

const plainSchema = schemaWith({
  order_id: { type: 'string', data_type: 'string', arrival_format: 'text' },
  amount: { type: 'number', data_type: 'double', arrival_format: 'number' },
});

const conflictedSchema = schemaWith({
  order_id: { type: 'string', data_type: 'string', arrival_format: 'text' },
  amount: {
    type: 'number',
    data_type: 'double',
    arrival_format: 'number',
    oneof: [{ type: 'double' }, { type: 'string' }],
    suggestions: [
      {
        resolutionType: 'DATA_TYPE',
        severity: 'MUST-FIX',
        message: 'double: 108 time(s), string: 12 time(s)',
      },
    ],
  },
});

/** A draft that has answered everything up to the PII question. */
const draft = (over: Partial<DatasetSnapshot> = {}): DatasetSnapshot => ({
  dataset_id: 'my_orders',
  name: 'My Orders',
  type: 'event',
  status: 'Draft',
  version_key: 'vk-1',
  data_schema: plainSchema,
  ...over,
});

/** A schema carrying the LOW hints the live API attaches. */
const hintedSchema = schemaWith({
  order_id: { type: 'string', data_type: 'string', arrival_format: 'text' },
  customer_email: {
    type: 'string',
    data_type: 'string',
    arrival_format: 'text',
    suggestions: [
      {
        message:
          "The Property 'customer_email' appears to be 'email' format type.",
        advice: 'Suggest to Mask the Personal Information',
        resolutionType: 'TRANSFORMATION',
        severity: 'LOW',
      },
    ],
  },
  order_ts: {
    type: 'string',
    data_type: 'date-time',
    arrival_format: 'text',
    suggestions: [
      {
        message:
          "The Property 'order_ts' appears to be 'date-time' format type.",
        advice: 'The System can index all data on this column',
        resolutionType: 'INDEX',
        severity: 'LOW',
      },
    ],
  },
});

/** Everything answered up to the step under test. */
const answeredThrough = (...steps: string[]): Message[] =>
  steps.map((step, index) =>
    applied({ kind: 'skip_step', step } as Action, index),
  );

const rows = [
  { order_id: 'A-1', amount: 10 },
  { order_id: 'A-2', amount: 10 },
];

describe('currentStep', () => {
  it('asks for the name when nothing is known', () => {
    expect(currentStep({})).toBe('name');
  });

  it('asks for the type once a name is pending', () => {
    expect(currentStep({ pending: { name: 'My Orders' } })).toBe('type');
  });

  it('asks for a sample once the name and type are known', () => {
    const state: AgendaState = {
      pending: { name: 'My Orders', datasetType: 'event' },
    };

    expect(currentStep(state)).toBe('sample');
  });

  it('asks about the connector before the sample once one is chosen', () => {
    const state: AgendaState = {
      pending: { name: 'My Orders', datasetType: 'event' },
      connector: { id: 'postgres-connector-1.0.0', configured: false },
    };

    expect(currentStep(state)).toBe('connector');
  });

  it('returns to the sample once the connector is configured', () => {
    const state: AgendaState = {
      pending: { name: 'My Orders', datasetType: 'event' },
      connector: { id: 'postgres-connector-1.0.0', configured: true },
    };

    expect(currentStep(state)).toBe('sample');
  });

  it('asks about a type conflict before PII', () => {
    const state: AgendaState = {
      dataset: draft({ data_schema: conflictedSchema }),
      piiSuggested: ['order_id'],
    };

    expect(currentStep(state)).toBe('conflicts');
  });

  it('asks about PII once the schema has been reviewed', () => {
    const state: AgendaState = {
      dataset: draft(),
      piiSuggested: ['order_id'],
      history: answeredThrough('schema'),
    };

    expect(currentStep(state)).toBe('pii');
  });

  it('moves on to validation when there is nothing to mask', () => {
    expect(
      currentStep({
        dataset: draft(),
        piiSuggested: [],
        history: answeredThrough('schema'),
      }),
    ).toBe('validation');
  });

  it('reviews the schema before asking about anything in it', () => {
    // The conflicts are settled, so the next thing is the schema itself —
    // not a processing question about fields the user has not seen yet.
    expect(currentStep({ dataset: draft() })).toBe('schema');
  });

  it('asks about storage after dedup', () => {
    const state: AgendaState = {
      dataset: draft(),
      piiSuggested: [],
      history: [
        ...answeredThrough('schema', 'validation', 'transform'),
        applied({ kind: 'set_dedup', enabled: false }, 9),
      ],
    };

    expect(currentStep(state)).toBe('storage');
  });

  it('asks for a save last, once the keys the stores need are set', () => {
    const state: AgendaState = {
      dataset: draft({
        dataset_config: {
          indexing_config: { olap_store_enabled: true },
          keys_config: { timestamp_key: 'order_ts' },
        },
      }),
      piiSuggested: [],
      history: [
        ...answeredThrough('schema', 'validation', 'transform'),
        applied({ kind: 'set_dedup', enabled: false }, 9),
        applied({ kind: 'set_storage', realtime: true }, 10),
      ],
    };

    expect(currentStep(state)).toBe('review');
  });

  it('is done once the dataset is no longer a draft', () => {
    const state: AgendaState = {
      dataset: draft({ status: 'ReadyToPublish' }),
      piiSuggested: [],
      history: [
        ...answeredThrough('schema', 'validation', 'transform'),
        applied({ kind: 'set_dedup', enabled: false }, 9),
        applied({ kind: 'set_storage', realtime: true }, 10),
      ],
    };

    expect(currentStep(state)).toBeUndefined();
    expect(nextPrompt(state)).toBeUndefined();
  });
});

describe('resuming from the server', () => {
  it('resumes at the conflicts from the document alone, with no transcript', () => {
    // The whole point of deriving `pending` from the snapshot: a reload has no
    // transcript to replay and must still land on the right question.
    expect(
      currentStep({ dataset: draft({ data_schema: conflictedSchema }) }),
    ).toBe('conflicts');
  });

  it('counts a name held by the server, not only a pending one', () => {
    expect(currentStep({ dataset: draft() })).not.toBe('name');
  });

  it('resumes mid-agenda from the transcript the session already holds', () => {
    // The offers have no server representation, so this is the half that the
    // conversation answers rather than the document.
    expect(
      currentStep({
        dataset: draft(),
        piiSuggested: [],
        history: answeredThrough('schema', 'validation', 'transform'),
      }),
    ).toBe('dedup');
  });

  it('asks for a sample when the draft exists but has no schema', () => {
    const state: AgendaState = {
      dataset: draft({ data_schema: undefined }),
    };

    expect(currentStep(state)).toBe('sample');
  });
});

describe('answers recorded in the transcript', () => {
  const base: AgendaState = { dataset: draft(), piiSuggested: [] };
  const offers = answeredThrough('schema', 'validation', 'transform');

  it('does not ask a skipped dedup question again', () => {
    const state: AgendaState = {
      ...base,
      history: [...offers, applied({ kind: 'skip_step', step: 'dedup' }, 9)],
    };

    expect(currentStep(state)).toBe('storage');
  });

  it('does not count a rejected answer', () => {
    // A set_storage that the API refused left storage unset, so the question
    // is still open. Counting the attempt would silently drop it.
    const state: AgendaState = {
      ...base,
      history: [
        ...offers,
        applied({ kind: 'skip_step', step: 'dedup' }, 9),
        rejected({ kind: 'set_storage', lakehouse: true }, 10),
      ],
    };

    expect(currentStep(state)).toBe('storage');
  });

  it('counts an enabled dedup config, which the document does record', () => {
    const state: AgendaState = {
      ...base,
      history: offers,
      dataset: draft({
        dedup_config: { drop_duplicates: true, dedup_key: 'order_id' },
      }),
    };

    expect(currentStep(state)).toBe('storage');
  });

  it('treats a per-field PII skip as silencing only that field', () => {
    const state: AgendaState = {
      dataset: draft(),
      piiSuggested: ['order_id', 'amount'],
      history: [
        ...answeredThrough('schema'),
        applied({ kind: 'skip_step', step: 'pii', path: 'order_id' }, 9),
      ],
    };

    expect(nextPrompt(state)?.text).toContain('amount');
  });

  it('moves on once every suggested field has been decided', () => {
    const state: AgendaState = {
      dataset: draft(),
      piiSuggested: ['order_id', 'amount'],
      history: [
        ...answeredThrough('schema'),
        applied({ kind: 'skip_step', step: 'pii', path: 'order_id' }, 9),
        applied(
          {
            kind: 'set_pii',
            path: 'amount',
            action: 'mask',
            skipOnFailure: true,
          },
          10,
        ),
      ],
    };

    expect(currentStep(state)).toBe('validation');
  });
});

describe('the name question', () => {
  it('opens with a question, not a hint', () => {
    const prompt = nextPrompt({});

    expect(prompt?.step).toBe('name');
    expect(prompt?.text).toMatch(/\?$/);
  });

  it('offers an alternative after the id was taken', () => {
    const prompt = nextPrompt({
      pending: {},
      lastName: 'My Orders',
      lastFailureCode: 'DATASET_ID_TAKEN',
    });

    expect(prompt?.chips).toContain('My Orders 2');
  });

  it('does not repeat the sentence the executor already said', () => {
    // The failure narration is its own message; saying "already exists" twice
    // reads as though the second name was rejected too.
    const prompt = nextPrompt({
      pending: {},
      lastName: 'My Orders',
      lastFailureCode: 'DATASET_ID_TAKEN',
    });

    expect(prompt?.text).not.toMatch(/already exists/i);
  });

  it('asks again after an unrelated failure without inventing an alternative', () => {
    const prompt = nextPrompt({
      pending: {},
      lastName: 'My Orders',
      lastFailureCode: 'INVALID_DATASET_NAME',
    });

    expect(prompt?.step).toBe('name');
    expect(prompt?.chips ?? []).not.toContain('My Orders 2');
  });
});

describe('the type question', () => {
  it('offers the three types as clickable options', () => {
    const prompt = nextPrompt({ pending: { name: 'My Orders' } });

    expect(prompt?.card).toMatchObject({ kind: 'choice' });
    const card = prompt?.card as { options: { action: Action }[] };

    expect(card.options.map((option) => option.action)).toEqual([
      { kind: 'set_dataset_type', datasetType: 'event' },
      { kind: 'set_dataset_type', datasetType: 'transaction' },
      { kind: 'set_dataset_type', datasetType: 'master' },
    ]);
  });
});

describe('the sample question', () => {
  const state: AgendaState = {
    pending: { name: 'My Orders', datasetType: 'event' },
  };

  it('carries a file drop', () => {
    expect(nextPrompt(state)?.card).toMatchObject({ kind: 'file_drop' });
  });

  it('offers the connectors as chips when the list is known', () => {
    const prompt = nextPrompt({
      ...state,
      connectorsAvailable: [
        { id: 'postgres-connector-1.0.0', name: 'PostgreSQL' },
        { id: 'kafka-connector-2.0.0', name: 'Kafka' },
      ],
    });

    expect(prompt?.chips).toEqual(['use PostgreSQL', 'use Kafka']);
  });

  it('offers no connector chips when the list could not be read', () => {
    // Offering a connector that cannot be listed produces a dead end.
    expect(nextPrompt(state)?.chips ?? []).toEqual([]);
  });
});

describe('the conflict question', () => {
  const prompt = nextPrompt({
    dataset: draft({ data_schema: conflictedSchema }),
  });

  it('names the field in the question', () => {
    expect(prompt?.text).toContain('amount');
  });

  it("carries the API's candidates and its counts", () => {
    expect(prompt?.card).toMatchObject({
      kind: 'conflict',
      path: 'amount',
      candidates: [
        { dataType: 'double', count: 108 },
        { dataType: 'string', count: 12, isSafest: true, isRecommended: true },
      ],
    });
  });

  it('asks about one field at a time', () => {
    const twoConflicts = schemaWith({
      ...(conflictedSchema.properties as Record<
        string,
        Record<string, unknown>
      >),
      total: {
        type: 'number',
        data_type: 'double',
        oneof: [{ type: 'double' }, { type: 'integer' }],
        suggestions: [
          { resolutionType: 'DATA_TYPE', severity: 'MUST-FIX', message: '' },
        ],
      },
    });

    const card = nextPrompt({ dataset: draft({ data_schema: twoConflicts }) })
      ?.card as { path: string };

    expect(card.path).toBe('amount');
  });
});

describe('the PII question', () => {
  const prompt = nextPrompt({
    dataset: draft(),
    piiSuggested: ['order_id'],
    history: answeredThrough('schema'),
  });

  it('names the field and says why it is asking', () => {
    expect(prompt?.text).toContain('order_id');
  });

  it('offers mask, encrypt and leaving it alone', () => {
    const card = prompt?.card as { options: { action: Action }[] };

    expect(card.options.map((option) => option.action)).toEqual([
      {
        kind: 'set_pii',
        path: 'order_id',
        action: 'mask',
        skipOnFailure: true,
      },
      {
        kind: 'set_pii',
        path: 'order_id',
        action: 'encrypt',
        skipOnFailure: true,
      },
      { kind: 'skip_step', step: 'pii', path: 'order_id' },
    ]);
  });
});

describe('the dedup question', () => {
  it('offers the best candidate with the evidence for it', () => {
    const prompt = nextPrompt({
      dataset: draft(),
      piiSuggested: [],
      sampleRows: rows,
      history: answeredThrough('schema', 'validation', 'transform'),
    });

    const card = prompt?.card as {
      options: { label: string; hint?: string; action: Action }[];
    };

    expect(card.options[0]).toMatchObject({
      hint: 'unique in all 2 sample rows',
      action: { kind: 'set_dedup', enabled: true, key: 'order_id' },
    });
  });

  it('offers keeping duplicates as the last option', () => {
    const prompt = nextPrompt({
      dataset: draft(),
      piiSuggested: [],
      sampleRows: rows,
      history: answeredThrough('schema', 'validation', 'transform'),
    });

    const card = prompt?.card as { options: { action: Action }[] };

    expect(card.options[card.options.length - 1].action).toEqual({
      kind: 'skip_step',
      step: 'dedup',
    });
  });

  it('warns that a key would drop rows rather than hiding it', () => {
    const prompt = nextPrompt({
      dataset: draft(),
      piiSuggested: [],
      sampleRows: rows,
      history: answeredThrough('schema', 'validation', 'transform'),
    });

    const card = prompt?.card as { options: { hint?: string }[] };

    expect(card.options.map((option) => option.hint)).toContain(
      'would drop 1 of 2 sample rows',
    );
  });

  it('says there is nothing to judge by when no sample was kept', () => {
    // Sample rows expire, so a resumed conversation can reach this question
    // with no evidence. Saying so beats offering an unranked list.
    const prompt = nextPrompt({
      dataset: draft(),
      piiSuggested: [],
      history: answeredThrough('schema', 'validation', 'transform'),
    });

    expect(prompt?.text).toMatch(/sample/i);
    expect(prompt?.card).toMatchObject({ kind: 'choice' });
  });
});

describe('the storage question', () => {
  const state: AgendaState = {
    dataset: draft(),
    piiSuggested: [],
    history: [
      ...answeredThrough('schema', 'validation', 'transform'),
      applied({ kind: 'skip_step', step: 'dedup' }, 9),
    ],
  };

  it('offers the stores as options', () => {
    const card = nextPrompt(state)?.card as {
      options: { action: Action }[];
    };

    // Complete answers: each option names the stores it turns off too.
    expect(card.options.map((option) => option.action)).toContainEqual({
      kind: 'set_storage',
      realtime: true,
      lakehouse: false,
      cache: false,
    });
  });
});

describe('the review question', () => {
  const state: AgendaState = {
    dataset: draft({
      dedup_config: { drop_duplicates: true, dedup_key: 'order_id' },
      // The timestamp key is not decoration: without it this state is stuck
      // on the keys question, which is the bug the keys step exists for.
      dataset_config: {
        indexing_config: { olap_store_enabled: true },
        keys_config: { timestamp_key: 'order_ts' },
      },
    }),
    piiSuggested: [],
    history: [
      ...answeredThrough('schema', 'validation', 'transform'),
      applied({ kind: 'set_storage', realtime: true }, 9),
    ],
  };

  it('summarises what will be saved', () => {
    const card = nextPrompt(state)?.card as {
      kind: string;
      summary?: string[];
      confirmAction: Action;
    };

    expect(card.kind).toBe('confirm');
    expect(card.confirmAction).toEqual({ kind: 'save' });
    expect(card.summary).toEqual(
      expect.arrayContaining([
        'Name: My Orders',
        'Type: event',
        'Fields: 2',
        'Duplicates: dropped on order_id',
      ]),
    );
  });

  it('never claims a setting the document does not hold', () => {
    const card = nextPrompt({
      dataset: draft(),
      piiSuggested: [],
      history: [
        ...answeredThrough('schema', 'validation', 'transform'),
        applied({ kind: 'skip_step', step: 'dedup' }, 9),
        applied({ kind: 'skip_step', step: 'storage' }, 10),
      ],
    })?.card as { summary?: string[] };

    expect(card.summary).toContain('Duplicates: kept');
  });
});

describe('ACCEPTS', () => {
  it('scopes free text to the question being asked', () => {
    expect(ACCEPTS.name).toEqual(['set_dataset_name']);
    expect(ACCEPTS.dedup).toContain('set_dedup');
    expect(ACCEPTS.pii).toContain('set_pii');
  });

  it('lets every question be declined except the ones that cannot be', () => {
    // `name` and `review` have nothing to decline. `keys` is the interesting
    // one: the chosen store does not work without its key, so offering to
    // skip it would offer to build a broken dataset.
    Object.entries(ACCEPTS)
      .filter(([step]) => !['name', 'review', 'keys'].includes(step))
      .forEach(([step, kinds]) => {
        expect({ step, kinds }).toMatchObject({
          kinds: expect.arrayContaining(['skip_step']),
        });
      });

    expect(ACCEPTS.keys).not.toContain('skip_step');
  });
});

describe('the schema review question', () => {
  const state: AgendaState = {
    dataset: draft({ data_schema: hintedSchema }),
  };

  it('comes after the conflicts and before PII', () => {
    expect(currentStep(state)).toBe('schema');
  });

  it('does not re-render the schema in chat — the preview already shows it', () => {
    // Two copies of the same table, one of them stale, is worse than one.
    expect(nextPrompt(state)?.card).toMatchObject({ kind: 'choice' });
  });

  it('says how many fields there are', () => {
    expect(nextPrompt(state)?.text).toContain('3');
  });

  it('stays open until it is explicitly closed, so a review can be more than one edit', () => {
    const afterOneEdit: AgendaState = {
      ...state,
      history: [
        applied({ kind: 'toggle_required', path: 'order_id', required: true }),
      ],
    };

    expect(currentStep(afterOneEdit)).toBe('schema');
    expect(nextPrompt(afterOneEdit)?.text).toMatch(/anything else/i);
  });

  it('closes on one click', () => {
    expect(currentStep({ ...state, history: answeredThrough('schema') })).toBe(
      'pii',
    );
  });
});

describe('PII sourced from the schema', () => {
  it('asks about the field the API itself flagged, with no separate API call', () => {
    // The LOW TRANSFORMATION hint *is* the PII detection. It is on the
    // document already, so the question does not wait on `analyze/pii`.
    const prompt = nextPrompt({
      dataset: draft({ data_schema: hintedSchema }),
      history: answeredThrough('schema'),
    });

    expect(prompt?.step).toBe('pii');
    expect(prompt?.text).toContain('customer_email');
  });

  it('quotes the API rather than asserting the field is personal data', () => {
    const prompt = nextPrompt({
      dataset: draft({ data_schema: hintedSchema }),
      history: answeredThrough('schema'),
    });

    expect(prompt?.text).toContain("appears to be 'email' format type");
  });

  it('does not offer to mask the field the API flagged for indexing', () => {
    const prompt = nextPrompt({
      dataset: draft({ data_schema: hintedSchema }),
      history: answeredThrough('schema'),
    });

    expect(prompt?.text).not.toContain('order_ts');
  });

  it('lets an explicit list override the schema, for when analyze/pii is wired', () => {
    const prompt = nextPrompt({
      dataset: draft({ data_schema: hintedSchema }),
      piiSuggested: ['order_id'],
      history: answeredThrough('schema'),
    });

    expect(prompt?.text).toContain('order_id');
  });

  it('moves on when the schema carries no masking hint', () => {
    expect(
      currentStep({
        dataset: draft(),
        history: answeredThrough('schema'),
      }),
    ).toBe('validation');
  });
});

describe('the validation question', () => {
  const state: AgendaState = {
    dataset: draft(),
    history: answeredThrough('schema'),
  };

  it('is asked rather than left to a server default', () => {
    expect(currentStep(state)).toBe('validation');
  });

  it('offers both modes', () => {
    const card = nextPrompt(state)?.card as { options: { action: Action }[] };

    expect(card.options.map((option) => option.action)).toEqual([
      { kind: 'set_additional_fields', allow: false },
      { kind: 'set_additional_fields', allow: true },
    ]);
  });
});

describe('the transformation offer', () => {
  const state: AgendaState = {
    dataset: draft(),
    history: answeredThrough('schema', 'validation'),
  };

  it('is offered once', () => {
    expect(currentStep(state)).toBe('transform');
  });

  it('can be declined in one click', () => {
    const card = nextPrompt(state)?.card as { options: { action: Action }[] };

    expect(card.options.map((option) => option.action)).toContainEqual({
      kind: 'skip_step',
      step: 'transform',
    });
  });

  it('counts an applied transformation as an answer', () => {
    const withOne: AgendaState = {
      ...state,
      history: [
        ...answeredThrough('schema', 'validation'),
        applied(
          {
            kind: 'add_transformation',
            path: 'order_id',
            expression: '$uppercase(order_id)',
            skipOnFailure: true,
          },
          9,
        ),
      ],
    };

    expect(currentStep(withOne)).not.toBe('transform');
  });
});

describe('the denormalisation offer', () => {
  const base = answeredThrough('schema', 'validation', 'transform');

  it('is not raised before the master datasets have been listed', () => {
    // Unknown is not the same as none; asking now would offer an empty list.
    expect(currentStep({ dataset: draft(), history: base })).toBe('dedup');
  });

  it('is skipped entirely when the cluster has no master datasets', () => {
    expect(
      currentStep({ dataset: draft(), history: base, masterDatasets: [] }),
    ).toBe('dedup');
  });

  it('is offered when there is something to join to', () => {
    const state: AgendaState = {
      dataset: draft(),
      history: base,
      masterDatasets: [{ dataset_id: 'customers', name: 'Customers' }],
    };

    expect(currentStep(state)).toBe('denorm');
    expect(nextPrompt(state)?.text).toContain('Customers');
  });

  /**
   * A denormalisation needs three values, and the API takes them together.
   * They are collected over three turns and carried in the transcript as
   * `select_denorm` — the same shape as the connector's choice: an action
   * that records a decision and writes nothing.
   */
  describe('collecting the three values', () => {
    const masters = [
      { dataset_id: 'customers', name: 'Customers' },
      { dataset_id: 'products', name: 'Products' },
    ];

    const offered = (history: Message[]): AgendaState => ({
      dataset: draft(),
      history,
      masterDatasets: masters,
    });

    it('offers one option per master dataset, and a way out', () => {
      const card = nextPrompt(offered(base))?.card;

      expect(card?.kind).toBe('choice');
      if (card?.kind !== 'choice') return;

      expect(card.options.map((option) => option.action)).toEqual([
        { kind: 'select_denorm', masterDatasetId: 'customers' },
        { kind: 'select_denorm', masterDatasetId: 'products' },
        { kind: 'skip_step', step: 'denorm' },
      ]);
    });

    it('asks which field matches, once a master is chosen', () => {
      const state = offered([
        ...base,
        applied({ kind: 'select_denorm', masterDatasetId: 'customers' }, 90),
      ]);
      const prompt = nextPrompt(state);
      const card = prompt?.card;

      expect(currentStep(state)).toBe('denorm');
      expect(prompt?.text).toContain('Customers');
      expect(card?.kind).toBe('choice');
      if (card?.kind !== 'choice') return;

      expect(card.options.map((option) => option.action)).toEqual([
        { kind: 'select_denorm', path: 'order_id' },
        { kind: 'select_denorm', path: 'amount' },
      ]);
    });

    it('asks what to call the joined record last, and takes prose', () => {
      const state = offered([
        ...base,
        applied({ kind: 'select_denorm', masterDatasetId: 'customers' }, 90),
        applied({ kind: 'select_denorm', path: 'order_id' }, 91),
      ]);
      const prompt = nextPrompt(state);

      expect(prompt?.card).toBeUndefined();
      expect(prompt?.freeText?.('customer_details')).toEqual({
        kind: 'set_denorm',
        path: 'order_id',
        masterDatasetId: 'customers',
        outField: 'customer_details',
      });
    });

    it('takes the last choice when one is changed', () => {
      const state = offered([
        ...base,
        applied({ kind: 'select_denorm', masterDatasetId: 'customers' }, 90),
        applied({ kind: 'select_denorm', path: 'order_id' }, 91),
        applied({ kind: 'select_denorm', masterDatasetId: 'products' }, 92),
      ]);

      expect(nextPrompt(state)?.freeText?.('product')).toMatchObject({
        masterDatasetId: 'products',
        path: 'order_id',
      });
    });

    it('does not carry a half-collected choice past the answer', () => {
      // The next denormalisation starts from nothing, rather than inheriting
      // the master the previous one used.
      const state = offered([
        ...base,
        applied({ kind: 'select_denorm', masterDatasetId: 'customers' }, 90),
        applied({ kind: 'select_denorm', path: 'order_id' }, 91),
        applied(
          {
            kind: 'set_denorm',
            path: 'order_id',
            masterDatasetId: 'customers',
            outField: 'customer_details',
          },
          92,
        ),
      ]);

      expect(currentStep(state)).not.toBe('denorm');
    });

    it('ignores a choice the API refused', () => {
      const state = offered([
        ...base,
        rejected({ kind: 'select_denorm', masterDatasetId: 'customers' }, 90),
      ]);
      const card = nextPrompt(state)?.card;

      expect(card?.kind).toBe('choice');
      if (card?.kind !== 'choice') return;
      expect(card.options[0].action).toEqual({
        kind: 'select_denorm',
        masterDatasetId: 'customers',
      });
    });

    it('does not offer a field already joined on', () => {
      const state: AgendaState = {
        dataset: draft({
          denorm_config: {
            denorm_fields: [
              {
                denorm_key: 'order_id',
                dataset_id: 'customers',
                denorm_out_field: 'customer_details',
              },
            ],
          },
        }),
        history: [
          ...base,
          applied({ kind: 'select_denorm', masterDatasetId: 'products' }, 90),
        ],
        masterDatasets: masters,
      };
      const card = nextPrompt(state)?.card;

      if (card?.kind !== 'choice') throw new Error('expected a choice');
      expect(card.options.map((option) => option.action)).toEqual([
        { kind: 'select_denorm', path: 'amount' },
      ]);
    });
  });
});

describe('the keys question', () => {
  const answered = answeredThrough('schema', 'validation', 'transform');

  const withStorage = (
    indexing: Record<string, boolean>,
    keys: Record<string, string> = {},
  ): AgendaState => ({
    dataset: draft({
      data_schema: hintedSchema,
      dedup_config: { drop_duplicates: false },
      dataset_config: { indexing_config: indexing, keys_config: keys },
    }),
    history: [
      ...answered,
      applied({ kind: 'skip_step', step: 'pii', path: 'customer_email' }, 20),
      applied({ kind: 'skip_step', step: 'dedup' }, 21),
      applied({ kind: 'set_storage', realtime: true }, 22),
    ],
  });

  /**
   * The bug this question exists for: the wizard makes `timestamp_key`
   * required whenever the real-time store is on, so a guided flow that went
   * straight from storage to save produced a dataset the wizard would refuse.
   */
  it('demands a timestamp key when the real-time store is on', () => {
    const state = withStorage({ olap_store_enabled: true });

    expect(currentStep(state)).toBe('keys');
    expect(nextPrompt(state)?.text).toMatch(/timestamp/i);
  });

  it('demands a primary and a partition key for the lakehouse', () => {
    const state = withStorage({ lakehouse_enabled: true });

    expect(currentStep(state)).toBe('keys');
  });

  it('demands a primary key for the cache store', () => {
    const state = withStorage({ cache_enabled: true });

    expect(currentStep(state)).toBe('keys');
    expect(nextPrompt(state)?.text).toMatch(/primary/i);
  });

  it('asks for nothing the chosen stores do not require', () => {
    // Real-time needs only a timestamp, so a timestamp is enough.
    const state = withStorage(
      { olap_store_enabled: true },
      { timestamp_key: 'order_ts' },
    );

    expect(currentStep(state)).toBe('review');
  });

  it('recommends the field the API flagged as indexable', () => {
    const state = withStorage({ olap_store_enabled: true });
    const card = nextPrompt(state)?.card as {
      options: { label: string; hint?: string; action: Action }[];
    };

    expect(card.options[0]).toMatchObject({
      action: { kind: 'set_keys', timestamp: 'order_ts' },
    });
    expect(card.options[0].hint).toMatch(/index/i);
  });

  it('always offers the event arrival time, which needs no schema field', () => {
    const state = withStorage({ olap_store_enabled: true });
    const card = nextPrompt(state)?.card as { options: { action: Action }[] };

    expect(card.options.map((option) => option.action)).toContainEqual({
      kind: 'set_keys',
      timestamp: 'Event Arrival Time',
    });
  });

  it('cannot be declined, because the store will not work without it', () => {
    const state = withStorage({ olap_store_enabled: true });
    const card = nextPrompt(state)?.card as { options: { action: Action }[] };

    expect(card.options.map((option) => option.action)).not.toContainEqual({
      kind: 'skip_step',
      step: 'keys',
    });
  });
});

/**
 * Four things the live walkthrough found, all the same shape: the server's
 * *defaults* are indistinguishable from someone's answer, and the summary
 * read the document in a shape it does not have.
 */
describe('what a fresh draft arrives already carrying', () => {
  const answered = answeredThrough('schema', 'validation', 'transform');

  /**
   * `datasets/create` sets `timestamp_key: obsrv_meta.syncts` — the event
   * arrival time — on every draft. Read literally, the timestamp question is
   * already answered and is never asked, so a dataset with a perfectly good
   * `order_ts` gets indexed by arrival time on nobody's decision. Seen live.
   */
  it('asks for the timestamp even though create pre-filled one', () => {
    const state: AgendaState = {
      dataset: draft({
        data_schema: schemaWith({
          order_ts: {
            type: 'string',
            data_type: 'date-time',
            arrival_format: 'text',
          },
        }),
        dataset_config: {
          indexing_config: { olap_store_enabled: true },
          keys_config: { timestamp_key: 'obsrv_meta.syncts' },
        },
      }),
      history: [
        ...answered,
        applied({ kind: 'skip_step', step: 'dedup' }, 40),
        applied({ kind: 'set_storage', realtime: true }, 41),
      ],
    };

    expect(currentStep(state)).toBe('keys');
    expect(nextPrompt(state)?.text).toMatch(/which field is the timestamp/i);
  });

  it('stops asking once the arrival time is actually chosen', () => {
    const state: AgendaState = {
      dataset: draft({
        dataset_config: {
          indexing_config: { olap_store_enabled: true },
          keys_config: { timestamp_key: 'obsrv_meta.syncts' },
        },
      }),
      history: [
        ...answered,
        applied({ kind: 'skip_step', step: 'dedup' }, 40),
        applied({ kind: 'set_storage', realtime: true }, 41),
        applied({ kind: 'set_keys', timestamp: 'Event Arrival Time' }, 42),
      ],
    };

    expect(currentStep(state)).not.toBe('keys');
  });

  /**
   * A fresh draft carries `lakehouse_enabled: true` whether or not the
   * cluster has a lakehouse. Answering "real-time store" with only that flag
   * left the other one as it was, so the answer became a request for a
   * lakehouse the user never mentioned — and the API refused the write.
   * Seen live.
   */
  it('answers the storage question with all three stores, not one', () => {
    const card = nextPrompt({
      dataset: draft(),
      history: [...answered, applied({ kind: 'skip_step', step: 'dedup' }, 40)],
    })?.card;

    if (card?.kind !== 'choice') throw new Error('expected a choice');

    expect(card.options.map((option) => option.action)).toEqual([
      { kind: 'set_storage', realtime: true, lakehouse: false, cache: false },
      { kind: 'set_storage', realtime: false, lakehouse: true, cache: false },
      { kind: 'set_storage', realtime: true, lakehouse: true, cache: false },
    ]);
  });
});

describe('the summary before saving', () => {
  const ready = (over: Partial<DatasetSnapshot> = {}): AgendaState => ({
    dataset: draft({
      dataset_config: {
        indexing_config: { olap_store_enabled: true },
        keys_config: { timestamp_key: 'order_ts' },
      },
      ...over,
    }),
    history: [
      ...answeredThrough('schema', 'validation', 'transform', 'dedup'),
      applied({ kind: 'set_storage', realtime: true }, 50),
      applied({ kind: 'set_keys', timestamp: 'order_ts' }, 51),
    ],
  });

  const summaryOf = (state: AgendaState): string[] => {
    const card = nextPrompt(state)?.card;
    if (card?.kind !== 'confirm') throw new Error('expected a confirmation');
    return card.summary ?? [];
  };

  /**
   * The API nests the category inside `transformation_function`, and the
   * summary read it from the top level — so a masked field was counted as
   * zero and the one decision the user was asked to make about their
   * personal data went unmentioned on the screen that precedes the save.
   * Seen live.
   */
  it('counts the masked fields where the API actually puts the category', () => {
    const state = ready({
      transformations_config: [
        {
          field_key: 'customer_email',
          transformation_function: {
            type: 'mask',
            expr: 'customer_email',
            datatype: 'string',
            category: 'pii',
          },
          mode: 'Strict',
        },
      ],
    });

    expect(summaryOf(state)).toContain('Protected fields: 1');
  });

  it('says what the dataset is joined to', () => {
    const state = ready({
      denorm_config: {
        denorm_fields: [
          {
            denorm_key: 'order_id',
            denorm_out_field: 'customer_details',
            dataset_id: 'customers',
          },
        ],
      },
    });

    expect(summaryOf(state)).toContain('Joined to: customers');
  });

  it('says nothing about joins when there are none', () => {
    expect(summaryOf(ready()).join(' ')).not.toMatch(/joined/i);
  });
});
