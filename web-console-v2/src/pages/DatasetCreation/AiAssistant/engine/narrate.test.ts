import { ACTION_KINDS, Action, TEXT_MAX_LENGTH } from './actions';
import { ExecutionOutcome } from './executor';
import { OutOfScope } from './router';
import {
  LEFT_IT_AS_IT_WAS,
  NO_MASTER_DATASETS,
  OUT_OF_SCOPE,
  STOPPED_PART_WAY,
  containModelText,
  describeAction,
  describeProposal,
  narrateExplain,
  narrateOutcome,
  narrateOutOfScope,
  narrateResolution,
} from './narrate';

/**
 * Typed as the applied variant, not the whole union, so a test can add
 * `replayed` to it without the union collapsing.
 */
const applied = (changedRefs: string[] = []) =>
  ({
    ok: true,
    status: 'applied',
    dataset: {},
    changedRefs,
  }) satisfies ExecutionOutcome;

const failed = (code: string, error: string): ExecutionOutcome => ({
  ok: false,
  code,
  error,
});

describe('narrating what was done', () => {
  it('says what changed, naming the field', () => {
    const { text } = narrateOutcome(
      { kind: 'set_data_type', path: 'total_amount', dataType: 'double' },
      applied(['properties.total_amount']),
    );

    expect(text).toContain('total_amount');
    expect(text).toContain('double');
  });

  it('reports a dedup key being set', () => {
    const { text } = narrateOutcome(
      { kind: 'set_dedup', enabled: true, key: 'order_id' },
      applied(),
    );

    expect(text).toMatch(/duplicate/i);
    expect(text).toContain('order_id');
  });

  it('reports dedup being turned off without naming a key', () => {
    const { text } = narrateOutcome(
      { kind: 'set_dedup', enabled: false },
      applied(),
    );

    expect(text).toMatch(/duplicate/i);
    expect(text).not.toMatch(/order_id/);
  });

  it('names the stores it enabled', () => {
    const { text } = narrateOutcome(
      { kind: 'set_storage', realtime: true, lakehouse: false },
      applied(),
    );

    expect(text).toContain('Real-time Store');
  });

  it('mentions the draft being created', () => {
    const { text } = narrateOutcome(
      { kind: 'attach_sample', fileName: 'o.json' },
      {
        ok: true,
        status: 'applied',
        dataset: {},
        changedRefs: [],
        datasetId: 'my-orders',
      },
    );

    expect(text).toContain('my-orders');
  });

  it('says a name was held rather than saved when there is no draft yet', () => {
    const { text } = narrateOutcome(
      { kind: 'set_dataset_name', name: 'My Orders' },
      {
        ok: true,
        status: 'pending',
        pending: { name: 'My Orders' },
      },
    );

    expect(text).toContain('My Orders');
    expect(text).toMatch(/sample|not created|once/i);
  });

  /**
   * A replay means someone else edited the dataset and the action was
   * re-applied against their change. Saying so is the difference between
   * trustworthy and merely quiet.
   */
  it('mentions that a concurrent edit was worked around', () => {
    const { text } = narrateOutcome(
      { kind: 'set_dedup', enabled: false },
      { ...applied(), replayed: true },
    );

    expect(text).toMatch(/changed|re-?appl/i);
  });

  it('says nothing happened for a local-only action', () => {
    const { text } = narrateOutcome(
      { kind: 'goto_step', step: 'storage' },
      {
        ok: true,
        status: 'noop',
      },
    );

    expect(text).toMatch(/storage/i);
  });
});

