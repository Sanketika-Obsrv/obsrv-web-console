/**
 * The measurement behind the guided flow: does asking make answering easier?
 *
 * Every fixture is run against the *real* question the agenda would ask at
 * that step — built by putting the agenda into the state where the step is
 * current — rather than against a prompt written for the test. So a question
 * whose options change in a way that stops accepting a plausible reply fails
 * here, which is the only way this stays a measurement rather than a mirror.
 *
 * Two numbers come out. How much of what a person would type is understood,
 * and how that compares with reading the same words with no idea what was
 * asked, which is what the resolver did before the agenda existed.
 */
import { Action, AgendaStepId } from './actions';
import { AgendaState, Prompt, nextPrompt } from './agenda';
import { ANSWERS, AnswerFixture } from './answers.fixtures';
import { DatasetSnapshot } from './executor';
import { Message } from '../session/types';
import { answerTo } from './answer';
import { buildFieldVocabulary } from './fieldVocabulary';
import { resolveUtterance } from './ruleResolver';

const field = (dataType: string, over: Record<string, unknown> = {}) => ({
  type: dataType === 'double' ? 'number' : 'string',
  data_type: dataType,
  arrival_format: dataType === 'double' ? 'number' : 'text',
  ...over,
});

const PROPERTIES: Record<string, Record<string, unknown>> = {
  order_id: field('string'),
  amount: field('double'),
  order_ts: field('date-time'),
  customer_email: field('string'),
  coupon_code: field('string'),
};

const schema = (over: Record<string, Record<string, unknown>> = {}) => ({
  type: 'object',
  properties: { ...PROPERTIES, ...over },
});

