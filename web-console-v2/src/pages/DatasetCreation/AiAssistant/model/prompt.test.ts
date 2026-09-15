import { Action, AGENDA_STEPS, WizardStep } from '../engine/actions';
import { DatasetFacts } from '../engine/datasetFacts';
import { Message } from '../session/types';
import {
  EXAMPLES,
  SYSTEM_PROMPT,
  buildPrompt,
  estimatePromptTokens,
  turnDigest,
} from './prompt';
import {
  buildQuestionSchema,
  buildStepSchema,
  estimateTokens,
} from './stepSchema';

const CONTEXT = 4096;

const turn = (role: Message['role'], text: string): Message => ({
  id: `${role}-${text}`,
  role,
  text,
  createdAt: 0,
});

/**
 * A worst-case history, facts block and option list, used to prove the
 * budget still holds once every addition in this file is present together —
 * a digested history costs a few more tokens per turn than plain text did.
 */
const RICH_HISTORY: Message[] = Array.from({ length: 20 }, (_u, i) =>
  i % 2 === 0
    ? turn('user', `a fairly wordy instruction number ${i} about the dataset`)
    : {
        ...turn('assistant', `Done with instruction number ${i}.`),
        action: {
          kind: 'set_dataset_name',
          name: `a fairly long dataset name number ${i}`,
        } as Action,
      },
);

const RICH_FACTS: DatasetFacts = {
  datasetId: 'a-fairly-long-dataset-id-number-2026',
  name: 'A Reasonably Long Dataset Name',
  datasetType: 'transaction',
  stores: { realtime: true, lakehouse: true, cache: true },
  keys: {
    timestamp: 'order_timestamp_field',
    primary: 'order_identifier_field',
    partition: 'partition_region_field',
  },
  dedup: { enabled: true, key: 'order_identifier_field' },
  fieldCount: 42,
  hasDraft: true,
};

const RICH_OPTION_LABELS = [
  'Event',
  'Master',
  'Transaction',
  'Leave it as it is',
];

describe('what the prompt tells the model', () => {
  it('names the step and what it is for', () => {
    const prompt = buildPrompt({ step: 'storage', utterance: 'use druid' });

    expect(prompt).toMatch(/Step: storage/);
    expect(prompt).toMatch(/keys/i);
  });

  it('passes the instruction through verbatim', () => {
    expect(
      buildPrompt({ step: 'schema', utterance: 'make order_id required' }),
    ).toContain('make order_id required');
  });

  it('hints at the field names without listing them all', () => {
    const many = Array.from({ length: 60 }, (_u, i) => `field_${i}`);
    const prompt = buildPrompt({
      step: 'schema',
      utterance: 'x',
      fieldPaths: many,
    });

    expect(prompt).toContain('field_0');
    expect(prompt).not.toContain('field_59');
    expect(prompt).toMatch(/48 more/);
  });

  it('says nothing about fields when there are none yet', () => {
    expect(
      buildPrompt({ step: 'ingestion', utterance: 'call it Orders' }),
    ).not.toMatch(/Some fields/);
  });

  it('includes the recent turns, oldest first', () => {
    const prompt = buildPrompt({
      step: 'schema',
      utterance: 'and the second one',
      history: [turn('user', 'first thing'), turn('assistant', 'Done.')],
    });

    expect(prompt.indexOf('first thing')).toBeLessThan(prompt.indexOf('Done.'));
  });

  it('keeps only the last few turns, so history cannot crowd out the schema', () => {
    const long = Array.from({ length: 40 }, (_u, i) =>
      turn('user', `turn number ${i}`),
    );

    const prompt = buildPrompt({
      step: 'schema',
      utterance: 'x',
      history: long,
    });

    expect(prompt).toContain('turn number 39');
    expect(prompt).not.toContain('turn number 0');
  });
});

/**
 * The dataset's current values, rendered as one mechanical line.
 *
 * Without this, "again", "instead" and "why is the id still the old one"
 * have nothing real to be read against — the prompt used to carry only the
 * question and the sentence typed at it.
 */