describe('narrating a failure', () => {
  const outcome = failed(
    'DATASET_UNSUPPORTED_STORAGE_TYPE',
    'The storage type "lake_house" is not available. Please use one of the available storage types: realtime_store',
  );

  it('leads with the explanation, not the server text', () => {
    const { text } = narrateOutcome(
      { kind: 'set_storage', lakehouse: true },
      outcome,
    );

    expect(text).toContain('Data Lakehouse (Hudi)');
    expect(text).not.toContain('lake_house');
  });

  it('carries the failure code, so the transcript records it', () => {
    const { failureCode } = narrateOutcome(
      { kind: 'set_storage', lakehouse: true },
      outcome,
    );

    expect(failureCode).toBe('DATASET_UNSUPPORTED_STORAGE_TYPE');
  });

  it('attaches an error card carrying the diagnosis', () => {
    const { card } = narrateOutcome(
      { kind: 'set_storage', lakehouse: true },
      outcome,
    );

    expect(card?.kind).toBe('api_error');
    if (card?.kind !== 'api_error') return;
    expect(card.diagnosis.code).toBe('DATASET_UNSUPPORTED_STORAGE_TYPE');
    expect(card.diagnosis.recovery).toBe('revise');
  });

  it('offers the retry through the card, not the prose', () => {
    const { card } = narrateOutcome(
      { kind: 'set_storage', lakehouse: true },
      outcome,
    );

    expect(card?.kind).toBe('api_error');
    if (card?.kind !== 'api_error') return;
    expect(card.diagnosis.retryAction).toEqual({
      kind: 'set_storage',
      lakehouse: false,
      realtime: true,
    });
  });

  it('passes a local guard message through as written', () => {
    const { text } = narrateOutcome(
      { kind: 'set_description', path: 'x', description: 'y' },
      failed('UNKNOWN_FIELD', 'Unknown field "custmer_id"'),
    );

    expect(text).toBe('Unknown field "custmer_id"');
  });
});

/**
 * What is said when nothing could be done with the utterance.
 *
 * The old wording named `order_id` as an example — in every dataset,
 * whether or not it had such a field. Reported by the user: "it says order
 * id for any dataset". Nothing here may name a field the dataset does not
 * have, which is the same rule the narration already follows about
 * everything else.
 */
describe('narrating what cannot be done', () => {
  it('says plainly that it is not dataset work', () => {
    const { text } = narrateResolution(
      { status: 'unknown', confidence: 0 },
      { onTopic: false },
    );

    expect(text).toMatch(/only/i);
    expect(text).toMatch(/dataset/i);
    expect(text).not.toMatch(/did not understand/i);
  });

  it('never invents a field name', () => {
    const off = narrateResolution(
      { status: 'unknown', confidence: 0 },
      { onTopic: false },
    );
    const unclear = narrateResolution(
      { status: 'unknown', confidence: 0 },
      { onTopic: true },
    );

    expect(off.text).not.toMatch(/order_id/);
    expect(unclear.text).not.toMatch(/order_id/);
  });

  it('offers an example built from the dataset in hand', () => {
    const { text } = narrateResolution(
      { status: 'unknown', confidence: 0 },
      { onTopic: true, fieldPaths: ['sensor_id', 'reading'] },
    );

    expect(text).toMatch(/sensor_id/);
  });

  it('points at the question on the table instead of guessing', () => {
    const { text } = narrateResolution(
      { status: 'unknown', confidence: 0 },
      { onTopic: true, asked: 'Which field is the timestamp?' },
    );

    expect(text).toContain('Which field is the timestamp?');
  });

  it('still says something useful with no context at all', () => {
    const { text } = narrateResolution({ status: 'unknown', confidence: 0 });

    expect(text).toMatch(/did not understand/i);
  });

  /**
   * Asked for by the user: convert what is typed into actions, and when it
   * cannot, say so. A guess at the subject makes that a conversation rather
   * than a wall — the user only has to correct the guess.
   */
  it('guesses the subject when the words point at one', () => {
    const { text } = narrateResolution(
      { status: 'unknown', confidence: 0 },
      { onTopic: true, said: 'bump the dedup thing on the second one' },
    );

    expect(text).toMatch(/did not understand/i);
    expect(text).toMatch(/deduplication/i);
    expect(text).toMatch(/\?/);
  });

  it('guesses nothing when the words point nowhere', () => {
    const { text } = narrateResolution(
      { status: 'unknown', confidence: 0 },
      { onTopic: true, said: 'bump the thing on the second one' },
    );

    expect(text).toMatch(/did not understand/i);
    expect(text).not.toMatch(/did you mean/i);
  });

  it('does not guess a subject for something off topic', () => {
    // "Save me a poem" is not a request to save the dataset.
    const { text } = narrateResolution(
      { status: 'unknown', confidence: 0 },
      { onTopic: false, said: 'save me a poem about ducks' },
    );

    expect(text).not.toMatch(/did you mean/i);
  });
});

/**
 * Saving does not publish. The user asked that publishing stay where the
 * console already does it — the dataset list, or the wizard's preview — so
 * the closing turn says where to go and what is still unset.
 */