/** The same fields the questions are built from, for the unscoped resolver. */
const vocabulary = buildFieldVocabulary(
  Object.entries(PROPERTIES).map(([column, spec]) => ({
    ...spec,
    column,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any,
);

const CONFLICTED = schema({
  amount: field('double', {
    oneof: [{ type: 'double' }, { type: 'string' }],
    suggestions: [
      {
        resolutionType: 'DATA_TYPE',
        severity: 'MUST-FIX',
        message: 'double: 108 time(s), string: 12 time(s)',
      },
    ],
  }),
});

const draft = (over: Partial<DatasetSnapshot> = {}): DatasetSnapshot => ({
  dataset_id: 'my_orders',
  name: 'My Orders',
  type: 'event',
  status: 'Draft',
  version_key: 'vk-1',
  data_schema: schema(),
  ...over,
});

const answered = (...steps: string[]): Message[] =>
  steps.map((step, index) => ({
    id: `msg-${index}`,
    role: 'assistant' as const,
    text: 'done',
    createdAt: 1_000 + index,
    action: { kind: 'skip_step', step } as Action,
  }));

const REALTIME = {
  dataset_config: {
    indexing_config: { olap_store_enabled: true, lakehouse_enabled: false },
  },
};

/** The state in which each step is the one being asked about. */
const STATE: Record<AgendaStepId, AgendaState> = {
  name: {},
  type: { pending: { name: 'My Orders' } },
  connector: {
    pending: { name: 'My Orders', datasetType: 'event' },
    connector: { id: 'postgres', name: 'Postgres', configured: false },
  },
  sample: { pending: { name: 'My Orders', datasetType: 'event' } },
  conflicts: { dataset: draft({ data_schema: CONFLICTED }) },
  schema: { dataset: draft() },
  pii: {
    dataset: draft(),
    piiSuggested: ['customer_email'],
    history: answered('schema'),
  },
  validation: {
    dataset: draft(),
    piiSuggested: [],
    history: answered('schema'),
  },
  transform: {
    dataset: draft(),
    piiSuggested: [],
    history: answered('schema', 'validation'),
  },
  denorm: {
    dataset: draft(),
    piiSuggested: [],
    history: answered('schema', 'validation', 'transform'),
    masterDatasets: [{ dataset_id: 'customers', name: 'Customers' }],
  },
  dedup: {
    dataset: draft(),
    piiSuggested: [],
    history: answered('schema', 'validation', 'transform'),
  },
  storage: {
    dataset: draft(),
    piiSuggested: [],
    history: answered('schema', 'validation', 'transform', 'dedup'),
  },
  keys: {
    dataset: draft(REALTIME),
    piiSuggested: [],
    history: answered('schema', 'validation', 'transform', 'dedup', 'storage'),
  },
  review: {
    dataset: draft({
      dataset_config: {
        indexing_config: { olap_store_enabled: true },
        keys_config: { timestamp_key: 'order_ts' },
      },
    }),
    piiSuggested: [],
    history: answered('schema', 'validation', 'transform', 'dedup', 'storage'),
  },
};

const promptFor = (step: AgendaStepId): Prompt => {
  const prompt = nextPrompt(STATE[step]);

  if (!prompt || prompt.step !== step) {
    throw new Error(
      `The eval cannot reach the ${step} question — it asked ${prompt?.step ?? 'nothing'}`,
    );
  }

  return prompt;
};

/**
 * What the assistant would do with the reply, rules only.
 *
 * The same order `runTurn` uses: the question first, then the resolver.
 * Confirmation is not modelled — this measures which action is produced, not
 * whether the user is asked to click first.
 */
const scoped = (fixture: AnswerFixture): Action | undefined =>
  answerTo(promptFor(fixture.step), fixture.utterance) ??
  resolveUtterance(fixture.utterance, { vocabulary }).action;

/** What the same words meant before anything was being asked. */
const unscoped = (fixture: AnswerFixture): Action | undefined =>
  resolveUtterance(fixture.utterance, { vocabulary }).action;

/** Actions that change the dataset, as opposed to talking about it. */
const WRITES_NOTHING = ['explain', 'clarify', 'undo', 'goto_step'];

const hit = (fixture: AnswerFixture, got: Action | undefined): boolean =>
  JSON.stringify(got ?? null) === JSON.stringify(fixture.expected);

const shouldAnswer = ANSWERS.filter((fixture) => fixture.expected);
const guards = ANSWERS.filter((fixture) => !fixture.expected);

describe('the reply fixture set', () => {
  it('covers at least 40 replies', () => {
    expect(ANSWERS.length).toBeGreaterThanOrEqual(40);
  });

  it('covers every question that can be answered by typing', () => {
    const covered = new Set(ANSWERS.map((fixture) => fixture.step));
    const typeable: AgendaStepId[] = [
      'name',
      'type',
      'conflicts',
      'schema',
      'pii',
      'validation',
      'transform',
      'denorm',
      'dedup',
      'storage',
      'keys',
      'review',
    ];

    expect(typeable.filter((step) => !covered.has(step))).toEqual([]);
  });
});

describe('reading a reply against the question', () => {
  it('understands the replies it should', () => {
    const missed = shouldAnswer
      .filter((fixture) => !hit(fixture, scoped(fixture)))
      .map((fixture) => ({
        step: fixture.step,
        utterance: fixture.utterance,
        expected: fixture.expected,
        got: scoped(fixture) ?? null,
      }));

    const rate = (shouldAnswer.length - missed.length) / shouldAnswer.length;

    expect({ rate, missed }).toMatchObject({ missed: [] });
    expect(rate).toBeGreaterThanOrEqual(0.9);
  });

  /**
   * No tolerance here, unlike the hit rate. A reply misread as an answer is
   * written to the dataset, and the user asked for none of it.
   */
  it('writes nothing in reply to what is not an answer', () => {
    const wrongly = guards
      .map((fixture) => ({ fixture, got: scoped(fixture) }))
      .filter(({ got }) => got && !WRITES_NOTHING.includes(got.kind as string))
      .map(({ fixture, got }) => ({ utterance: fixture.utterance, got }));

    expect(wrongly).toEqual([]);
  });
});

/**
 * The claim T25 was built on, measured rather than asserted.
 *
 * The comparison is deliberately generous to the old behaviour: the resolver
 * is given the same field vocabulary and judged on the same fixtures. It
 * still cannot answer a bare "no", a bare field name or a bare option label,
 * because without the question those words name nothing.
 *
 * Measured on this set: 36 of 36 with the question, 9 of 36 without. The
 * assertion is relative rather than pinned to those numbers, so adding a
 * fixture does not need a number changed in two places — but a change that
 * narrowed the gap would still have to explain itself here.
 */
describe('against reading the same words with no question in mind', () => {
  it('understands more', () => {
    const withQuestion = shouldAnswer.filter((fixture) =>
      hit(fixture, scoped(fixture)),
    ).length;
    const without = shouldAnswer.filter((fixture) =>
      hit(fixture, unscoped(fixture)),
    ).length;

    expect({ withQuestion, without }).toMatchObject({
      withQuestion: shouldAnswer.length,
    });
    expect(withQuestion).toBeGreaterThan(without);
  });
});
