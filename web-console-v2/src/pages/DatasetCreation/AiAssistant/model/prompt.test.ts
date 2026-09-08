import { WizardStep } from '../engine/actions';
import { Message } from '../session/types';
import { SYSTEM_PROMPT, buildPrompt, estimatePromptTokens } from './prompt';
import { buildStepSchema, estimateTokens } from './stepSchema';

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