describe('narrating the closing check', () => {
  const check = (dataset: Record<string, unknown>) =>
    narrateOutcome(
      { kind: 'save' },
      { ok: true, status: 'applied', dataset, changedRefs: [] },
    ).text;

  const finished = {
    dataset_id: 'my-orders',
    name: 'My Orders',
    type: 'event',
    data_schema: { type: 'object', properties: { order_ts: {} } },
    dataset_config: {
      indexing_config: { olap_store_enabled: true },
      keys_config: { timestamp_key: 'order_ts' },
    },
  };

  it('says the draft is saved, and where to publish it', () => {
    const text = check(finished);

    expect(text).toMatch(/saved/i);
    expect(text).toMatch(/publish/i);
    expect(text).toMatch(/dataset list|wizard/i);
  });

  it('does not claim it published anything', () => {
    // Saying how to make it live is right; saying it *is* live is not.
    expect(check(finished)).not.toMatch(
      /is (now )?live|made it live|published it|ready to publish/i,
    );
  });

  it('reports what is still unset', () => {
    const text = check({
      ...finished,
      dataset_config: {
        indexing_config: { olap_store_enabled: true },
        keys_config: {},
      },
    });

    expect(text).toMatch(/timestamp/i);
  });
});

describe('narrating a resolution that could not be acted on', () => {
  it('asks the clarifying question', () => {
    const { text } = narrateResolution({
      status: 'ambiguous',
      confidence: 0,
      clarify: {
        question: 'Which field did you mean by "id"?',
        options: ['order_id', 'customer.customer_id'],
      },
    });

    expect(text).toBe('Which field did you mean by "id"?');
  });

  it('offers the candidates as a choice card', () => {
    const { card } = narrateResolution({
      status: 'ambiguous',
      confidence: 0,
      clarify: {
        question: 'Which field did you mean by "id"?',
        options: ['order_id', 'customer.customer_id'],
      },
      candidateActions: [
        { kind: 'set_data_type', path: 'order_id', dataType: 'string' },
        {
          kind: 'set_data_type',
          path: 'customer.customer_id',
          dataType: 'string',
        },
      ],
    });

    expect(card?.kind).toBe('choice');
    if (card?.kind !== 'choice') return;
    expect(card.options.map((option) => option.label)).toEqual([
      'order_id',
      'customer.customer_id',
    ]);
  });

  /**
   * The candidates have to come back as something the user can click, not as
   * prose they must retype — that is the whole point of the rule-only tier.
   * The resolver builds one complete action per candidate, so nothing here has
   * to know which slot of which action holds a field path.
   */
  it('makes each candidate re-runnable with the original instruction', () => {
    const candidateActions: Action[] = [
      { kind: 'set_data_type', path: 'order_id', dataType: 'string' },
      {
        kind: 'set_data_type',
        path: 'customer.customer_id',
        dataType: 'string',
      },
    ];

    const { card } = narrateResolution({
      status: 'ambiguous',
      confidence: 0,
      clarify: {
        question: 'Which field?',
        options: ['order_id', 'customer.customer_id'],
      },
      candidateActions,
    });

    if (card?.kind !== 'choice') throw new Error('expected a choice card');
    expect(card.options.map((option) => option.action)).toEqual(
      candidateActions,
    );
  });

  it('offers plain labels when the resolver could not build candidates', () => {
    const { card } = narrateResolution({
      status: 'ambiguous',
      confidence: 0,
      clarify: { question: 'Which field?', options: ['order_id'] },
    });

    expect(card).toBeUndefined();
  });

  it('says it did not understand when there is nothing to ask about', () => {
    const { text } = narrateResolution({ status: 'unknown', confidence: 0 });

    expect(text).toMatch(/did not understand|not sure/i);
  });

  it('attaches no card when there are no candidates', () => {
    const { card } = narrateResolution({ status: 'unknown', confidence: 0 });

    expect(card).toBeUndefined();
  });

  /**
   * `clarify.question` is the model's own free text with no fixed engine
   * sentence behind it — unlike an out-of-scope capability, there is nothing
   * to substitute it with, so the containment is a length cap, re-checked
   * here the same defensive way `model/router.ts`'s `readRouterReply`
   * re-checks its own `reply` against `REPLY_MAX_LENGTH`.
   */
  it('never passes an over-length clarify question through as-is, and keeps none of it', () => {
    const longQuestion = 'z'.repeat(TEXT_MAX_LENGTH + 40);

    const { text } = narrateResolution({
      status: 'unknown',
      confidence: 0,
      clarify: { question: longQuestion },
    });

    expect(text).not.toBe(longQuestion);
    // Guards against a future refactor that truncates instead of rejecting.
    expect(text).not.toContain('z'.repeat(20));
  });

  it('falls through to the honest "did not understand" wording for an over-length question', () => {
    const { text } = narrateResolution({
      status: 'unknown',
      confidence: 0,
      clarify: { question: 'z'.repeat(TEXT_MAX_LENGTH + 40) },
    });

    expect(text).toMatch(/did not understand|not sure/i);
  });
});

