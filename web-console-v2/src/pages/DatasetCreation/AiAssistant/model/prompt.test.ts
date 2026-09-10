import { AGENDA_STEPS, WizardStep } from '../engine/actions';
import { Message } from '../session/types';
import {
  EXAMPLES,
  SYSTEM_PROMPT,
  buildPrompt,
  estimatePromptTokens,
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
});