describe('what the dataset currently holds', () => {
  const facts: DatasetFacts = {
    datasetId: 'orders-2026',
    name: 'telemetry',
    datasetType: 'event',
    stores: { realtime: true, lakehouse: false, cache: false },
    keys: { timestamp: 'order_ts' },
    dedup: { enabled: false },
    fieldCount: 5,
    hasDraft: true,
  };

  it('renders one mechanical line of the current values', () => {
    const prompt = buildPrompt({ step: 'ingestion', utterance: 'x', facts });

    expect(prompt).toContain(
      'Now: name telemetry (id orders-2026, fixed); type event; ' +
        'real-time store on; timestamp order_ts; dedup off.',
    );
  });

  it('omits the line entirely when there are no facts', () => {
    expect(buildPrompt({ step: 'ingestion', utterance: 'x' })).not.toMatch(
      /^Now:/m,
    );
  });

  it('omits the line when the facts carry nothing', () => {
    const empty: DatasetFacts = {
      stores: { realtime: false, lakehouse: false, cache: false },
      keys: {},
      fieldCount: 0,
      hasDraft: false,
    };

    expect(
      buildPrompt({ step: 'ingestion', utterance: 'x', facts: empty }),
    ).not.toMatch(/^Now:/m);
  });

  it('omits the id clause when the id is not yet fixed', () => {
    const noId: DatasetFacts = { ...facts, datasetId: undefined };
    const prompt = buildPrompt({
      step: 'ingestion',
      utterance: 'x',
      facts: noId,
    });

    expect(prompt).toContain('name telemetry;');
    expect(prompt).not.toContain('(id');
  });

  it('omits clauses for facts that are not set', () => {
    const sparse: DatasetFacts = {
      stores: { realtime: false, lakehouse: false, cache: false },
      keys: {},
      fieldCount: 0,
      hasDraft: false,
      name: 'telemetry',
    };
    const prompt = buildPrompt({
      step: 'ingestion',
      utterance: 'x',
      facts: sparse,
    });

    expect(prompt).toContain('Now: name telemetry.');
    expect(prompt).not.toContain('type');
    expect(prompt).not.toContain('store');
    expect(prompt).not.toContain('dedup');
  });
});

/**
 * The option labels a choice card printed, so "the second one" and "the
 * master one" can be read against words the assistant itself showed.
 */
describe('what the question offered', () => {
  it('lists the option labels next to the question', () => {
    const prompt = buildPrompt({
      step: 'ingestion',
      question: 'type',
      questionText: 'What kind of data is it?',
      utterance: 'the second one',
      optionLabels: ['Event', 'Master', 'Transaction', 'Leave it as it is'],
    });

    expect(prompt).toContain(
      'Offered: Event, Master, Transaction, Leave it as it is.',
    );
  });

  it('says nothing about options when none were printed', () => {
    const prompt = buildPrompt({
      step: 'ingestion',
      question: 'type',
      questionText: 'What kind of data is it?',
      utterance: 'the second one',
    });

    expect(prompt).not.toMatch(/Offered:/);
  });
});

/**
 * A turn as the model needs it: what was said, and what it did — not just
 * `role: text`, which reads as a wall of prose with nothing marking what
 * actually happened.
 */
describe('turnDigest', () => {
  const base = { id: '1', createdAt: 0 } as const;

  it('appends the action a turn dispatched', () => {
    const message: Message = {
      ...base,
      role: 'assistant',
      text: 'Done.',
      action: { kind: 'set_dataset_name', name: 'telemetry' },
    };

    expect(turnDigest(message)).toBe(
      'assistant: Done. [set_dataset_name telemetry]',
    );
  });

  it('names the step a decline concerned', () => {
    const message: Message = {
      ...base,
      role: 'assistant',
      text: 'Kept duplicates.',
      action: { kind: 'skip_step', step: 'dedup' },
    };

    expect(turnDigest(message)).toBe(
      'assistant: Kept duplicates. [skip_step dedup]',
    );
  });

  it('names the step, not the field, when a decline carries both', () => {
    const message: Message = {
      ...base,
      role: 'assistant',
      text: 'Left it unmasked.',
      action: { kind: 'skip_step', step: 'pii', path: 'customer_email' },
    };

    // The step is what was left alone; the field is only a detail of that
    // decline, so it must not outrank the step as the digest's identifier.
    expect(turnDigest(message)).toBe(
      'assistant: Left it unmasked. [skip_step pii]',
    );
  });

  it('appends the failure instead of the action that was refused', () => {
    const message: Message = {
      ...base,
      role: 'assistant',
      text: 'That name is taken.',
      action: { kind: 'set_dataset_name', name: 'telemetry' },
      failureCode: 'DATASET_ID_TAKEN',
    };

    expect(turnDigest(message)).toBe(
      'assistant: That name is taken. [failed DATASET_ID_TAKEN]',
    );
  });

  it('reads as plain role and text when there is neither', () => {
    const message: Message = {
      ...base,
      role: 'user',
      text: 'good morning',
    };

    expect(turnDigest(message)).toBe('user: good morning');
  });
});

/**
 * The instruction that matters most for a 0.6B model: asking is allowed.
 * Without it the model's only alternative to a guess is silence, and a wrong
 * guess is written to the user's dataset.
 */
describe('the system prompt', () => {
  it('asks for one JSON action and nothing else', () => {
    expect(SYSTEM_PROMPT).toMatch(/single JSON object/i);
  });

  it('forbids inventing anything', () => {
    expect(SYSTEM_PROMPT).toMatch(/never invent/i);
  });

  it('tells the model that asking is a valid answer', () => {
    expect(SYSTEM_PROMPT).toMatch(/clarify/i);
  });

  it('is short, because every token is one the schema cannot have', () => {
    expect(estimatePromptTokens(SYSTEM_PROMPT)).toBeLessThan(120);
  });
});