describe('containModelText — the one gate a raw model string passes through', () => {
  it('passes text at or under the limit through unchanged', () => {
    const atLimit = 'x'.repeat(TEXT_MAX_LENGTH);

    expect(containModelText(atLimit)).toBe(atLimit);
  });

  it('rejects text over the limit rather than truncating it', () => {
    const overLimit = 'x'.repeat(TEXT_MAX_LENGTH + 1);

    expect(containModelText(overLimit)).toBeUndefined();
  });

  it('passes undefined through as undefined', () => {
    expect(containModelText(undefined)).toBeUndefined();
  });
});

/**
 * `describeProposal` is the label on a confirmation prompt, so it must never
 * be vague. Seen live: a model `clarify` became a "Do it / Cancel" card
 * labelled "applied that change", asking the user to approve something
 * unnamed.
 */
describe('describeAction for a declined question', () => {
  it('says what was decided, not that a step was skipped', () => {
    expect(
      describeAction({
        kind: 'skip_step',
        step: 'pii',
        path: 'customer.email',
      }),
    ).toBe('left customer.email unmasked');
    expect(describeAction({ kind: 'skip_step', step: 'dedup' })).toBe(
      'kept duplicates',
    );
  });

  it('still produces a sentence for a step it does not know', () => {
    // This text labels a confirmation card, so it must never throw.
    expect(describeAction({ kind: 'skip_step' } as unknown as Action)).toBe(
      'leave that as it is',
    );
  });
});

describe('describeProposal', () => {
  it('names every action kind', () => {
    const vague = ACTION_KINDS.filter((kind) =>
      /applied that change/.test(describeProposal({ kind } as Action)),
    );

    expect(vague).toEqual([]);
  });

  it('reads as something not yet done', () => {
    expect(
      describeProposal({
        kind: 'toggle_required',
        path: 'order_id',
        required: true,
      }),
    ).toMatch(/^make /);
  });

  it('describes a type change in the present tense', () => {
    expect(
      describeProposal({
        kind: 'set_data_type',
        path: 'total_amount',
        dataType: 'double',
      }),
    ).toBe('set total_amount to double');
  });

  it('falls back to naming the kind rather than saying nothing useful', () => {
    expect(describeProposal({ kind: 'undo' })).toMatch(/undo/);
  });
});

/**
 * Storage is narrated from what the server holds, not from what was asked.
 *
 * The console forces the cache store on for a master dataset, so answering
 * "the real-time store" while building one was reported as "Cache disabled"
 * over a payload that had just enabled it. Found in the browser.
 */
describe('reporting storage', () => {
  const action = {
    kind: 'set_storage' as const,
    realtime: true,
    lakehouse: false,
    cache: false,
  };

  const applied = (cacheEnabled: boolean) => ({
    ok: true as const,
    status: 'applied' as const,
    dataset: {
      dataset_config: {
        indexing_config: {
          olap_store_enabled: true,
          lakehouse_enabled: false,
          cache_enabled: cacheEnabled,
        },
      },
    },
    changedRefs: [],
  });

  it('says the cache is on when the server turned it on', () => {
    expect(narrateOutcome(action, applied(true)).text).toMatch(/Cache enabled/);
  });

  it('still says it is off when it is off', () => {
    expect(narrateOutcome(action, applied(false)).text).toMatch(
      /Cache disabled/,
    );
  });
});

/**
 * A rename after the draft exists still keeps the id the draft was created
 * with — the server's own response is what proves that, so the sentence is
 * only ever built from what it returned, never from a name-derived guess.
 */
describe('narrating a rename that keeps its id', () => {
  it('names the id when the server response carries one', () => {
    const { text } = narrateOutcome(
      { kind: 'set_dataset_name', name: 'telemetry' },
      {
        ok: true,
        status: 'applied',
        dataset: { dataset_id: 'orders-2026' },
        changedRefs: ['name'],
      },
    );

    expect(text).toContain('telemetry');
    expect(text).toMatch(/orders-2026/);
    expect(text).toMatch(/id/i);
  });

  it('says nothing about an id the response did not carry', () => {
    const { text } = narrateOutcome(
      { kind: 'set_dataset_name', name: 'telemetry' },
      {
        ok: true,
        status: 'applied',
        dataset: {},
        changedRefs: ['name'],
      },
    );

    expect(text).not.toMatch(/id/i);
  });

  it('never appends the id clause to an unrelated action', () => {
    const { text } = narrateOutcome(
      { kind: 'set_dataset_type', datasetType: 'event' },
      {
        ok: true,
        status: 'applied',
        dataset: { dataset_id: 'orders-2026' },
        changedRefs: ['type'],
      },
    );

    expect(text).not.toMatch(/orders-2026/);
  });
});

describe('declining a capability the assistant does not have', () => {
  const CAPABILITIES: OutOfScope[] = [
    'publish',
    'delete',
    'navigate',
    'metrics',
  ];

  it('gives every capability its own wording', () => {
    const texts = CAPABILITIES.map((capability) => OUT_OF_SCOPE[capability]);

    expect(new Set(texts).size).toBe(CAPABILITIES.length);
  });

  it('never claims a write happened', () => {
    for (const capability of CAPABILITIES) {
      expect(OUT_OF_SCOPE[capability]).not.toMatch(/^(done|saved|applied)/i);
    }
  });

  it('reuses the wording already used to decline publishing from a save', () => {
    expect(OUT_OF_SCOPE.publish).toMatch(/publish it from the dataset list/i);
  });

  it('narrateOutOfScope returns the fixed wording for the capability', () => {
    expect(narrateOutOfScope('delete').text).toBe(OUT_OF_SCOPE.delete);
  });

  it("does not let the model's own reply override the fixed wording", () => {
    const { text } = narrateOutOfScope('navigate', 'sure, taking you there');

    expect(text).toContain(OUT_OF_SCOPE.navigate);
  });
});

describe('NO_MASTER_DATASETS', () => {
  it('is exported, honest, and names a real screen', () => {
    expect(typeof NO_MASTER_DATASETS).toBe('string');
    expect(NO_MASTER_DATASETS).not.toMatch(/^(done|saved|applied)/i);
    expect(NO_MASTER_DATASETS).toMatch(/master/i);
    // The real navigation target — confirmed against `src/router/index.tsx`
    // and `DataDenormalization.tsx`'s own `openCreateMasterDataset`, never
    // a screen invented for this sentence.
    expect(NO_MASTER_DATASETS).toMatch(/New Dataset/);
  });

  it('is distinct from every OUT_OF_SCOPE sentence — this is not one of them', () => {
    expect(Object.values(OUT_OF_SCOPE)).not.toContain(NO_MASTER_DATASETS);
  });
});

describe('STOPPED_PART_WAY', () => {
  it('is exported and non-empty', () => {
    expect(typeof STOPPED_PART_WAY).toBe('string');
    expect(STOPPED_PART_WAY.length).toBeGreaterThan(0);
  });
});

describe('LEFT_IT_AS_IT_WAS', () => {
  it('is exported with its established wording', () => {
    expect(LEFT_IT_AS_IT_WAS).toBe('Left it as it was.');
  });
});

describe("narrating 'explain', which changes nothing", () => {
  it('names the topic without promising to look into it', () => {
    const { text } = narrateExplain({ kind: 'explain', topic: 'dedup' });

    expect(text).toContain('dedup');
    expect(text).not.toMatch(/look at it/i);
    expect(text.length).toBeGreaterThan(0);
  });

  it('still reads as a full sentence with no topic given', () => {
    const { text } = narrateExplain({ kind: 'explain' });

    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/look at it/i);
  });
});