/** The whole request has to fit, not just its parts. */
describe('the total request fits the context window', () => {
  const wide = Array.from({ length: 200 }, (_u, i) => `field_${i}`);
  const history = Array.from({ length: 20 }, (_u, i) =>
    turn('user', `a fairly wordy instruction number ${i} about the dataset`),
  );

  const steps: WizardStep[] = [
    'connector',
    'ingestion',
    'schema',
    'processing',
    'storage',
    'preview',
  ];

  it('leaves room for the answer at every step, worst case', () => {
    const tight = steps
      .map((step) => {
        const total =
          estimateTokens(buildStepSchema(step)) +
          estimatePromptTokens(SYSTEM_PROMPT) +
          estimatePromptTokens(
            buildPrompt({
              step,
              utterance: 'set the timestamp column to order_ts please',
              fieldPaths: wide,
              history,
            }),
          );

        return { step, total, headroom: CONTEXT - total };
      })
      // Room for the model's own reply, generously.
      .filter((entry) => entry.headroom < 1500);

    expect(tight).toEqual([]);
  });

  it('still leaves room once facts, option labels and a digested history are added', () => {
    const tight = steps
      .map((step) => {
        const total =
          estimateTokens(buildStepSchema(step)) +
          estimatePromptTokens(SYSTEM_PROMPT) +
          estimatePromptTokens(
            buildPrompt({
              step,
              utterance: 'set the timestamp column to order_ts please',
              fieldPaths: wide,
              history: RICH_HISTORY,
              facts: RICH_FACTS,
              optionLabels: RICH_OPTION_LABELS,
            }),
          );

        return { step, total, headroom: CONTEXT - total };
      })
      .filter((entry) => entry.headroom < 1500);

    expect(tight).toEqual([]);
  });
});

/**
 * The prompt when there is a question on the table.
 *
 * The model's job shrinks from "what does this person want" to "what does
 * this answer mean", which is the whole reason the agenda exists — so the
 * question has to actually reach the model.
 */
describe('answering a question', () => {
  const asked = (over: Partial<Parameters<typeof buildPrompt>[0]> = {}) =>
    buildPrompt({
      step: 'processing',
      question: 'dedup',
      questionText:
        'Shall I drop duplicate records? order_id is my best guess.',
      utterance: 'yes, on order_id',
      ...over,
    });

  it('quotes the question the user is answering', () => {
    expect(asked()).toContain('Shall I drop duplicate records?');
  });

  it('says the reply is an answer, not an instruction', () => {
    expect(asked().toLowerCase()).toContain('answer');
  });

  it('shows how a reply to this question turns into an action', () => {
    const prompt = asked();

    expect(prompt).toContain('set_dedup');
  });

  it('shows examples for the question asked and no other', () => {
    const prompt = asked({ question: 'storage', questionText: 'Where?' });

    expect(prompt).toContain('set_storage');
    expect(prompt).not.toContain('set_dedup');
  });

  it('has an example for every question', () => {
    for (const question of AGENDA_STEPS) {
      expect(EXAMPLES[question].length).toBeGreaterThan(0);
    }
  });

  it('stays affordable, worst case', () => {
    const wide = Array.from({ length: 200 }, (_u, i) => `field_${i}`);
    const history = Array.from({ length: 20 }, (_u, i) =>
      turn('user', `a fairly wordy instruction number ${i} about the dataset`),
    );

    const tight = AGENDA_STEPS.map((question) => {
      const total =
        estimateTokens(buildQuestionSchema(question)) +
        estimatePromptTokens(SYSTEM_PROMPT) +
        estimatePromptTokens(
          buildPrompt({
            step: 'processing',
            question,
            questionText:
              'Which field in your data matches a record in Customers?',
            utterance: 'order_id',
            fieldPaths: wide,
            history,
          }),
        );

      return { question, headroom: CONTEXT - total };
    }).filter((entry) => entry.headroom < 1500);

    expect(tight).toEqual([]);
  });

  it('still stays affordable once facts, option labels and a digested history are added', () => {
    const wide = Array.from({ length: 200 }, (_u, i) => `field_${i}`);

    const tight = AGENDA_STEPS.map((question) => {
      const total =
        estimateTokens(buildQuestionSchema(question)) +
        estimatePromptTokens(SYSTEM_PROMPT) +
        estimatePromptTokens(
          buildPrompt({
            step: 'processing',
            question,
            questionText:
              'Which field in your data matches a record in Customers?',
            utterance: 'order_id',
            fieldPaths: wide,
            history: RICH_HISTORY,
            facts: RICH_FACTS,
            optionLabels: RICH_OPTION_LABELS,
          }),
        );

      return { question, headroom: CONTEXT - total };
    }).filter((entry) => entry.headroom < 1500);

    expect(tight).toEqual([]);
  });
});
